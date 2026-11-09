-- Fixtures somente no PostgreSQL descartável.
begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000071','incidentes@invalid.example',now()),('00000000-0000-4000-8000-000000000072','leitura-incidentes@invalid.example',now());
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000071','admin'),('maringa','00000000-0000-4000-8000-000000000072','leitor');
create function pg_temp.gravar(c text,i text,d jsonb,v bigint default null) returns jsonb language sql as $$ select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('colecao',c,'id',i,'municipio_id','maringa','operacao',case when v is null then 'inserir' else 'atualizar' end,'versao',v,'dados',d||jsonb_build_object('id',i,'municipioId','maringa')))) $$;
grant execute on function pg_temp.gravar(text,text,jsonb,bigint) to authenticated,anon,service_role;
create function pg_temp.rejeita(comando text,codigo text default '23514') returns void language plpgsql as $$
declare rejeitado boolean:=false;
begin begin execute comando;exception when others then if sqlstate<>codigo then raise;end if;rejeitado:=true;end;if not rejeitado then raise exception 'Operação proibida aceita: %',comando;end if;end$$;
grant execute on function pg_temp.rejeita(text,text) to authenticated,anon,service_role;
do $$begin
 if exists(select 1 from public.ma_configuracao, jsonb_array_elements(documento->'grupos') g where id='interface' and (jsonb_typeof(g)<>'object' or jsonb_typeof(g->'items')<>'array')) then raise exception 'Navegação inválida';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
select pg_temp.gravar('eventos','evento-local','{"nome":"Evento de teste","tipo":"Vendaval","status":"Em andamento"}');
select pg_temp.gravar('ocorrenciaTipos','tipo-local','{"nome":"Queda de árvore","prioridade":"Alta"}');
select pg_temp.gravar('bairros','bairro-local','{"nome":"Bairro de teste","geojson":{"type":"Polygon","coordinates":[[[-52,-24],[-51,-24],[-51,-23],[-52,-23],[-52,-24]]]}}');
select pg_temp.gravar('equipes','equipe-local','{"nome":"Equipe de teste","status":"Disponível"}');
create function pg_temp.exemplo() returns jsonb language sql as $$select '{"tipo_id":"tipo-local","evento_id":"evento-local","bairro_id":"bairro-local","endereco":"Local do teste","quando":"2026-11-01T12:00:00Z","gravidade":"3","responsabilidade":"publica","lat":"-23.4","lng":"-51.9","status":"Em triagem","organizacoes":[{"colecao":"equipes","id":"equipe-local","nome":"Nome forjado"}],"fotos":[],"relatos":[]}'::jsonb$$;
grant execute on function pg_temp.exemplo() to authenticated,anon,service_role;
select pg_temp.gravar('incidentes','i-local',pg_temp.exemplo()||'{"nome":"Forjado","bairro":"Forjado","criado_em":"1900-01-01","protocolo":"Forjado"}');
do $$declare d jsonb;begin
 select dados into d from public.ma_cadastros where colecao='incidentes' and id='i-local';
 if d->>'nome'<>'Queda de árvore' or d->>'bairro'<>'Bairro de teste' or d->>'protocolo'<>'OC-i-local' or d#>>'{organizacoes,0,nome}'<>'Equipe de teste' or (d->>'criado_em')::timestamptz<now()-interval '1 minute' then raise exception 'Valores canônicos não preservados';end if;
end$$;
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"lat":"0"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"evento_id":"de-outra-prefeitura"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"organizacoes":[{"colecao":"equipes","id":"de-outra-prefeitura"}]}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"fotos":[{"dados":"data:image/svg+xml;base64,AAAA"}]}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"afetados":-1}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"status":"Resolvida"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"quando":"infinity"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','invalido',pg_temp.exemplo()||'{"demo":true}')$q$);
select pg_temp.rejeita($q$select public.ma_aplicar_alteracoes('[{"colecao":"equipes","id":"equipe-local","municipio_id":"maringa","operacao":"excluir","versao":1}]')$q$,'23503');
select pg_temp.gravar('incidentes','i-local',dados||'{"status":"Confirmada"}',versao) from public.ma_cadastros where colecao='incidentes' and id='i-local';
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','i-local',pg_temp.exemplo(),1)$q$,'40001');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','proibido',pg_temp.exemplo())$q$,'42501');
do $$begin if exists(select 1 from public.ma_cadastros where colecao='incidentes' and id='i-local') then raise exception 'Leitor sem permissão leu ocorrência privada';end if;end$$;
reset role;
do $$begin if not exists(select 1 from private.ma_historico where registro_id='i-local' and operacao='INSERT') then raise exception 'Histórico ausente';end if;end$$;
rollback;
