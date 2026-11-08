-- Ambiente de autenticação descartável, sem dados de produção.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password 'teste-local-api';
grant anon,authenticated,service_role to authenticator;
create role supabase_auth_admin login noinherit password 'teste-local-auth';
create schema if not exists auth authorization supabase_auth_admin;
alter role supabase_auth_admin set search_path=auth,public;
create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid$$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;

alter function auth.uid() owner to supabase_auth_admin;
