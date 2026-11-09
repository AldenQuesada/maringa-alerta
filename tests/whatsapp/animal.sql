-- Fluxo "animal" do WhatsApp. Somente em PostgreSQL descartável; tudo é desfeito no fim.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare id text;begin
 select b->>'id' into strict id from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') b where x.id=s and b->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',id));end$$;
create function pg_temp.menu(s uuid) returns text language sql as $$
 select position::text from wa.flows where version_id=(select version_id from wa.sessions where id=s) and key='animal'$$;

insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000091','admin-wa-animal@invalid.example',now());
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000091','admin');

do $test$
declare c wa.channels;v uuid;anterior uuid;s uuid;r jsonb;d jsonb;
begin
 select * into strict c from wa.channels;
 select id into strict v from wa.versions where name='municipal-v3-animal';
 anterior:=c.version_id;
 -- Preparação apenas: a migração não troca a versão do canal.
 perform pg_temp.assert(c.version_id<>v,'Canal não pode mudar de versão na migração');
 perform pg_temp.assert((select published_at is not null from wa.versions where id=v),'Versão publicada');
 perform pg_temp.assert(exists(select 1 from wa.operations where action='animal_flow_prepared' and target=v::text),'Operação registrada');
 -- Fluxos anteriores copiados sem alteração.
 perform pg_temp.assert((select count(*) from wa.flows f join wa.flows o on o.key=f.key and o.version_id=(select id from wa.versions where name='municipal-v2-canonico')
  where f.version_id=v and f.title=o.title and f.outputs=o.outputs and f.condition=o.condition)=3,'Três fluxos existentes iguais');
 perform pg_temp.assert((select count(*) from wa.nodes where version_id=v and flow<>'animal')=(select count(*) from wa.nodes where version_id=(select id from wa.versions where name='municipal-v2-canonico')),'Perguntas existentes copiadas');
 -- As situações do fluxo batem com o modelo de tipos do banco.
 perform pg_temp.assert((select array_agg(o->>'value' order by o->>'value') from wa.nodes n,jsonb_array_elements(n.definition->'options') o where n.version_id=v and n.flow='animal' and n.key='situacao')
  =(select array_agg(t->>'situacao_whatsapp' order by t->>'situacao_whatsapp') from public.ma_configuracao m,jsonb_array_elements(m.documento->'protecao-animal'->'tipos') t where m.id='modelos'),'Situações iguais ao modelo');

 -- Tipos instalados pela prefeitura (caminho canônico, como administrador).
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
 set local role authenticated;
 perform public.ma_instalar_protecao_animal('maringa');
 reset role;
 perform set_config('request.jwt.claim.sub','',true);

 update wa.channels set version_id=v,enabled=true,outbound_enabled=true where id=c.id;

 -- Relato identificado: perdido, público.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'554499990001',v) returning id into s;
 perform pg_temp.send(s,pg_temp.menu(s));
 perform pg_temp.send(s,'1');perform pg_temp.send(s,'1');
 perform pg_temp.send(s,'Rua das Palmeiras, 50, Zona 7');perform pg_temp.send(s,'Caramelo, porte médio, coleira azul');
 perform pg_temp.button(s,'skip');
 perform pg_temp.send(s,'1');perform pg_temp.send(s,'Tutora Teste');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Revisão do relato identificado');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Conclusão do relato identificado');
 select dados into strict d from public.ma_cadastros where colecao='relatos' and dados->>'nome'='Tutora Teste';
 perform pg_temp.assert(d->>'categoria'='animal' and d->>'situacao'='Perdi meu animal' and d->>'especie'='Cão' and d->>'status'='Em triagem','Relato canônico');
 perform pg_temp.assert(d->>'visibilidade'='publica' and d->>'telefone'='554499990001' and (d->>'anonimo')::boolean=false,'Visibilidade e telefone do contato');

 -- Denúncia anônima de maus-tratos: sem pergunta de nome, restrita.
 perform pg_temp.button(s,'restart');
 perform pg_temp.send(s,pg_temp.menu(s));
 perform pg_temp.send(s,'4');perform pg_temp.send(s,'2');
 perform pg_temp.send(s,'Rua Teste, 9, Jardim Alvorada');perform pg_temp.send(s,'Gato preso sem água no quintal');
 perform pg_temp.button(s,'skip');
 perform pg_temp.send(s,'2');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Anônimo pula a pergunta de nome');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Conclusão da denúncia');
 perform pg_temp.assert(r::text like '%sigilo%','Mensagem final do fluxo animal');
 select dados into strict d from public.ma_cadastros where colecao='relatos' and dados->>'situacao'='Maus-tratos ou abandono';
 perform pg_temp.assert(d->>'nome'='Anônimo' and (d->>'anonimo')::boolean and d->>'visibilidade'='restrita','Denúncia anônima restrita');
 perform pg_temp.assert((select count(*) from public.ma_cadastros where colecao='relatos' and dados->>'categoria'='animal')=2,'Um registro por conclusão');

 -- Resposta fora da lista não avança.
 perform pg_temp.button(s,'restart');
 perform pg_temp.send(s,pg_temp.menu(s));
 r:=pg_temp.send(s,'9');perform pg_temp.assert((select position=1 from wa.sessions where id=s),'Situação inválida não avança');

 perform pg_temp.assert(anterior is not null,'Versão anterior conhecida');
end $test$;
rollback;
