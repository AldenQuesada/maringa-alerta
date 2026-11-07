-- Verificação somente leitura: pode ser executada no projeto confirmado.
begin read only;
select jsonb_build_object(
 'municipios_catalogo',(select count(*) from public.ma_municipios_ibge),
 'ufs',(select count(*) from public.ma_ufs),
 'prefeituras',(select count(*) from public.ma_prefeituras),
 'cadastros',(select count(*) from public.ma_cadastros),
 'admins',(select count(*) from private.ma_admins),
 'vinculos',(select count(*) from public.ma_vinculos),
 'tabelas_sem_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity),
 'anon_pode_listar_admins',has_function_privilege('anon','public.ma_admin_listar_acessos(text,integer,integer)','execute'),
 'cliente_pode_alterar_prefeitura_diretamente',has_table_privilege('authenticated','public.ma_prefeituras','update'),
 'cliente_pode_alterar_cadastro_diretamente',has_table_privilege('authenticated','public.ma_cadastros','update'),
 'cliente_pode_gravar_auditoria',has_table_privilege('authenticated','public.ma_auditoria','insert'),
 'cliente_pode_alterar_catalogo',has_table_privilege('authenticated','public.ma_municipios_ibge','update')
) as verificacao;
-- Testa a leitura administrativa com a identidade já existente; não atribui privilégios.
select set_config('request.jwt.claim.sub',(select user_id::text from private.ma_admins order by user_id limit 1),true);
set local role authenticated;
select jsonb_build_object('admin_plataforma',public.ma_meu_perfil()->'admin_plataforma',
 'admins_visiveis',(select count(*) from public.ma_admin_listar_acessos()),
 'ufs_visiveis',(select count(*) from public.ma_ufs),
 'prefeituras_visiveis',(select count(*) from public.ma_prefeituras)) as perfil_verificado;
rollback;
