-- Instalação combinada, somente banco descartável.
begin;
do $$begin
 if to_regprocedure('private.ma_aplicar_lote(jsonb)') is not null then raise exception 'Caminho paralelo de escrita permanece instalado';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity) then raise exception 'Tabela sem RLS';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef) then raise exception 'SECURITY DEFINER público';end if;
 if exists(select 1 from pg_roles where rolname='ma_escritor' and (rolsuper or rolbypassrls or rolcanlogin)) then raise exception 'Papel interno privilegiado';end if;
 if has_function_privilege('authenticated','private.ma_gravar_lote(jsonb)','execute') or has_function_privilege('authenticated','private.ma_gravar_cadastro(jsonb)','execute') or has_function_privilege('authenticated','private.ma_gravar_prefeitura(jsonb)','execute') then raise exception 'Executor interno acessível';end if;
 if has_table_privilege('authenticated','public.ma_cadastros','insert') or has_table_privilege('authenticated','public.ma_prefeituras','update') then raise exception 'DML direto restaurado';end if;
end$$;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000051','integracao@invalid.example',now());
insert into private.ma_admins values('00000000-0000-4000-8000-000000000051');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000051',true);
do $$declare retorno jsonb;begin
 retorno:=public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"prefeituras","id":"cidade-integracao","dados":{"id":"cidade-integracao","nome":"Londrina","codigo_ibge":"4113700","uf":"PR","codigo_uf":"41","paisId":"BR","status":"ativa"}}]');
 if retorno->0->>'versao'<>'1' or retorno->0->'dados'->>'nome'<>'Londrina' then raise exception 'Admin não recebeu confirmação canônica';end if;
 if public.ma_minhas_capacidades()#>>'{cidade-integracao,bases,gravar}'<>'true' then raise exception 'Criador não recebeu capacidades municipais';end if;
end$$;
select public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"cidade-integracao","id":"base-integracao","dados":{"id":"base-integracao","municipioId":"cidade-integracao","nome":"Fixture somente local"}}]');
do $$begin
 if not exists(select 1 from public.ma_auditoria where registro_id='base-integracao' and ator_id=auth.uid()) then raise exception 'Auditoria administrativa ausente';end if;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"cidade-integracao","id":"demo-integracao","dados":{"id":"demo-integracao","municipioId":"cidade-integracao","nome":"Fixture local","demo":true}}]');raise exception 'Integração permitiu demonstração';exception when check_violation then null;end;
end$$;
reset role;
do $$begin if not exists(select 1 from private.ma_historico where registro_id='base-integracao' and ator='00000000-0000-4000-8000-000000000051') then raise exception 'Histórico protegido ausente';end if;end$$;
rollback;
