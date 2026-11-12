-- Relato guiado pelo catálogo de tipos. Somente em PostgreSQL descartável; tudo é desfeito no fim.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
create function pg_temp.escolher(s uuid,rotulo text) returns jsonb language plpgsql as $$declare id text;begin
 select b->>'id' into strict id from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') b where x.id=s and b->>'label'=rotulo;
 return wa.step(s,jsonb_build_object('button',id));end$$;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare id text;begin
 select b->>'id' into strict id from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') b where x.id=s and b->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',id));end$$;
create function pg_temp.rotulos(s uuid) returns text[] language sql as $$
 select array_agg(b->>'label' order by o) from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') with ordinality y(b,o) where x.id=s and b->>'id' like '%:choice:%'$$;
create function pg_temp.menu(s uuid,fluxo text) returns text language sql as $$
 select position::text from wa.flows where version_id=(select version_id from wa.sessions where id=s) and key=fluxo$$;
create function pg_temp.relato(contato text) returns jsonb language sql as $$
 select dados from public.ma_cadastros where colecao='relatos' and dados->>'telefone'=contato order by atualizado_em desc limit 1$$;
create function pg_temp.erro(sql text) returns text language plpgsql as $$begin execute sql;return null;exception when others then return sqlerrm;end$$;

-- Catálogo: tipos de animal pelo instalador do módulo e dois tipos de outras categorias.
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-4000-8000-000000000071','admin-relato@invalid.example',now());
insert into public.ma_vinculos values ('maringa','00000000-0000-4000-8000-000000000071','admin');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
set local role authenticated;
select public.ma_instalar_protecao_animal('maringa');
reset role;
update public.ma_cadastros set dados=dados||jsonb_build_object('ordem_whatsapp',case id when 'animal-perdido' then 1 when 'animal-encontrado' then 2 when 'animal-ferido' then 3 else 4 end,
 'botao_whatsapp',case id when 'animal-ferido' then 'Animal ferido' when 'animal-maus-tratos' then 'Maus-tratos' else dados->>'nome' end)
 where colecao='ocorrenciaTipos' and dados->>'categoria'='animais';
insert into public.ma_cadastros(municipio_id,colecao,id,dados) values
 ('maringa','ocorrenciaTipos','alagamento','{"id":"alagamento","municipioId":"maringa","nome":"Alagamento","categoria":"chuva","prioridade":"Média","ordem_whatsapp":1}'),
 ('maringa','ocorrenciaTipos','rio-transbordando','{"id":"rio-transbordando","municipioId":"maringa","nome":"Rio ou córrego transbordando","botao_whatsapp":"Rio ou córrego cheio","categoria":"chuva","prioridade":"Alta","ordem_whatsapp":2}'),
 ('maringa','ocorrenciaTipos','queda-de-arvore','{"id":"queda-de-arvore","municipioId":"maringa","nome":"Queda de árvore","categoria":"vento","prioridade":"Média"}');

