# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.221`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.218: es gibt nur noch EINE Ansicht

Ansage des Anwenders: „Klassische alte ansicht kann komplett weg." Entfallen sind
der klassische Startbildschirm in `index.html` (Willkommen, Firmenzeile,
Aufgabenkarte, die Karte „Was möchtest du tun?", `#topUserBar`), der Umschalter
(`a2Setzen`, `#a2Ein`, der gemerkte Wert `sd_ansicht2`), der Weg zurück unter
„Mehr", die Geräte-Einstellung „Aufgaben zugeklappt/geöffnet" und die CSS-Regeln,
die die eine Ansicht zugunsten der anderen ausblendeten.

**Was bewusst geblieben ist – und warum:**

- `#appAnker` in `index.html`: neun Knöpfe (`startOpenProjects`, `navWerkstatt`,
  `navLagerverwaltung`, `openGlobalSearch`, `settings`, `openFeedback`,
  `navAdminMeas`, `navSystemAdmin`, `logout`) plus `#startLogo` und
  `#appVersion`, alle `hidden`. Das ist **keine Ansicht**: es sind die Stellen,
  an denen die Fachmodule seit jeher ihren Handler anmelden (`$("settings")
  .onclick` in js/07 usw.), und zwei Datenträger. Vier davon führen ausserdem
  die Sichtbarkeit (`werkAktiv()`, `lagerverwaltungZugriff`, `isAdmin`,
  `isSystemAdmin` setzen ihr `hidden`; `a2KnopfSichtbar()` in js/70 liest genau
  das). Sie zu entfernen hiesse, neun Module umzubauen, ohne dass sich für den
  Anwender etwas ändert.
- Die Klasse `a2-an` am `<html>`-Element: an ihr hängen rund dreihundert
  CSS-Regeln. Sie wird beim Start einmal gesetzt. Mehrere Prüfstände nehmen sie
  kurz ab, um zu belegen, dass eine gemessene Form wirklich von dort kommt.
- `a2Aktiv()` gibt `true` zurück und bleibt: die Funktion wird an vielen Stellen
  gefragt, und dort soll kein zweiter Weg entstehen.
- `renderAufgaben()` zeichnet nichts mehr, bleibt aber als Zeichen „die Aufgaben
  haben sich geändert" (acht Aufrufe in js/45, einer in js/07; js/70 hängt sich
  daran).

### Zwei Datenbank-Regeln, die seit v3.206 gelten (und geprüft gehören)

Beide kamen aus dem App-Audit und sind in der Datenbank umgesetzt. Die
Prüfstände können sie NICHT nachweisen – sie laufen ohne Datenbank. Nachsehen
lässt sich das über den Supabase-Advisor oder mit den SQL-Abfragen darunter.

**1. `auth.uid()` immer als `( SELECT auth.uid() )`.**
Nackt geschrieben ruft PostgreSQL es für jede geprüfte Zeile neu auf; in
Klammern einmal je Anweisung. Bedeutungsgleich, weil `auth.uid()` als STABLE
deklariert ist. Nachsehen:

```sql
select tablename, policyname from pg_policies
where schemaname='public'
  and ( (qual       ~* 'auth\.(uid|jwt|role)\(\)' and qual       !~* '\(\s*select\s+auth\.')
     or (with_check ~* 'auth\.(uid|jwt|role)\(\)' and with_check !~* '\(\s*select\s+auth\.') );
-- muss LEER sein
```

**2. Jede `tenant_boundary_*` und `feature_boundary_*` muss RESTRICTIVE sein.**
PERMISSIVE heisst ODER (eine zusätzliche Erlaubnis), RESTRICTIVE heisst UND
(eine echte Schranke). Eine Schranke, die PERMISSIVE steht, ist keine – sie
öffnet. Genau das war bei `tenant_boundary_abwicklungen` der Fall (als
einziger von 35), siehe `Abschlussbericht_v3.206_Datenbank.txt`. Nachsehen:

