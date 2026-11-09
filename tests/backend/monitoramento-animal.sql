-- Fixtures somente no PostgreSQL descartável.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000081','admin-a-animal@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000084','admin-b-animal@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000082','operador-animal@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000083','leitor-animal@invalid.example',now());
insert into public.ma_vinculos values
 ('maringa','00000000-0000-4000-8000-000000000081','admin'),
 ('maringa','00000000-0000-4000-8000-000000000084','admin'),
 ('maringa','00000000-0000-4000-8000-000000000082','operador'),
 ('maringa','00000000-0000-4000-8000-000000000083','leitor');
create function pg_temp.como(u text) returns void language sql as $$select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000'||u,true)$$;
create function pg_temp.gravar(c text,i text,d jsonb,v bigint default null) returns jsonb language sql as $$ select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('colecao',c,'id',i,'municipio_id','maringa','operacao',case when v is null then 'inserir' else 'atualizar' end,'versao',v,'dados',d||jsonb_build_object('id',i,'municipioId','maringa')))) $$;
create function pg_temp.atualizar(c text,i text,mudanca jsonb) returns jsonb language sql as $$ select pg_temp.gravar(c,i,dados||mudanca,versao) from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i $$;
create function pg_temp.dados(c text,i text) returns jsonb language sql as $$select dados from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i$$;
create function pg_temp.rejeita(comando text,codigo text default '23514') returns void language plpgsql as $$
declare rejeitado boolean:=false;
begin begin execute comando;exception when others then if sqlstate<>codigo then raise;end if;rejeitado:=true;end;if not rejeitado then raise exception 'Operação proibida aceita: %',comando;end if;end$$;
create function pg_temp.exige(condicao boolean,mensagem text) returns void language plpgsql as $$begin if not coalesce(condicao,false) then raise exception 'Falhou: %',mensagem;end if;end$$;
create function pg_temp.incidente(tipo text,extra jsonb default '{}') returns jsonb language sql as $$select jsonb_build_object('tipo_id',tipo,'evento_id','protecao-animal-rotina','bairro_id','b-centro','endereco','Rua de teste, 100','quando','2026-11-08T12:00:00Z','gravidade','2','responsabilidade','publica','lat','-23.45','lng','-51.95','status','Confirmada','fotos','[]'::jsonb,'relatos','[]'::jsonb)||extra$$;
create function pg_temp.capacidade(papel_alvo text,cap text,ligar boolean) returns void language plpgsql security definer as $$begin
 if ligar then insert into private.ma_capacidades_papel values(papel_alvo,cap) on conflict do nothing;
 else delete from private.ma_capacidades_papel where papel=papel_alvo and capacidade=cap;end if;end$$;

set local role authenticated;

-- Instalação: somente administrador municipal, idempotente, a partir do modelo do banco.
select pg_temp.como('82');
select pg_temp.rejeita($q$select public.ma_instalar_protecao_animal('maringa')$q$,'42501');
select pg_temp.como('83');
select pg_temp.rejeita($q$select public.ma_instalar_protecao_animal('maringa')$q$,'42501');
select pg_temp.como('81');
select pg_temp.exige((public.ma_instalar_protecao_animal('maringa')->>'criados')::int=5,'instalação cria 4 tipos e 1 evento');
select pg_temp.exige((public.ma_instalar_protecao_animal('maringa')->>'criados')::int=0,'instalação idempotente');
select pg_temp.exige(pg_temp.dados('ocorrenciaTipos','animal-maus-tratos')->>'visibilidade'='restrita','tipo restrito vindo do modelo');
select pg_temp.rejeita($q$select pg_temp.atualizar('ocorrenciaTipos','animal-perdido','{"visibilidade":"secreta"}')$q$);

-- Capacidades por papel.
select pg_temp.exige(public.ma_capacidades_operacionais('maringa')='["aprovar_alerta","triar_animais","ver_restritos"]'::jsonb,'capacidades do admin');
select pg_temp.como('82');
select pg_temp.exige(public.ma_capacidades_operacionais('maringa')='[]'::jsonb,'operador sem capacidades até a fase 2');
select pg_temp.como('83');
select pg_temp.exige(public.ma_capacidades_operacionais('maringa')='[]'::jsonb,'leitor sem capacidades');

