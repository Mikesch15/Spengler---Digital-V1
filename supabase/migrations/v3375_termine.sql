-- v3.375 Terminplanung: neue Tabelle "termine" (additiv). Keine bestehende Tabelle/Policy/Funktion wird geaendert.
-- Zugriff wie bei Projekten: lesen mit Recht projects/view, schreiben mit projects/edit, immer nur die eigene Firma.
-- tenant_boundary_termine ist RESTRICTIVE (wie bei allen Firmentabellen).
create table public.termine(
  id bigint generated always as identity primary key,
  company_id uuid not null default public.my_company_id() references public.companies(id) on delete cascade,
  project_id bigint references public.projects(id) on delete set null,
  titel text not null check (char_length(btrim(titel)) between 1 and 200),
  start_datum date not null,
  ende_datum date not null,
  start_zeit time,
  ende_zeit time,
  ort text check (ort is null or char_length(ort) <= 300),
  notiz text check (notiz is null or char_length(notiz) <= 4000),
  mitarbeiter uuid[] not null default '{}',
  ics_uid text check (ics_uid is null or char_length(ics_uid) <= 500),
  quelle text not null default 'app' check (quelle in ('app','ics')),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint termine_ende_nach_start check (ende_datum >= start_datum),
  constraint termine_zeit_ok check (ende_zeit is null or (start_zeit is not null and (ende_datum > start_datum or ende_zeit >= start_zeit)))
);
create index termine_company_start_idx on public.termine(company_id, start_datum);
create index termine_project_idx on public.termine(project_id);
-- gleiche Kalenderdatei zweimal importieren legt keine Doppelten an
create unique index termine_ics_uid_uk on public.termine(company_id, ics_uid) where ics_uid is not null;

-- Firma immer vom Server; ein verknuepftes Projekt muss zur eigenen Firma gehoeren.
create function public.enforce_termine_firma() returns trigger language plpgsql set search_path to 'public' as $$
declare v_firma uuid;
begin
  new.company_id := public.my_company_id();
  if new.company_id is null then raise exception 'Keine aktive Firma.'; end if;
  if new.project_id is not null then
    select company_id into v_firma from public.projects where id = new.project_id;
    if v_firma is null or v_firma <> new.company_id then raise exception 'Projekt gehoert nicht zur eigenen Firma.'; end if;
  end if;
  return new;
end $$;
create trigger enforce_termine_firma before insert or update on public.termine for each row execute function public.enforce_termine_firma();

alter table public.termine enable row level security;
create policy tenant_boundary_termine on public.termine as restrictive for all
  using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());
create policy termine_select_permission on public.termine for select using (public.has_permission('projects','view'));
create policy termine_insert_permission on public.termine for insert with check (public.has_permission('projects','edit'));
create policy termine_update_permission on public.termine for update using (public.has_permission('projects','edit')) with check (public.has_permission('projects','edit'));
create policy termine_delete_permission on public.termine for delete using (public.has_permission('projects','edit'));
