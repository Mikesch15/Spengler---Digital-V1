# Spengler-DIGITAL – PROJECT STATE

## AKTUELLER STAND

- Branch: `main`
- Aktueller Entwicklungsstand: `v3.270`
- Der aktuelle Code auf `main` ist die verbindliche Grundlage.
- Alte Abschlussberichte, Prototypen und frühere Versionen sind nicht automatisch aktuell.

### v3.270 — Dachfenster: gepunktet oder gefalzt, Abwicklungen neu

Ansage (8.10.2026, am Blatt „Nord Nr.1"): zwei Ausführungen — **gepunktet**
(Seitenteile seitwärts angepunktet) und **gefalzt** (senkrechter Falz) — mit
den Sollmassen des Anwenders; jederzeit auch an gespeicherten Aufnahmen
umschaltbar. Neues Feld `ausfuehrung`, Umschalter unter der Bauart, im
Ausdruck in den Angaben genannt (nur wenn gespeichert).

**Sechs Zuschnitte, beide Bauarten:** Vorderteil, Hinterteil, je Seite
Seitenteil + Seitenteil hinten. Breite × Länge (Nord Nr.1):

| | gepunktet | gefalzt |
|---|---|---|
| Vorderteil | 280 × 774 | 280 × 564 |
| Hinterteil | 467 × 774 | 467 × 595 |
| Seitenteil | 190 × 990 | 190 × 1225 |
| Seitenteil hinten | 224 × 175 | 224 × 505 |

Formeln (aus den Antworten des Anwenders; Herleitung im Kommentar bei
`dfaZuschnitte`): Vorderteil-Breite = Umschlag vorne + Saum + C + **B**
(Anreiff selbst zählt nicht, er steckt in C); gepunktet sind Vorder- und
Hinterteil gleich lang (Breite vorne + 2 × Umschlag Seite + J + K), gefalzt
Vorderteil = Breite vorne + **B**, Hinterteil = Breite hinten + **25**
(Standard-Falzzugabe, `DFA_FALZZUGABE`); Seitenteil = Länge (gefalzt:
+ C + B), Breite mit **F** (nicht dem grösseren Mass); Seitenteil hinten
Breite = Umschlag Seite + (J + K + (Breite vorne − hinten)/2) + Q + O + P.
„Die 10" in 564/1225 ist **B** (Umschlag am Anreiff) — nicht Umschlag
vorne/Seite, obwohl alle drei im Beispiel 10 sind.

**ANNAHME, noch zu bestätigen:** die „15" beim Seitenteil hinten (175 = 160 +
15, 505 = 160 + 295 + 35 + 15) ist von O, T und dem Anreiff nicht zu
unterscheiden. Gerechnet wird gepunktet mit **O**, gefalzt mit **T**.
Bei anderen Werten als 15/15/15 ist das relevant.

Bestehende Aufnahmen: der gespeicherte Datensatz behält seine Zahlen, bis
er geöffnet und neu gespeichert wird; ohne Feld gilt „gepunktet".
Prüfstand `dachfenster-ausfuehrung-v3-270` (72 Prüfungen: die zwölf Sollwerte
in beiden Bauarten, jedes Mass einzeln verändert, Speichern → Öffnen →
Umschalten, echter Klick, Ausdruck; vier Mutationsproben rot). Die vier
Erwartungen in `dachfenster-schnitt-v3-260` (acht Zuschnitte, 995 + 10) sind
auf den neuen Vertrag umgestellt, die alten Werte stehen als Gegenprobe.

### v3.269 — zwei Fehler am Blatt der Dachfenstereinfassung

Beim Auswerten der Vorlage „Nord Nr.1" (8.10.2026) fielen zwei Fehler auf, die
mit den Abwicklungen nichts zu tun haben:

1. **„Aufbordungshöhe vorne / hinten 0 mm"** in den Angaben, obwohl F = 80 und
   Q = 95 in der Zeichnung stehen. `js/16` las `aufVorne`/`aufHinten` mit
   `paar()` als `{l,r}`-Objekt; seit sie eine einzelne Zahl sind, ist `w.l`
   leer. Gerechnet wurde richtig. **Warum der Prüfstand es nicht sah:** die
   Prüfung „jedes Mass steht auf dem Blatt" sucht den Wert *irgendwo* — und
   „100" steht auch in der Zeichnung. Neu liest eine Prüfung die **Zelle mit
   ihrer Beschriftung**, mit Gegenprobe für alte `{l,r}`-Datensätze (dort gilt
   das grössere Mass, wie beim Laden).