-- Território: dois bairros vizinhos e um distante.
select pg_temp.como('81');
select pg_temp.gravar('bairros','b-centro','{"nome":"Centro de teste","geojson":{"type":"Polygon","coordinates":[[[-52,-23.5],[-51.9,-23.5],[-51.9,-23.4],[-52,-23.4],[-52,-23.5]]]}}');
select pg_temp.gravar('bairros','b-vizinho','{"nome":"Vizinho de teste","geojson":{"type":"Polygon","coordinates":[[[-51.9,-23.5],[-51.8,-23.5],[-51.8,-23.4],[-51.9,-23.4],[-51.9,-23.5]]]}}');
select pg_temp.gravar('bairros','b-longe','{"nome":"Distante de teste","geojson":{"type":"Polygon","coordinates":[[[-51.5,-23.5],[-51.4,-23.5],[-51.4,-23.4],[-51.5,-23.4],[-51.5,-23.5]]]}}');
select pg_temp.exige((select jsonb_agg(x->>'id') from jsonb_array_elements(public.ma_area_alerta('maringa','b-centro')) x)='["b-centro","b-vizinho"]'::jsonb,'área de alerta = bairro + vizinho de fronteira');

-- Relatos do WhatsApp: visibilidade definida pelo tipo, não pelo cliente.
select pg_temp.gravar('relatos','r-denuncia','{"categoria":"animal","situacao":"Maus-tratos ou abandono","nome":"Anônimo","telefone":"44999990000","endereco":"Rua restrita, 1","anonimo":true,"visibilidade":"publica","status":"Em triagem"}');
select pg_temp.gravar('relatos','r-perdido','{"categoria":"animal","situacao":"Perdi meu animal","nome":"Tutora","telefone":"44999990001","endereco":"Rua pública, 2","status":"Em triagem"}');
select pg_temp.exige(pg_temp.dados('relatos','r-denuncia')->>'visibilidade'='restrita','denúncia restrita mesmo com valor forjado');
select pg_temp.exige(pg_temp.dados('relatos','r-perdido')->>'visibilidade'='publica','relato comum público');
select pg_temp.atualizar('relatos','r-denuncia','{"visibilidade":"publica","situacao":"Perdi meu animal"}');
select pg_temp.exige(pg_temp.dados('relatos','r-denuncia')->>'visibilidade'='restrita','restrição não pode ser removida por edição');

-- Ocorrências de animais: classificação pelo tipo e desfecho obrigatório.
select pg_temp.gravar('incidentes','i-perdido',pg_temp.incidente('animal-perdido'));
select pg_temp.exige(pg_temp.dados('incidentes','i-perdido')->>'categoria'='animais' and pg_temp.dados('incidentes','i-perdido')->>'visibilidade'='publica','ocorrência classificada pelo tipo');
select pg_temp.gravar('incidentes','i-denuncia',pg_temp.incidente('animal-maus-tratos'));
select pg_temp.exige(pg_temp.dados('incidentes','i-denuncia')->>'visibilidade'='restrita','ocorrência restrita pelo tipo');
select pg_temp.rejeita($q$select pg_temp.atualizar('incidentes','i-perdido','{"status":"Resolvida"}')$q$);
select pg_temp.rejeita($q$select pg_temp.atualizar('incidentes','i-perdido','{"status":"Resolvida","desfecho":"Inventado"}')$q$);

-- Sem a capacidade de ver restritos, nem o administrador lê denúncias ou sua projeção.
select pg_temp.capacidade('admin','ver_restritos',false);
select pg_temp.exige(pg_temp.dados('relatos','r-denuncia') is null,'relato restrito oculto sem capacidade');
select pg_temp.exige(pg_temp.dados('incidentes','i-denuncia') is null,'ocorrência restrita oculta sem capacidade');
select pg_temp.exige(not exists(select 1 from territorio.entidades where municipio_id='maringa' and colecao='incidentes' and id='i-denuncia'),'projeção restrita oculta');
select pg_temp.exige(exists(select 1 from territorio.entidades where municipio_id='maringa' and colecao='incidentes' and id='i-perdido'),'projeção pública visível');
select pg_temp.rejeita($q$select pg_temp.gravar('incidentes','i-denuncia-2',pg_temp.incidente('animal-maus-tratos'))$q$,'42501');
select pg_temp.rejeita($q$select pg_temp.atualizar('ocorrenciaTipos','animal-maus-tratos','{"visibilidade":"publica"}')$q$,'42501');
select pg_temp.capacidade('admin','ver_restritos',true);
select pg_temp.exige(pg_temp.dados('incidentes','i-denuncia') is not null,'capacidade devolve a leitura');

