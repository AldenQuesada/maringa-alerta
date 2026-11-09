-- SOMENTE banco descartável. Fixtures integralmente revertidas.
begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000011','owner@invalid.example',now()),('00000000-0000-4000-8000-000000000012','reader@invalid.example',now());
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000011','admin'),('maringa','00000000-0000-4000-8000-000000000012','leitor');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
do $$begin
 begin insert into public.ma_cadastros values('maringa','bases','b','{"id":"b","municipioId":"maringa","nome":"Base local"}',1,now());raise exception 'Escrita direta aceita';exception when insufficient_privilege then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"bad","dados":{"id":"bad","municipioId":"maringa"}}]');raise exception 'Campo obrigatório ignorado';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"bad","dados":{"id":"bad","municipioId":"maringa","nome":"Local","demo":true}}]');raise exception 'Demonstração aceita';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"bad","dados":{"id":"bad","municipioId":"maringa","nome":"Local","tipo":"TIPO INVENTADO"}}]');raise exception 'Enum inválido aceito';exception when check_violation then null;end;
 begin perform public.ma_colaborador_salvar('maringa','bad','{"nome":"Local","email":"relacao@example.invalid","telefone":"44999999999","endereco":"Rua","bairro":"Centro","cargo":"Apoio","funcao":"operador","horarios":[],"estrutura_id":"inexistente"}','{"papel":"leitor","colecoes":[],"situacao":"pendente"}',null);raise exception 'Referência inválida aceita';exception when foreign_key_violation then null;end;
end$$;
select public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"eventos","municipio_id":"maringa","id":"e1","dados":{"id":"e1","municipioId":"maringa","nome":"Evento local","tipo":"Verificação"}},{"operacao":"inserir","colecao":"eventos","municipio_id":"maringa","id":"e2","dados":{"id":"e2","municipioId":"maringa","nome":"Evento local 2","tipo":"Verificação","mapa_evento_id":"e1"}}]');
do $$begin
 begin update public.ma_cadastros set dados=dados where id='e1';raise exception 'Atualização direta aceita';exception when insufficient_privilege then null;end;
 begin delete from public.ma_cadastros where id='e1';raise exception 'Exclusão direta aceita';exception when insufficient_privilege then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"lote","dados":{"id":"lote","municipioId":"maringa","nome":"Somente teste local"}},{"operacao":"inserir","colecao":"bases","municipio_id":"maringa","id":"lote-invalido","dados":{"id":"lote-invalido","municipioId":"maringa"}}]');raise exception 'Lote inválido aceito';exception when check_violation then null;end;
 if exists(select 1 from public.ma_cadastros where id='lote') then raise exception 'Lote parcialmente gravado';end if;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"atualizar","colecao":"eventos","municipio_id":"maringa","id":"e1","versao":1,"dados":{"id":"e1","municipioId":"maringa","nome":"Evento local","tipo":"Verificação","mapa_evento_id":"e2"}}]');raise exception 'Ciclo aceito';exception when check_violation then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"operacao":"excluir","colecao":"eventos","municipio_id":"maringa","id":"e1","versao":1}]');raise exception 'Referência pendente permitida';exception when foreign_key_violation then null;end;
 begin delete from private.ma_historico;raise exception 'Histórico apagável';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
do $$begin if exists(select 1 from public.ma_cadastros where colecao='eventos') then raise exception 'Leitor acessou coleção restrita';end if;end$$;
reset role;
do $$begin
 if (select count(*) from private.ma_historico where tabela='ma_cadastros')<>2 then raise exception 'Histórico não corresponde às gravações confirmadas';end if;
 if exists(select 1 from private.ma_historico where tabela='ma_cadastros' and (ator is null or posterior is null)) then raise exception 'Histórico incompleto';end if;
 if exists(select 1 from pg_roles where rolname='ma_escritor' and (rolcanlogin or rolbypassrls or rolsuper)) then raise exception 'Papel interno privilegiado';end if;
end$$;
rollback;
