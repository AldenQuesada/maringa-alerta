-- Executar SOMENTE em PostgreSQL descartável. Fixtures e carga nacional são revertidas.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','global@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000002','municipal@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000003','leitura@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000004','pendente@example.invalid',null);
insert into private.ma_admins values('10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
-- Provar que todas as entradas oficiais cabem no mesmo modelo, sem hardcode de município.
do $$declare lote jsonb;begin
 for lote in
   select jsonb_agg(jsonb_build_object('operacao','inserir','colecao','prefeituras','id','teste-'||codigo_ibge,'dados',dados)) from (
     select m.codigo_ibge,(row_number() over(order by m.codigo_ibge)-1)/5000 as pagina,
       jsonb_build_object('id','teste-'||m.codigo_ibge,'nome',m.nome,'codigo_ibge',m.codigo_ibge,'uf',m.uf,'codigo_uf',u.codigo,'paisId','BR','status','implantacao') as dados
     from public.ma_municipios_ibge m join public.ma_ufs u on u.sigla=m.uf
     where not exists(select 1 from public.ma_prefeituras p where p.codigo_ibge=m.codigo_ibge)
   ) registros group by pagina
 loop perform public.ma_aplicar_alteracoes(lote);end loop;
end$$;

do $$begin
 if (select count(*) from public.ma_prefeituras)<>(select count(*) from public.ma_municipios_ibge) then
   raise exception 'Cobertura nacional incompleta'; end if;
 if (select count(distinct uf) from public.ma_prefeituras)<>27 then raise exception 'UF faltante';end if;
 begin update public.ma_prefeituras set dados=dados where id='maringa';raise exception 'Escrita direta contorna versão';exception when insufficient_privilege then null;end;
 begin perform private.ma_gravar_prefeitura('{}');raise exception 'Helper interno exposto';exception when insufficient_privilege then null;end;
 begin perform public.ma_aplicar_alteracoes(null);raise exception 'Lote nulo aceito';exception when check_violation then null;end;
 if (select count(*) from public.ma_admin_listar_acessos())<>1 then raise exception 'Admin global não listado';end if;
 begin insert into private.ma_admins values(auth.uid());raise exception 'Tabela de admins exposta';exception when insufficient_privilege then null;end;
 begin perform public.ma_aplicar_alteracoes((select jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id',id,'versao',versao,'dados',jsonb_set(dados,'{codigo_ibge}','"3304557"'))) from public.ma_prefeituras where id='maringa'));raise exception 'IBGE mutável';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes((select jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id',id,'versao',versao,'dados',jsonb_set(dados,'{uf}','"SP"'))) from public.ma_prefeituras where id='maringa'));raise exception 'UF mutável';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes((select jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id',id,'versao',versao,'dados',jsonb_set(dados,'{nome}','"Cidade inventada"'))) from public.ma_prefeituras where id='maringa'));raise exception 'Nome não oficial';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes((select jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id',id,'versao',versao,'dados',jsonb_set(dados,'{status}','"qualquer"'))) from public.ma_prefeituras where id='maringa'));raise exception 'Status inválido';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes((select jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id',id,'versao',versao,'dados',jsonb_set(dados,'{status}','null'))) from public.ma_prefeituras where id='maringa'));raise exception 'Status nulo';exception when not_null_violation then null;end;
 begin perform public.ma_aplicar_alteracoes((select jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id',id,'versao',versao,'dados',jsonb_set(dados,'{id}','null'))) from public.ma_prefeituras where id='maringa'));raise exception 'ID nulo';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"prefeituras","id":"fake","dados":{"id":"fake","nome":"Inválido","codigo_ibge":"9999999","uf":"SP","codigo_uf":"99","paisId":"BR","status":"ativa"}}]');raise exception 'IBGE inexistente';exception when check_violation then null;end;
 begin insert into public.ma_municipios_ibge values('9999999','SP','Fake');raise exception 'Catálogo alterável';exception when insufficient_privilege then null;end;
 begin perform public.ma_admin_definir_vinculo('maringa','pendente@example.invalid','admin');raise exception 'Conta não confirmada aceita';exception when invalid_parameter_value then null;end;
 begin perform public.ma_admin_definir_vinculo('maringa','municipal@example.invalid','admin_plataforma');raise exception 'Elevação global permitida';exception when invalid_parameter_value then null;end;
end$$;
select public.ma_admin_definir_vinculo('maringa',' MUNICIPAL@example.invalid ','admin');
select public.ma_admin_definir_vinculo('teste-3550308','leitura@example.invalid','leitor');
do $$begin
 if (select count(*) from public.ma_admin_listar_acessos('maringa'))<>1 then raise exception 'Lista municipal incorreta';end if;
 begin perform public.ma_admin_definir_vinculo('maringa','municipal@example.invalid','operador');raise exception 'Conflito não detectado';exception when serialization_failure then null;end;
 begin insert into public.ma_auditoria(tabela,registro_id,operacao) values('fake','x','INSERT');raise exception 'Auditoria falsificável';exception when insufficient_privilege then null;end;
 if not exists(select 1 from public.ma_auditoria where tabela='ma_vinculos' and ator_id=auth.uid()) then raise exception 'Autoria ausente';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin
 if (select count(*) from public.ma_prefeituras)<>1 then raise exception 'Vazamento de prefeituras';end if;
 if exists(select 1 from public.ma_auditoria) then raise exception 'Histórico global exposto';end if;
 begin perform public.ma_admin_listar_acessos();raise exception 'Diretório global exposto';exception when insufficient_privilege then null;end;
 begin perform private.ma_listar_acessos(null,10,0);raise exception 'Helper sem guard';exception when insufficient_privilege then null;end;
 begin perform public.ma_admin_definir_vinculo('teste-3550308','municipal@example.invalid','admin');raise exception 'Admin municipal concedeu vínculo';exception when insufficient_privilege then null;end;
end$$;
select public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"isolamento","dados":{"id":"isolamento","municipioId":"maringa","nome":"Fixture local"}}]');
do $$begin
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"atualizar","colecao":"bases","municipio_id":"maringa","id":"isolamento","versao":1,"dados":{"id":"isolamento","municipioId":null}}]');raise exception 'Tenant nulo aceito';exception when check_violation then null;end;
 begin update public.ma_cadastros set municipio_id='teste-3550308',dados=jsonb_set(dados,'{municipioId}','"teste-3550308"') where id='isolamento';raise exception 'Transferência entre tenants';exception when insufficient_privilege then null;end;
