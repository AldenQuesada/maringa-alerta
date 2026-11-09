-- Prova transacional da causa A11, executada como postgres sem superuser.
begin;
do $$begin if (select rolsuper from pg_roles where rolname=current_user) then raise exception 'Prova exige executor sem superuser';end if;end$$;
create function private.e2_prova_acl() returns boolean language sql set search_path='' as $$select true$$;
grant ma_escritor to current_user;
grant create on schema private to ma_escritor;
alter function private.e2_prova_acl() owner to ma_escritor;
revoke create on schema private from ma_escritor;
revoke ma_escritor from current_user;
-- Reproduz a ordem antiga: PostgreSQL avisa, mas ON_ERROR_STOP não interrompe.
revoke all on function private.e2_prova_acl() from public,anon;
do $$begin if not has_function_privilege('anon','private.e2_prova_acl()','execute') then raise exception 'Divergência histórica não reproduzida';end if;end$$;
rollback;
