-- Executar SOMENTE no banco local descartável. Todas as fixtures são revertidas.
begin;
insert into private.ma_convites_iniciais(email) values('admin@example.invalid');
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','admin@example.invalid',null),
 ('00000000-0000-4000-8000-000000000002','operador@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000003','externo@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000004','leitor@example.invalid',now());
do $$begin if exists(select 1 from private.ma_admins) then raise exception 'E-mail não confirmado ganhou admin'; end if; end$$;
update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000001';
insert into public.ma_prefeituras(id,dados) values('outro','{"id":"outro","nome":"Município de teste local","codigo_ibge":"0000001","uf":"PR"}');
insert into public.ma_vinculos values ('maringa','00000000-0000-4000-8000-000000000002','operador'),('maringa','00000000-0000-4000-8000-000000000004','leitor');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin
 if (select count(*) from public.ma_prefeituras)<>1 then raise exception 'Vazamento de prefeitura'; end if;
 begin insert into public.ma_vinculos values('outro',auth.uid(),'admin');raise exception 'Escalação de vínculo permitida';exception when insufficient_privilege then null;end;
 begin insert into public.ma_prefeituras(id,dados) values('invasor','{"id":"invasor","nome":"X","codigo_ibge":"0000002"}');raise exception 'Operador criou prefeitura';exception when insufficient_privilege then null;end;
end$$;
select public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"local-1","dados":{"id":"local-1","municipioId":"maringa","nome":"Fixture exclusivamente local"}}]');
do $$begin
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"outro","id":"local-2","dados":{"id":"local-2","municipioId":"outro","nome":"Fixture externa"}}]');raise exception 'Escrita cruzada permitida';exception when insufficient_privilege then null;end;
 begin update public.ma_cadastros set dados='{"id":"local-1"}' where id='local-1';raise exception 'Tenant ausente aceito';exception when insufficient_privilege then null;end;
end$$;
select public.ma_aplicar_alteracoes('[{"operacao":"atualizar","colecao":"bases","municipio_id":"maringa","id":"local-1","versao":1,"dados":{"id":"local-1","municipioId":"maringa","nome":"Edição local"}}]');
do $$begin
 if (select versao from public.ma_cadastros where id='local-1')<>2 then raise exception 'Versão incorreta';end if;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"atualizar","colecao":"bases","municipio_id":"maringa","id":"local-1","versao":1,"dados":{"id":"local-1","municipioId":"maringa","nome":"Edição antiga"}}]');raise exception 'Conflito ignorado';exception when serialization_failure then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$begin if exists(select 1 from public.ma_cadastros) or exists(select 1 from public.ma_prefeituras) then raise exception 'Usuário externo leu dados';end if;end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$begin
 if (select count(*) from public.ma_cadastros)<>1 then raise exception 'Leitor não pode consultar';end if;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"atualizar","colecao":"bases","municipio_id":"maringa","id":"local-1","versao":2,"dados":{"id":"local-1","municipioId":"maringa"}}]');raise exception 'Leitor alterou registro';exception when serialization_failure then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"prefeituras","id":"nova","dados":{"id":"nova","nome":"Nova local","codigo_ibge":"0000003","uf":"PR"}}]');
do $$begin if not exists(select 1 from public.ma_vinculos where municipio_id='nova' and user_id=auth.uid()) then raise exception 'Criador sem vínculo';end if;end$$;
select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','prefeituras','id','maringa','versao',versao,'dados',jsonb_set(dados,'{status}','"suspensa"')))) from public.ma_prefeituras where id='maringa';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin if exists(select 1 from public.ma_cadastros) then raise exception 'Prefeitura suspensa acessível';end if;end$$;
set local role anon;
do $$begin begin perform count(*) from public.ma_cadastros;raise exception 'Anônimo leu dados';exception when insufficient_privilege then null;end;end$$;
rollback;