do $test$
declare c wa.channels;v uuid;v4 uuid;s uuid;r jsonb;d jsonb;m jsonb;i bigint;
begin
 select * into strict c from wa.channels;
 select id into strict v from wa.versions where name='municipal-v5-relato-catalogo';
 select id into strict v4 from wa.versions where name='municipal-v4-alertas';
 -- Preparação apenas: a migração não troca a versão do canal.
 perform pg_temp.assert(c.version_id<>v,'Canal não pode mudar de versão na migração');
 perform pg_temp.assert((select published_at is not null from wa.versions where id=v),'Versão publicada');
 perform pg_temp.assert(exists(select 1 from wa.operations where action='relato_catalogo_prepared' and target=v::text),'Operação registrada');
 -- Menu: Proteção animal sai; colaborador e pedido de ajuda iguais; alertas igual, na posição 4.
 perform pg_temp.assert((select array_agg(key order by position) from wa.flows where version_id=v)=array['colaborador','relato','solicitacao','alertas'],'Menu com quatro itens');
 perform pg_temp.assert((select count(*) from wa.flows f join wa.flows o on o.key=f.key and o.version_id=v4
  where f.version_id=v and f.key in ('colaborador','solicitacao') and f.title=o.title and f.outputs=o.outputs and f.condition=o.condition and f.position=o.position)=2,'Fluxos existentes iguais');
 perform pg_temp.assert((select count(*) from wa.nodes n join wa.nodes o on o.flow=n.flow and o.key=n.key and o.version_id=v4 and o.definition=n.definition and o.position=n.position
  where n.version_id=v and n.flow in ('colaborador','solicitacao','alertas'))=(select count(*) from wa.nodes where version_id=v4 and flow in ('colaborador','solicitacao','alertas')),'Perguntas existentes iguais');
 perform pg_temp.assert((select f.title=o.title and f.outputs=o.outputs and f.position=4 from wa.flows f join wa.flows o on o.key=f.key and o.version_id=v4 where f.version_id=v and f.key='alertas'),'Alertas igual');
 perform pg_temp.assert((select f.title=o.title and f.button=o.button and f.intro=o.intro and f.position=o.position from wa.flows f join wa.flows o on o.key=f.key and o.version_id=v4 where f.version_id=v and f.key='relato'),'Relato mantém título, botão, aviso e posição');

 update wa.channels set version_id=v,enabled=true,outbound_enabled=true where id=c.id;

 -- Proteção animal: categoria e tipo por botão, localização do WhatsApp, sem foto.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'554499990201',v) returning id into s;
 insert into wa.inbox(channel_id,provider_id,contact,event,processed_at) values(c.id,'wamid.perfil','554499990201',jsonb_build_object('type','message','profile_name',' Maria Perfil '),now());
 perform pg_temp.send(s,pg_temp.menu(s,'relato'));
 -- Só categorias com tipo no município, na ordem do banco.
 perform pg_temp.assert(pg_temp.rotulos(s)=array['Chuva e alagamento','Vento e tempestade','Proteção animal'],'Categorias do catálogo: '||coalesce(pg_temp.rotulos(s)::text,'nenhuma'));
 perform pg_temp.escolher(s,'Proteção animal');
 perform pg_temp.assert(pg_temp.rotulos(s)=array['Animal perdido','Animal encontrado','Animal ferido','Maus-tratos'],'Tipos da categoria na ordem: '||coalesce(pg_temp.rotulos(s)::text,'nenhum'));
 -- Tipo de outra categoria não é aceito.
 r:=pg_temp.send(s,'alagamento');
 perform pg_temp.assert(r->>'text' like (select config->'errors'->>'choice' from wa.versions where id=v)||'%','Tipo de outra categoria recusado');
 r:=pg_temp.escolher(s,'Maus-tratos');
 perform pg_temp.assert(r->>'kind'='location' and (r->'messages'->-1->>'location_request')::boolean and jsonb_array_length(r->'buttons')=0,'Pergunta de local pede localização');
 -- Ponto fora do mundo é recusado.
 r:=wa.step(s,'{"location":{"latitude":"123","longitude":"-51.9"}}');
 perform pg_temp.assert(r->>'kind'='location' and r->>'text' like 'Não reconheci o local%','Ponto inválido recusado');
 r:=wa.step(s,'{"location":{"latitude":"-23.4205","longitude":"-51.9331","name":"Praça Central","address":"Rua das Flores, 10"}}');
 perform pg_temp.assert(r->>'kind'='photo','Depois do local, a foto');
 r:=pg_temp.button(s,'skip');
 perform pg_temp.assert(r->>'stage'='review' and r->>'text' like '%Tipo: Maus-tratos ou abandono%' and r->>'text' like '%Local: Praça Central, Rua das Flores, 10%'
  and r->>'text' like '%Categoria: Proteção animal%','Resumo com nomes do catálogo: '||(r->>'text'));
 r:=pg_temp.button(s,'confirm');
 perform pg_temp.assert(r->>'stage'='done' and r->>'text' like 'Relato recebido para triagem!%','Conclusão');
 d:=pg_temp.relato('554499990201');
 perform pg_temp.assert(d->>'tipo_id'='animal-maus-tratos' and d->>'categoria'='animal' and d->>'situacao'='Maus-tratos ou abandono' and d->>'tipo_nome'='Maus-tratos ou abandono'
  and d->>'visibilidade'='restrita' and d->>'lat'='-23.4205' and d->>'lng'='-51.9331' and d->>'endereco'='Praça Central, Rua das Flores, 10'
  and d->>'nome'='Maria Perfil' and d->>'status'='Em triagem' and d->>'origem'='WhatsApp','Relato de animal pelo catálogo: '||d::text);
 perform pg_temp.assert(exists(select 1 from wa.revisoes where relato_id=d->>'id' and state='pending'),'Relato de animal vai para a revisão');

 -- Chuva: escolha pelo número, endereço digitado, sem nome no perfil.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'554499990202',v) returning id into s;
 perform pg_temp.send(s,pg_temp.menu(s,'relato'));perform pg_temp.send(s,'1');
 perform pg_temp.assert(pg_temp.rotulos(s)=array['Alagamento','Rio ou córrego cheio'],'Tipos de chuva com botão curto');
 perform pg_temp.send(s,'2');perform pg_temp.send(s,'Rua Alagada, 5, Zona 7');
 r:=pg_temp.button(s,'skip');perform pg_temp.assert(r->>'text' like '%Tipo: Rio ou córrego transbordando%' and r->>'text' like '%Local: Rua Alagada, 5, Zona 7%','Resumo do relato de chuva');
 perform pg_temp.button(s,'confirm');
 d:=pg_temp.relato('554499990202');
 perform pg_temp.assert(d->>'tipo_id'='rio-transbordando' and d->>'categoria'='chuva' and d->>'situacao'='Rio ou córrego transbordando' and not d ? 'lat'
  and d->>'endereco'='Rua Alagada, 5, Zona 7' and d->>'nome'='Não informado','Relato de chuva: '||d::text);
 perform pg_temp.assert(not exists(select 1 from wa.revisoes where relato_id=d->>'id'),'Relato fora de animal não vai para a revisão de animais');

 -- O catálogo manda: tipo novo aparece sem versão nova; tipo arquivado some.
 insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','ocorrenciaTipos','deslizamento','{"id":"deslizamento","municipioId":"maringa","nome":"Deslizamento de terra","botao_whatsapp":"Deslizamento","categoria":"terra","prioridade":"Alta"}');
 update public.ma_cadastros set arquivado_em=now() where colecao='ocorrenciaTipos' and id='queda-de-arvore';
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'554499990203',v) returning id into s;
 perform pg_temp.send(s,pg_temp.menu(s,'relato'));
 perform pg_temp.assert(pg_temp.rotulos(s)=array['Chuva e alagamento','Desabamento e erosão','Proteção animal'],'Catálogo atualizado sem versão nova: '||pg_temp.rotulos(s)::text);

 -- Pelo caminho real: mensagens na caixa de entrada viram respostas na fila, com pedido de localização.
 update wa.channels set version_id=v where id=c.id;
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'w1','554499990204',jsonb_build_object('type','message','text','oi','timestamp',extract(epoch from now())::bigint::text)) returning id into i;
 perform pg_temp.assert(wa.ma_wa_processar(i),'Processa a primeira mensagem');
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'w2','554499990204',jsonb_build_object('type','message','text','2','timestamp',extract(epoch from now())::bigint::text)) returning id into i;
 perform wa.ma_wa_processar(i);
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'w3','554499990204',jsonb_build_object('type','message','text','1','timestamp',extract(epoch from now())::bigint::text)) returning id into i;
 perform wa.ma_wa_processar(i);
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'w4','554499990204',jsonb_build_object('type','message','text','1','timestamp',extract(epoch from now())::bigint::text)) returning id into i;
 perform wa.ma_wa_processar(i);
 select payload into m from wa.outbox where inbox_id=i order by sequence desc limit 1;
 perform pg_temp.assert((m->>'location_request')::boolean and m->'buttons'='[]'::jsonb and m->>'text' like 'Onde é?%','Saída pede localização: '||m::text);
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'w5','554499990204',jsonb_build_object('type','message','timestamp',extract(epoch from now())::bigint::text,
  'location',jsonb_build_object('latitude',-23.41,'longitude',-51.92))) returning id into i;
 perform pg_temp.assert(wa.ma_wa_processar(i),'Processa a localização');
 perform pg_temp.assert((select stage='question' and answers->'local'->>'lat'='-23.41' from wa.sessions where contact='554499990204'),'Localização gravada na conversa');

 -- O servidor recusa tipo desconhecido e ponto inválido, venha de onde vier.
 perform pg_temp.assert(pg_temp.erro($q$insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','relatos','r-x','{"id":"r-x","municipioId":"maringa","nome":"A","telefone":"44999990000","endereco":"Rua","tipo_id":"nao-existe"}')$q$) like 'Tipo de ocorrência desconhecido%','Tipo desconhecido recusado');
 perform pg_temp.assert(pg_temp.erro($q$insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','relatos','r-y','{"id":"r-y","municipioId":"maringa","nome":"A","telefone":"44999990000","endereco":"Rua","tipo_id":"alagamento","lat":"abc","lng":"1"}')$q$) like 'Ponto inválido%','Ponto inválido recusado');
 -- Relato sem tipo (Gestão, versões anteriores) segue como antes.
 perform pg_temp.assert(pg_temp.erro($q$insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','relatos','r-z','{"id":"r-z","municipioId":"maringa","nome":"A","telefone":"44999990000","endereco":"Rua"}')$q$) is null,'Relato sem tipo aceito');
 perform pg_temp.assert((select not (dados ? 'tipo_nome' or dados ? 'categoria') from public.ma_cadastros where colecao='relatos' and id='r-z'),'Relato sem tipo inalterado');
end $test$;

-- Publicação recusa pergunta de catálogo malformada.
do $pub$
declare v uuid;
begin
 insert into wa.versions(name,config) select 'teste-catalogo-invalido',config from wa.versions where name='municipal-v5-relato-catalogo' returning id into v;
 insert into wa.flows(version_id,key,position,title,button,intro,condition,outputs) values(v,'x',1,'X','X','','{}','[]');
 insert into wa.nodes values(v,'x','tipo',1,'{"label":"Tipo","question":"Tipo?","kind":"single","required":true,"catalog":{"source":"tipos","answer":"categoria"}}');
 perform pg_temp.assert(pg_temp.erro(format('select wa.publish(%L)',v)) like 'Condition references missing or future answer%','Tipo sem categoria antes é recusado');
 delete from wa.nodes where version_id=v;
 insert into wa.nodes values(v,'x','local',1,'{"label":"Local","question":"Onde?","kind":"location","required":false}');
 perform pg_temp.assert(pg_temp.erro(format('select wa.publish(%L)',v)) like 'Location question must be required%','Local opcional é recusado');
end $pub$;
rollback;
