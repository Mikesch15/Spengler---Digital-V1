# system-admin-storage-cron – Historie
## Fassung 2 (12.10.2026, App v3.316, Plattform-Version 4)
Geheimnis aus Code und Cron-Befehl in den Supabase Vault verlegt (`storage_cron_secret`, in der DB erzeugt). Funktion prüft über `public.system_cron_secret_ok(text)` (service_role), fail closed. Cron-Job (jobid 1) liest den Wert beim Lauf aus `vault.decrypted_secrets`.
Rotation: `select vault.update_secret(id, 'neuer Wert')` (id aus `vault.secrets where name='storage_cron_secret'`) – sonst nichts anzupassen.
Rest: `cron.job_run_details` enthält in alten Läufen das alte, jetzt ungültige Geheimnis.
## Fassung 1 (v3.99)
Geteiltes Geheimnis im Funktionscode (`x-cron-secret`).
