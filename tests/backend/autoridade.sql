-- Executar após a E2; nenhuma fixture é persistida.
begin;
do $$declare r record;p text;begin
 for r in select * from pg_roles where rolname in ('ma_escritor','ma_gestor_acessos','ma_consultor') loop
  if r.rolcanlogin or r.rolsuper or r.rolcreaterole or r.rolcreatedb or r.rolbypassrls or r.rolinherit then raise exception 'Papel interno excessivo: %',r.rolname;end if;
  if pg_has_role('anon',r.oid,'MEMBER') or pg_has_role('authenticated',r.oid,'MEMBER') or pg_has_role('service_role',r.oid,'MEMBER') or exists(select 1 from pg_auth_members where member='postgres'::regrole and roleid=r.oid and (set_option or inherit_option)) then raise exception 'Papel interno pode ser assumido: %',r.rolname;end if;
 end loop;
 for r in select c.oid,c.oid::regclass as nome,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and (n.nspname in ('private','wa','territorio') or (n.nspname='public' and c.relname like 'ma_%')) loop
  if not r.relrowsecurity then raise exception 'RLS ausente: %',r.nome;end if;
  foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
   if has_table_privilege('anon',r.oid,p) or has_table_privilege('authenticated',r.oid,p) or has_table_privilege('service_role',r.oid,p) then raise exception 'Escrita direta indevida: %, %',r.nome,p;end if;
  end loop;
 end loop;
 for r in select p.oid,p.prosecdef,p.proconfig,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','wa','territorio') or (n.nspname='public' and p.proname like 'ma_%') loop
  if has_function_privilege('anon',r.oid,'EXECUTE') then raise exception 'Função anônima: %',r.oid::regprocedure;end if;
  if r.prosecdef and not coalesce(r.proconfig @> array['search_path=""'],false) then raise exception 'Definer sem search_path vazio: %',r.oid::regprocedure;end if;
 end loop;
 if has_table_privilege('ma_consultor','public.ma_cadastros','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,MAINTAIN') or has_schema_privilege('ma_consultor','auth','USAGE') then raise exception 'Consultor excede leitura autorizada';end if;
 if has_schema_privilege('ma_gestor_acessos','auth','USAGE') or has_table_privilege('ma_gestor_acessos','auth.users','SELECT') then raise exception 'Executor acessa Auth diretamente';end if;
 if has_table_privilege('ma_gestor_acessos','private.ma_admins','INSERT') or has_table_privilege('ma_gestor_acessos','public.ma_cadastros','DELETE') then raise exception 'Executor excede seu domínio';end if;
 if has_function_privilege('authenticated','private.ma_definir_vinculo_legado(text,text,text,text)','EXECUTE') or has_function_privilege('service_role','private.ma_acesso_entrega(uuid,text,text)','EXECUTE') then raise exception 'Caminho legado reaberto';end if;
end$$;
-- Privilégios futuros: canários não são publicados nem persistidos.
create function public.e2_canario() returns integer language sql set search_path='' as $$select 1$$;
create function private.e2_canario() returns integer language sql set search_path='' as $$select 1$$;
create table public.e2_canario(id bigint generated always as identity primary key);
do $$declare r text;begin
 foreach r in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(r,'public.e2_canario()','EXECUTE') or has_function_privilege(r,'private.e2_canario()','EXECUTE') then raise exception 'Função futura exposta: %',r;end if;
  if has_table_privilege(r,'public.e2_canario','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') or has_sequence_privilege(r,'public.e2_canario_id_seq','USAGE,SELECT,UPDATE') then raise exception 'Tabela ou sequência futura exposta: %',r;end if;
 end loop;
end$$;
rollback;
