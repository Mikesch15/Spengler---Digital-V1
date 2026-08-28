-- Spengler Digital: konfigurierbare Mitarbeiter-Berechtigungen
-- Idempotent: kann auch auf einer bereits eingerichteten Datenbank ausgeführt werden.

alter table public.permission_settings drop constraint if exists permission_settings_resource_check;
alter table public.permission_settings add constraint permission_settings_resource_check
check (resource = any (array[
  'projects','reports','measurements','ausmass','materials','rates',
  'blitzschutz_materials','rinne_fitting_types','einlaufblech_settings',
  'feedback','profiles','company_settings'
]));

insert into public.permission_settings (role, resource, can_view, can_edit)
select 'employee', v.resource, v.can_view, v.can_edit
from (values
 ('projects',true,true),('reports',true,true),('measurements',true,true),('ausmass',true,true),
 ('materials',true,false),('rates',true,false),('blitzschutz_materials',true,false),
 ('rinne_fitting_types',true,false),('einlaufblech_settings',true,false),
 ('feedback',true,true),('profiles',true,false),('company_settings',false,false)
) v(resource,can_view,can_edit)
where not exists (
  select 1 from public.permission_settings ps
  where ps.role='employee' and ps.resource=v.resource
);

create or replace function public.get_my_permissions()
returns jsonb
language sql stable security definer set search_path=public
as $$
  select coalesce(jsonb_object_agg(resource, jsonb_build_object('view', can_view, 'edit', can_edit)), '{}'::jsonb)
  from public.permission_settings ps
  join public.profiles p on p.role=ps.role
  where p.id=auth.uid();
$$;
revoke all on function public.get_my_permissions() from public;
grant execute on function public.get_my_permissions() to authenticated;
