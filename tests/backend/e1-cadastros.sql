-- Somente banco descartável: invariantes E1 e preservação de fichas legadas.
begin;
create function pg_temp.rejeitar(comando text,codigo text) returns void language plpgsql as $$
declare obtido text;begin
 begin execute comando;exception when others then get stacked diagnostics obtido=returned_sqlstate;end;
 if obtido is distinct from codigo then raise exception 'Esperado %, recebido %: %',codigo,obtido,comando;end if;
end$$;
insert into auth.users(id,email,email_confirmed_at) values('e1000000-0000-4000-8000-000000000001','e1-admin@example.invalid',now());
insert into public.ma_vinculos values('maringa','e1000000-0000-4000-8000-000000000001','admin');
-- Simula uma ficha anterior à E1, sem alterar ou apagar sua extensão legada.
insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','usuarios','e1-legado','{"id":"e1-legado","municipioId":"maringa","nome":"Legado","funcao":"operador","campo_legado":{"preservar":true}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
select pg_temp.rejeitar($q$select public.ma_aplicar_alteracoes('[{"operacao":"inserir","colecao":"usuarios","municipio_id":"maringa","id":"e1-incompleto","dados":{"id":"e1-incompleto","municipioId":"maringa","nome":"Incompleto","funcao":"operador"}}]')$q$,'42501');
select pg_temp.rejeitar($q$select public.ma_aplicar_alteracoes('[{"operacao":"atualizar","colecao":"usuarios","municipio_id":"maringa","id":"e1-legado","versao":1,"dados":{"id":"e1-legado","municipioId":"maringa","nome":"Alteração genérica","funcao":"operador"}}]')$q$,'42501');
select pg_temp.rejeitar($q$select public.ma_aplicar_alteracoes('[{"operacao":"excluir","colecao":"usuarios","municipio_id":"maringa","id":"e1-legado","versao":1}]')$q$,'42501');
select public.ma_colaborador_salvar('maringa','e1-legado','{"email":" E1-LEGADO@EXAMPLE.INVALID ","telefone":"+55 (44) 99999-9999","cep":"87000-000","endereco":"Rua local","bairro":"Centro","cargo":"Apoio","horarios":[],"nascimento":"2000-02-29","documento":"Documento informado"}','{"papel":"leitor","colecoes":["eventos"],"situacao":"pendente"}',1);
do $$begin
 if not exists(select 1 from public.ma_cadastros where id='e1-legado' and versao=2 and dados->>'email'='e1-legado@example.invalid' and dados->>'telefone'='5544999999999' and dados->>'cep'='87000000' and dados->'campo_legado'='{"preservar":true}'::jsonb) then raise exception 'Normalização ou preservação falhou';end if;
end$$;
do $$declare invalido jsonb;codigo text;begin
 for invalido in select value from jsonb_array_elements('[{"telefone":"x"},{"telefone":"abc44999999999"},{"telefone":123},{"telefone":"123"},{"documento":{"valor":"objeto"}},{"documento":null},{"nascimento":"3000-99-99"},{"nascimento":"2025-02-29"},{"nascimento":"2999-01-01"},{"cep":"123"},{"nome":[]},{"papeis":[1]},{"papeis":["inventado"]},{"horarios":{}},{"admin":true},{"campo_legado":{"preservar":false}}]') loop
  codigo:=null;
  begin perform public.ma_colaborador_salvar('maringa','e1-legado',invalido,'{"papel":"leitor","colecoes":["eventos"],"situacao":"pendente"}',2);
  exception when others then get stacked diagnostics codigo=returned_sqlstate;end;
  if codigo is distinct from '23514' then raise exception 'Campo inválido aceito ou erro incorreto: %, %',invalido,codigo;end if;
 end loop;
end$$;
select pg_temp.rejeitar($q$select public.ma_colaborador_salvar('maringa','e1-duplicado','{"nome":"Outra pessoa","email":" E1-LEGADO@example.invalid ","telefone":"44999999999","endereco":"Rua local","bairro":"Centro","cargo":"Apoio","funcao":"operador","horarios":[]}','{"papel":"leitor","colecoes":["eventos"],"situacao":"pendente"}',null)$q$,'23514');
-- Mesmo uma carga privilegiada não contorna a unicidade canônica.
reset role;
select pg_temp.rejeitar($q$insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','usuarios','e1-carga','{"id":"e1-carga","municipioId":"maringa","nome":"Carga duplicada","funcao":"operador","email":" E1-LEGADO@EXAMPLE.INVALID "}')$q$,'23505');
do $$begin
 if (select count(*) from public.ma_cadastros where id='e1-legado')<>1 or (select versao from public.ma_cadastros where id='e1-legado')<>2 then raise exception 'Tentativa inválida alterou a ficha';end if;
 if exists(select 1 from public.ma_cadastros where id in ('e1-duplicado','e1-incompleto','e1-carga')) then raise exception 'Falha deixou cadastro parcial';end if;
end$$;
rollback;
