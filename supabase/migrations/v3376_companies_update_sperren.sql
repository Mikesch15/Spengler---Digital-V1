-- Sicherheitsfix (Audit zum Auftrag "Systemadmin/Module/Firmenrechte"), bereits angewendet als Migration "companies_update_nur_systemadmin".
-- Befund: Die Policy "company admins can update their company" liess Firmenadministratoren UPDATE auf ihre eigene Firma zu, und
-- "authenticated" hatte UPDATE-Rechte auf subscription_status, trial_ends_at, trial_days, is_active -> ein Firmenadmin konnte seine
-- Testphase selbst verlaengern oder die Firma auf "active" setzen. Der Browser aendert companies nie direkt.
-- Fix: direktes UPDATE fuer anon/authenticated entziehen. Unberuehrt: system_admin_set_status / system_admin_set_trial
-- (SECURITY DEFINER, pruefen is_system_admin()) und Edge Functions (service_role).
-- Rueckgaengig: GRANT UPDATE ON public.companies TO authenticated;
REVOKE UPDATE ON public.companies FROM authenticated;
REVOKE UPDATE ON public.companies FROM anon;
