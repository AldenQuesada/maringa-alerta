select set_config('e2.versao', :'versao', false);
do $$declare n integer;begin
 if current_user<>'postgres' or (select rolsuper from pg_roles where rolname=current_user) then raise exception 'Executor de migração incorreto';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and not c.relrowsecurity and (n.nspname in ('private','wa','territorio') or (n.nspname='public' and c.relname like 'ma_%'))) then raise exception 'Tabela própria sem RLS';end if;
 select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where (ns.nspname in ('private','wa','territorio') or (ns.nspname='public' and p.proname like 'ma_%')) and has_function_privilege('anon',p.oid,'execute') and p.oid<>'private.ma_salvar_catalogo_territorial(text,jsonb,bigint)'::regprocedure;
 if n<>0 then raise exception 'Função inesperada liberada ao anônimo';end if;
 -- Única dívida histórica reproduzida: obrigatoriamente encerrada pela E2.
 if current_setting('e2.versao')>='20261109021506' and has_function_privilege('anon','private.ma_salvar_catalogo_territorial(text,jsonb,bigint)','execute') then raise exception 'A11 permaneceu após E2';end if;
end$$;