-- Animais: contrato, transições e vínculo com a ocorrência.
select pg_temp.gravar('animais','a-toddy','{"nome":"Toddy","especie":"Cão","porte":"Médio","status":"Perdido"}');
select pg_temp.rejeita($q$select pg_temp.gravar('animais','a-invalido','{"especie":"Dragão","status":"Perdido"}')$q$);
select pg_temp.rejeita($q$select pg_temp.atualizar('animais','a-toddy','{"status":"Adotado"}')$q$);
select pg_temp.atualizar('animais','a-toddy','{"status":"Encontrado"}');
select pg_temp.atualizar('incidentes','i-perdido','{"animal_id":"a-toddy"}');
select pg_temp.rejeita($q$select pg_temp.atualizar('incidentes','i-perdido','{"animal_id":"a-inexistente"}')$q$,'23503');

-- Alertas: só para ocorrência pública confirmada; área no servidor; aprovação por outra pessoa capaz.
select pg_temp.gravar('alertas','al-1','{"incidente_id":"i-perdido","mensagem":"Cão perdido no Centro de teste","nivel":"Bairro","criado_por":"forjado","zonas":[]}');
select pg_temp.exige(pg_temp.dados('alertas','al-1')->>'criado_por'='00000000-0000-4000-8000-000000000081','autor definido pelo servidor');
select pg_temp.exige(jsonb_array_length(pg_temp.dados('alertas','al-1')->'zonas')=2,'zonas calculadas pelo servidor');
select pg_temp.exige(pg_temp.dados('alertas','al-1')->>'status'='Rascunho','alerta nasce rascunho');
select pg_temp.rejeita($q$select pg_temp.atualizar('alertas','al-1','{"status":"Aprovado"}')$q$,'42501');
select pg_temp.rejeita($q$select pg_temp.gravar('alertas','al-x','{"incidente_id":"i-inexistente","mensagem":"x"}')$q$,'23503');
select pg_temp.rejeita($q$select pg_temp.gravar('alertas','al-restrito','{"incidente_id":"i-denuncia","mensagem":"x"}')$q$);
select pg_temp.como('84');
select pg_temp.atualizar('alertas','al-1','{"status":"Aprovado","aprovado_por":"forjado"}');
select pg_temp.exige(pg_temp.dados('alertas','al-1')->>'aprovado_por'='00000000-0000-4000-8000-000000000084','aprovação registrada pelo servidor');
select pg_temp.rejeita($q$select pg_temp.atualizar('alertas','al-1','{"mensagem":"Alterada depois"}')$q$);
select pg_temp.rejeita($q$select pg_temp.atualizar('alertas','al-1','{"status":"Rascunho"}')$q$);
select pg_temp.atualizar('alertas','al-1','{"zonas":[],"criado_por":"forjado"}');
select pg_temp.exige(jsonb_array_length(pg_temp.dados('alertas','al-1')->'zonas')=2 and pg_temp.dados('alertas','al-1')->>'criado_por'='00000000-0000-4000-8000-000000000081','área e autoria imutáveis');

-- Sem a capacidade de triagem, nenhuma mudança de situação.
select pg_temp.capacidade('admin','triar_animais',false);
select pg_temp.rejeita($q$select pg_temp.atualizar('incidentes','i-perdido','{"status":"Resolvida","desfecho":"Reunido com o tutor"}')$q$,'42501');
select pg_temp.capacidade('admin','triar_animais',true);
select pg_temp.atualizar('incidentes','i-perdido','{"status":"Resolvida","desfecho":"Reunido com o tutor"}');
select pg_temp.exige(pg_temp.dados('incidentes','i-perdido')->>'status'='Resolvida','resolvida com desfecho');

-- Operador e leitor: sem acesso a operações, como nas coleções existentes.
select pg_temp.como('82');
select pg_temp.rejeita($q$select pg_temp.gravar('animais','a-op','{"especie":"Gato","status":"Encontrado"}')$q$,'42501');
select pg_temp.exige(pg_temp.dados('animais','a-toddy') is null and pg_temp.dados('incidentes','i-perdido') is null,'operador não lê operações');
select pg_temp.como('83');
select pg_temp.rejeita($q$select pg_temp.gravar('alertas','al-leitor','{"incidente_id":"i-perdido","mensagem":"x"}')$q$,'42501');
select pg_temp.exige(pg_temp.dados('alertas','al-1') is null,'leitor não lê alertas');
reset role;
select pg_temp.exige(exists(select 1 from private.ma_historico where registro_id='al-1'),'histórico do alerta');
rollback;
