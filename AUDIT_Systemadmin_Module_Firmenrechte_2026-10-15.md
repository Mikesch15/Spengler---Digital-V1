# Audit: Systemadmin / Module / Firmenrechte (Stand v3.376, 15.10.2026)

Grundlage: Auftrag „Komplettauftrag Systemadmin Module Firmenrechte“ inkl. Zusatz „Systemadmin von Peter Künzi AG trennen“. Nur gelesen/gemessen, ausser dem unter 1. genannten Fix.

## 1. Sofort behoben (Migration `v3376_companies_update_sperren`)
Firmenadmins konnten über die Policy „company admins can update their company“ + Spaltenrechte `subscription_status`, `trial_ends_at`, `trial_days`, `is_active` der eigenen Firma direkt ändern (Testphase verlängern, auf „active“ setzen). Der Browser ändert `companies` nie direkt; Status/Testphase laufen über `system_admin_set_status`/`system_admin_set_trial` (SECURITY DEFINER, prüfen `is_system_admin()`). Direktes UPDATE für `anon`/`authenticated` ist entzogen (geprüft: 0 UPDATE-Rechte). Rückgängig: `GRANT UPDATE ON public.companies TO authenticated;`

## 2. Was schon vorhanden ist
- Tabelle `system_admins(user_id)`, `is_system_admin()` (SECURITY DEFINER, `auth.uid()`-basiert, nicht aus Metadaten). RLS: nur eigene Zeile lesbar.
- `companies` mit `subscription_status` (trial/active/expired/suspended/cancelled), `trial_started_at`, `trial_ends_at`, `trial_days`, `is_active`; `my_company_id()` liefert NULL für gesperrte/abgelaufene Firmen → RLS sperrt deren Daten.
- Systemadmin-Oberfläche `js/22-system-admin.js` (Firmenliste, Status, Testphase, Firma löschen, Registrieren, Storage), Edge Functions `system-admin-*`, `register-company`; `company_invites` nur für Systemadmin.
- Tenant-Grenzen `tenant_boundary_*` RESTRICTIVE; Rechte je Rolle/Person (`permission_settings`, `permission_overrides`, `has_permission()`); Freischaltung einzelner Funktionen je Person (`feature_access`, z. B. Offerte, Nachkalkulation); globale Schalter in `system_settings` (`module_test`, `meas_kategorien`); `audit_log` (Firmenebene).

## 3. Befunde / Lücken
1. **Der einzige Systemadmin ist zugleich Admin der PETER KÜNZI AG** (`system_admins.user_id` hat ein `profiles`-Profil mit `company_id` = PETER KÜNZI AG, Rolle admin). Das ist genau das, was der Zusatz verbietet. Die Systemadmin-Oberfläche steht in `Mehr` der normalen Firmen-App (Knopf `navSystemAdmin`).
2. **Kein Firmen-Modulregister:** Es gibt keine Tabelle „Modul X für Firma Y freigeschaltet“. `feature_access` gilt je Person und wird vom Firmenadmin selbst geschrieben (`feature_access_admin_write`); `system_settings.module_test` ist global (alle Firmen). Pakete/Abos: nichts vorhanden.
3. **Kein Aktivitätsprotokoll auf Plattformebene:** `audit_log` ist an `company_id` gebunden (tenant_boundary); Systemadmin-Aktionen (Status, Testphase, Löschen) werden dort nicht firmenübergreifend nachvollziehbar abgelegt.
4. `profiles_update_permission`: Wer das Recht `profiles/edit` hat, darf das eigene Profil ändern (inkl. `role`). Standardmässig hat die Rolle „employee“ dieses Recht vermutlich nicht — nicht geprüft/geändert, sollte beim Rechte-Umbau abgesichert werden (Spalte `role` nur für Admins).
5. `audit_log_select` und `system_settings_select` sind `USING (true)` (letzteres ist für alle lesbar, enthält nur Schalter; Audit-Log bleibt durch die RESTRICTIVE Firmengrenze geschützt).

## 4. Vorschlag zur Trennung (braucht Ihre Mitwirkung, deshalb noch nicht umgesetzt)
Ein zweites, **reines Betreiber-Konto** (neue E-Mail, ohne `profiles`-Zeile, ohne Firma): `my_company_id()` ist dann NULL → es sieht **keine** Projekte/Daten einer Firma (erfüllt „erbt keine Firmenrechte“). `system_admins` zeigt auf dieses Konto; das heutige Konto verliert den Eintrag und bleibt normaler Admin der PETER KÜNZI AG. Dazu nötig:
- Sie legen das Betreiber-Konto an (Supabase Dashboard → Authentication → Add user; Passwort nur dort) und nennen mir die E-Mail NICHT im Chat, sondern tragen sie nach meiner Anleitung selbst in `system_admins` ein (oder nennen die User-ID).
- App: eigener Einstieg (Route/Parameter z. B. `?admin`), Login-Ablauf und Start müssen ein Konto **ohne Profil** zulassen und direkt in die Systemadmin-Oberfläche führen; `navSystemAdmin` aus dem Firmenmenü entfernen.
- Rückfall bleibt: Eintrag des alten Kontos erst entfernen, wenn das neue Konto nachweislich funktioniert.

## 5. Empfohlene Reihenfolge
A. (erledigt) Fix companies-UPDATE.  B. Firmen-Modulregister (`company_modules`, nur Systemadmin schreibt, Firmen lesen eigene) + Prüfung in Oberfläche und per RLS/Funktion.  C. Aktivitätsprotokoll (`platform_audit_log`, nur Systemadmin).  D. Trennung des Betreiber-Kontos (nach Ihrer Kontoanlage).  E. Pakete später.