```sql
select tablename, policyname from pg_policies
where schemaname='public'
  and (policyname ilike '%boundary%' or policyname ilike '%tenant%')
  and permissive='PERMISSIVE';
-- muss LEER sein
```

**3. Wer ohne eigene Prüfung arbeitet, darf nicht über die API erreichbar sein.**
Seit v3.217, ausgelöst vom Supabase-Advisor: 32 `SECURITY DEFINER`-Funktionen
sind für Angemeldete aufrufbar – darunter `system_admin_delete_company_data`.
Nachgesehen: **alle** prüfen intern selbst (`is_system_admin()`, `is_admin()`,
`auth.uid()` …), es war kein Loch offen. Die Abfrage hält diesen Zustand fest.
Dazu die zweite Hälfte: Trigger-Funktionen (Rückgabetyp `trigger`) gehören
überhaupt nicht in die API – sie werden nur von ihrem Trigger gerufen. Bei
zehn von ihnen stand das EXECUTE-Recht trotzdem bei `authenticated`/`anon`
bzw. `PUBLIC`; es wurde entzogen (`service_role` behält es). Dass Trigger
danach weiterhin feuern, ist nachgewiesen: eine Buchung mit fremder Firma
wurde von `enforce_lager_bewegung_firma` abgewiesen wie zuvor (PostgreSQL
prüft `EXECUTE` beim ANLEGEN des Triggers, nicht beim Auslösen). Nachsehen:

```sql
select 'REGEL 3a' as regel, p.oid::regprocedure::text as funktion
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and p.prokind='f'
  and p.prorettype <> 'pg_catalog.trigger'::regtype
  and not (p.prosrc ~* 'is_system_admin|is_admin|has_permission|my_company_id|mw_firma_ok|auth\.uid')
  and has_function_privilege('authenticated', p.oid, 'EXECUTE')
union all
select 'REGEL 3b', p.oid::regprocedure::text
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prorettype='pg_catalog.trigger'::regtype
  and (has_function_privilege('authenticated', p.oid, 'EXECUTE')
       or has_function_privilege('anon', p.oid, 'EXECUTE'));
-- muss LEER sein
```

**Kein Fehler, sondern Absicht:** `password_reset_tokens` hat RLS an und
**keine** Policy. Das ist richtig so – nur die Edge Function (service_role)
schreibt und liest dort; über die API kommt niemand an die Tabelle. Der
Supabase-Advisor meldet das als INFO („RLS Enabled No Policy"). Wer das
„repariert", indem er eine Policy hinzufügt, macht die Tabelle erreichbar.

**Offen, bewusst nicht erledigt:** „Leaked Password Protection" in Supabase
(Authentication → Providers → Email) ist aus. Das ist eine Dashboard-
Einstellung, kein Code – sie lässt sich von hier aus nicht umlegen, und sie
setzt den Pro-Plan voraus, den der Betrieb nicht hat (Stand 28.09.2026).

## ARCHITEKTUR

Spengler-DIGITAL ist eine modulare Web-App.

### Frontend
- `index.html` – Einstiegspunkt
- `js/` – modulare JavaScript-Fachlogik
- `css/` – Styles
- `sw.js` – Service Worker / Offline / App-Cache
- `manifest.json` – PWA

### Backend
- Supabase
- PostgreSQL
- Auth
- Storage
- Row Level Security (RLS)
- Edge Functions

`sw.js` enthält aktuell die JavaScript-App-Shell der Module `01` bis `78`.

## ZENTRALER WORKFLOW

```text
PROJEKT
→ OFFERTE
→ MASSAUFNAHME
→ BERECHNUNG
→ MATERIAL & ZUSCHNITT
→ ZUSCHNITT
→ STÜCK ABHAKEN
→ WERKSTATT / RÜSTLISTE
→ RÜSTEN / MONTIEREN
→ AUSMASS