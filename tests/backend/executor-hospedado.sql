-- Somente bootstrap de banco descartável; executado pelo superuser da plataforma.
do $$begin
 if current_database() not like 'teste_%' or session_user<>'supabase_admin' then
  raise exception 'Bootstrap exclusivo do ambiente descartável';end if;
end$$;
alter role postgres nosuperuser createrole createdb bypassrls inherit;
grant pg_read_all_data to postgres;
grant anon,authenticated,service_role to postgres with admin option;
grant ma_escritor to postgres with admin true, inherit false, set false;
alter role service_role bypassrls;
alter schema auth owner to supabase_admin;
grant usage on schema auth to postgres;
alter table auth.users owner to supabase_admin;
grant select on auth.users to postgres with grant option;
grant insert,update,delete,truncate,references,trigger,maintain on auth.users to postgres;
revoke usage on schema auth from ma_escritor;
-- Estado de origem observado em 09/11/2026 UTC, antes da E2.
grant execute on function private.ma_salvar_catalogo_territorial(text,jsonb,bigint) to public;
alter default privileges for role postgres in schema public grant truncate,references,trigger,maintain on tables to anon,authenticated,service_role;