2. **Fussnote „aufgerundet"** unter den Bleilappen, obwohl seit v3.262/263
   abgerundet wird — PDF (Dachfenster, Kamin), App-Anzeige, Hilfe.

Ohne die Korrektur schlagen vier der neuen Prüfungen fehl (gemessen).

## DAUERHAFT GÜLTIGE REGELN

Alles hier gilt weiter – es ist keine Historie und gehört deshalb nicht ins
Changelog.

### VERBINDLICH: welche Materialliste wofür da ist

Ansage des Anwenders (30.09.2026): „unsere regiematerialliste soll nur für den
regierapport und die regieofferte dienen und die lieferantenmaterialliste für
den rest".

Es gibt **drei** Listen, nicht zwei. Sie dürfen nicht vermischt werden:

| Liste | Tabelle | Zeilen | Wofür – und NUR dafür |
|---|---|---|---|
| **Werkstoff** | `measurement_materials` | 16 | Massaufnahme → Berechnung → Zuschnitt → Reservierung. Coil und Blech (Titanzink 0.7 …), samt Dehnungsabständen |
| **Regiematerial** | `materials` | 380 | **nur** Regierapport und Regieofferte. Eure EDV-Nummern, eure Preise |
| **Lieferantensortiment** | `lieferanten_artikel` | 439 | Handelsware: Bestand, Barcode, Mindestbestand, Einkaufsliste |

Nachgemessen an den Fremdschlüsseln (nicht angenommen):
`material_reservierungen.material_id` → `measurement_materials`,
`lagerbestand.material_id` → `measurement_materials`,
`lager_varianten.material_id` → `materials`.

**Massaufnahme, Berechnung, Zuschnitt und Ausmass fassen `materials` nicht an** –
sie waren nie dort. Die Liste `measurements.rapport_material` (js/57) trägt zwar
EDV-Nummern, ist aber ausdrücklich *Material für den Regierapport* und damit
regelkonform.

**Offen und NICHT entschieden:** `lager_varianten` (381 Produkte) sitzt auf
`materials` und ist praktisch 1:1 dessen Spiegel. Nach der Regel oben wäre das
Handelsware und gehörte ins Lieferanten-Lager. Das widerspricht aber der früheren
Ansage „die alte lagerverwaltung und die regiematerialliste nicht anfassen".
**Ohne ausdrückliches neues Ja des Anwenders wird daran nichts geändert.**

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

---

## ÄLTERE VERSIONEN

Die Versionsgeschichte von **v3.218 bis v3.255** steht in
`CHANGELOG_HISTORIE.md`. Sie stand bis v3.259 hier und machte rund 80 % der
Datei aus.

**Warum sie weg ist:** `PROJECT_STATE.md` ist laut `CLAUDE.md` die
verbindliche Zustandsquelle und wird deshalb bei fast jeder Aufgabe gelesen.
Gemessen am 5.10.2026 war sie auf **68 000 Zeichen** gewachsen (~17 000
Token) und wuchs mit **~2 000 Zeichen je Version** weiter – in zwölf
Versionen um 52 %. Wer den aktuellen Stand wissen will, zahlt sonst jedes Mal
für die Geschichte mit.

Hier stehen ab jetzt: der aktuelle Stand, die **letzten drei Versionen** und
die dauerhaft gültigen Regeln. Alles Ältere wandert beim nächsten
Versionswechsel nach `CHANGELOG_HISTORIE.md` – dieselbe Aufteilung, die
`CLAUDE.md` für sich selbst vorschreibt.

**Die Architektur und der zentrale Arbeitsablauf standen hier ebenfalls** –
als zweite Fassung dessen, was in `CLAUDE.md` Abschnitt 2 und 4 steht. Die
Kopie war bereits falsch („App-Shell der Module 01 bis 78“, während es js/83
gibt). Sie ist gelöscht; eine zweite Wahrheit über die Architektur ist
schlimmer als keine.
