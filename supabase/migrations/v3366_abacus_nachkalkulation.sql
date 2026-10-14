-- v3.366 Nachkalkulation: Import von Abacus-Stundenrapporten (nur lesend, additiv).
-- Neue Tabellen: abacus_importe (Protokoll), abacus_stunden (bestaetigte Zeilen), abacus_abgleich (Pruefvermerke).
-- Keine bestehende Tabelle/Policy/Funktion wird geaendert. Zugriff: Feature "nachkalkulation" (feature_access) UND eigene Firma.
-- tenant_boundary_* und feature_boundary_* sind RESTRICTIVE (wie bei angebote).

create table public.abacus_importe(
  id bigint generated always as identity primary key,
  company_id uuid not null default public.my_company_id() references public.companies(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  dateiname text not null,
  dateityp text not null check (dateityp in ('pdf','xlsx','csv')),
  datei_sha text,
  importiert_von uuid default auth.uid() references public.profiles(id) on delete set null,
  importiert_am timestamptz not null default now(),
  anz_neu int not null default 0,
  anz_uebersprungen int not null default 0,
  anz_fehler int not null default 0,
  ergebnis text
);
create table public.abacus_stunden(
  id bigint generated always as identity primary key,
  company_id uuid not null default public.my_company_id() references public.companies(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  import_id bigint not null references public.abacus_importe(id) on delete cascade,
  fingerprint text not null,
  rapport_ref text,
  auftrag_nr text,
  datum date,
  mitarbeiter text,
  taetigkeit text,
  stunden numeric(8,2) not null check (stunden > -1000 and stunden < 1000),
  zeit_roh text,
  kostenstelle text,
  created_at timestamptz not null default now(),
  constraint abacus_stunden_fp_uk unique (company_id, project_id, fingerprint)
);
create table public.abacus_abgleich(
  id bigint generated always as identity primary key,
  company_id uuid not null default public.my_company_id() references public.companies(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  geprueft_von uuid default auth.uid() references public.profiles(id) on delete set null,
  geprueft_am timestamptz not null default now(),
  abacus_stunden numeric(10,2) not null,
  app_stunden numeric(10,2) not null,
  differenz numeric(10,2) not null,
  stand text not null,
  kommentar text
);
create index abacus_stunden_projekt_idx on public.abacus_stunden(project_id);
create index abacus_importe_projekt_idx on public.abacus_importe(project_id);
create index abacus_abgleich_projekt_idx on public.abacus_abgleich(project_id);

-- Projekt und Import muessen zur eigenen Firma gehoeren (nie aus der Datei/dem Client uebernommen).
create function public.enforce_abacus_projekt_firma() returns trigger language plpgsql set search_path to 'public' as $$
declare v_firma uuid; v_imp_p bigint;
begin
  new.company_id := public.my_company_id();
  if new.company_id is null then raise exception 'Keine aktive Firma.'; end if;
  select company_id into v_firma from public.projects where id = new.project_id;
  if v_firma is null or v_firma <> new.company_id then raise exception 'Projekt gehoert nicht zur eigenen Firma.'; end if;
  if tg_table_name = 'abacus_stunden' then
    select project_id into v_imp_p from public.abacus_importe where id = new.import_id;
    if v_imp_p is null or v_imp_p <> new.project_id then raise exception 'Import gehoert nicht zu diesem Projekt.'; end if;
  end if;
  return new;
end $$;
create trigger enforce_abacus_importe_firma before insert on public.abacus_importe for each row execute function public.enforce_abacus_projekt_firma();
create trigger enforce_abacus_stunden_firma before insert on public.abacus_stunden for each row execute function public.enforce_abacus_projekt_firma();
create trigger enforce_abacus_abgleich_firma before insert on public.abacus_abgleich for each row execute function public.enforce_abacus_projekt_firma();

alter table public.abacus_importe enable row level security;
alter table public.abacus_stunden enable row level security;
alter table public.abacus_abgleich enable row level security;

do $$
declare t text;
begin
  foreach t in array array['abacus_importe','abacus_stunden','abacus_abgleich'] loop
    execute format('create policy tenant_boundary_%1$s on public.%1$s as restrictive for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id())', t);
    execute format('create policy feature_boundary_%1$s on public.%1$s as restrictive for all using (exists (select 1 from public.feature_access fa where fa.profile_id = (select auth.uid()) and fa.feature = ''nachkalkulation'' and fa.granted)) with check (exists (select 1 from public.feature_access fa where fa.profile_id = (select auth.uid()) and fa.feature = ''nachkalkulation'' and fa.granted))', t);
    execute format('create policy %1$s_select_feature on public.%1$s for select using (exists (select 1 from public.feature_access fa where fa.profile_id = (select auth.uid()) and fa.feature = ''nachkalkulation'' and fa.granted))', t);
    execute format('create policy %1$s_insert_feature on public.%1$s for insert with check (exists (select 1 from public.feature_access fa where fa.profile_id = (select auth.uid()) and fa.feature = ''nachkalkulation'' and fa.granted))', t);
  end loop;
end $$;
-- Loeschen nur ganze Importe (Zeilen folgen per CASCADE); Zeilen und Pruefvermerke sind unveraenderlich (kein UPDATE).
create policy abacus_importe_delete_feature on public.abacus_importe for delete
  using (exists (select 1 from public.feature_access fa where fa.profile_id = (select auth.uid()) and fa.feature = 'nachkalkulation' and fa.granted));