end$$;
do $$begin
 begin
  perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"reverter","dados":{"id":"reverter","municipioId":"maringa"}},{"operacao":"inserir","colecao":"bases","municipio_id":"teste-3550308","id":"negado","dados":{"id":"negado","municipioId":"teste-3550308"}}]');
  raise exception 'Lote cruzado aceito';
 exception when insufficient_privilege then null;end;
 if exists(select 1 from public.ma_cadastros where id='reverter') then raise exception 'Lote parcialmente aplicado';end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin
 if exists(select 1 from public.ma_cadastros where id='isolamento') then raise exception 'Leitura cruzada';end if;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"teste-3550308","id":"bloqueado","dados":{"id":"bloqueado","municipioId":"teste-3550308"}}]');raise exception 'Leitor escreveu';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.ma_admin_definir_vinculo('maringa','municipal@example.invalid',null,'admin');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin if exists(select 1 from public.ma_prefeituras) or exists(select 1 from public.ma_cadastros) then raise exception 'Revogação sem efeito';end if;end$$;
set local role anon;
do $$begin
 begin perform public.ma_admin_listar_acessos();raise exception 'Anon consultou admins';exception when insufficient_privilege then null;end;
 begin perform public.ma_admin_definir_vinculo('maringa','municipal@example.invalid','admin');raise exception 'Anon concedeu vínculo';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity) then raise exception 'Tabela sem RLS';end if;
end$$;
rollback;
