-- Cadastro para receber alertas pelo WhatsApp. Somente em PostgreSQL descartável; tudo é desfeito no fim.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare id text;begin
 select b->>'id' into strict id from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') b where x.id=s and b->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',id));end$$;
create function pg_temp.menu(s uuid,fluxo text) returns text language sql as $$
 select position::text from wa.flows where version_id=(select version_id from wa.sessions where id=s) and key=fluxo$$;
create function pg_temp.inscrito(contato text) returns jsonb language sql as $$
 select dados from public.ma_cadastros where colecao='inscritos' and dados->>'telefone'=contato$$;

insert into public.ma_cadastros(municipio_id,colecao,id,dados) values
 ('maringa','bairros','b-alvorada','{"id":"b-alvorada","municipioId":"maringa","nome":"Jardim Alvorada"}'),
 ('maringa','bairros','b-esperanca','{"id":"b-esperanca","municipioId":"maringa","nome":"Vila Esperança I"}'),
 ('maringa','bairros','b-zona7','{"id":"b-zona7","municipioId":"maringa","nome":"Zona 7"}');

do $test$
declare c wa.channels;v uuid;s uuid;r jsonb;d jsonb;
begin
 select * into strict c from wa.channels;
 select id into strict v from wa.versions where name='municipal-v4-alertas';
 -- Preparação apenas: a migração não troca a versão do canal.
 perform pg_temp.assert(c.version_id<>v,'Canal não pode mudar de versão na migração');
 perform pg_temp.assert((select published_at is not null from wa.versions where id=v),'Versão publicada');
 perform pg_temp.assert(exists(select 1 from wa.operations where action='alertas_flow_prepared' and target=v::text),'Operação registrada');
 -- Fluxos anteriores copiados sem alteração.
 perform pg_temp.assert((select count(*) from wa.flows f join wa.flows o on o.key=f.key and o.version_id=(select id from wa.versions where name='municipal-v3-animal')
  where f.version_id=v and f.title=o.title and f.outputs=o.outputs and f.condition=o.condition and f.position=o.position)=4,'Quatro fluxos existentes iguais');
 perform pg_temp.assert((select count(*) from wa.nodes where version_id=v and flow<>'alertas')=(select count(*) from wa.nodes where version_id=(select id from wa.versions where name='municipal-v3-animal')),'Perguntas existentes copiadas');

 update wa.channels set version_id=v,enabled=true,outbound_enabled=true where id=c.id;

 -- Cadastro: nome e bairro, uma vez. O servidor liga o bairro digitado ao cadastrado.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'554499990101',v) returning id into s;
 perform pg_temp.send(s,pg_temp.menu(s,'alertas'));perform pg_temp.send(s,'1');
 perform pg_temp.send(s,'Maria Teste');perform pg_temp.send(s,'jd. alvorada');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Revisão do cadastro');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Conclusão do cadastro');
 d:=pg_temp.inscrito('554499990101');
 perform pg_temp.assert(d->>'nome'='Maria Teste' and d->>'bairro_id'='b-alvorada' and (d->>'ativo')::boolean and d->>'entrou_em' is not null,'Inscrito ativo com bairro ligado');

 -- Saída: o item do menu, "Parar de receber" e a confirmação. O cadastro continua, inativo, com o bairro.
 perform pg_temp.button(s,'restart');
 perform pg_temp.send(s,pg_temp.menu(s,'alertas'));perform pg_temp.send(s,'2');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Saída sem outras perguntas');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Conclusão da saída');
 d:=pg_temp.inscrito('554499990101');
 perform pg_temp.assert(not (d->>'ativo')::boolean and d->>'saiu_em' is not null and d->>'bairro_id'='b-alvorada','Inscrito inativo, bairro preservado');
 perform pg_temp.assert((select count(*) from public.ma_cadastros where colecao='inscritos')=1,'Um cadastro por contato');

 -- Voltar a receber reativa o mesmo cadastro.
 perform pg_temp.button(s,'restart');
 perform pg_temp.send(s,pg_temp.menu(s,'alertas'));perform pg_temp.send(s,'1');
 perform pg_temp.send(s,'Maria Teste');perform pg_temp.send(s,'VILA ESPERANCA I');
 r:=pg_temp.button(s,'confirm');
 d:=pg_temp.inscrito('554499990101');
 perform pg_temp.assert((d->>'ativo')::boolean and d->>'saiu_em' is null and d->>'bairro_id'='b-esperanca','Reativado com bairro novo');
 perform pg_temp.assert((select count(*) from public.ma_cadastros where colecao='inscritos')=1,'Continua um cadastro por contato');

 -- Bairro não reconhecido: o cadastro vale, sem bairro ligado, e a pessoa não é questionada de novo.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'554499990102',v) returning id into s;
 perform pg_temp.send(s,pg_temp.menu(s,'alertas'));perform pg_temp.send(s,'1');
 perform pg_temp.send(s,'João Teste');perform pg_temp.send(s,'Bairro Inexistente');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Conclusão sem bairro reconhecido');
 d:=pg_temp.inscrito('554499990102');
 perform pg_temp.assert((d->>'ativo')::boolean and d->'bairro_id'='null'::jsonb and d->>'bairro'='Bairro Inexistente','Bairro pendente para a gestão');

 -- As outras coleções continuam fora do alcance da gravação pelo WhatsApp.
 perform pg_temp.assert(position('''inscritos''' in pg_get_functiondef('wa.project(wa.sessions)'::regprocedure))>0 and
  position('''alertas''' in pg_get_functiondef('wa.project(wa.sessions)'::regprocedure))=0,'Lista de coleções do motor só ganhou inscritos');
end $test$;

-- Telefones de cidadãos: as mesmas permissões dos voluntários, papel por papel.
select pg_temp.assert((select array_agg(row(papel,ler,gravar,excluir)::text order by papel) from private.ma_permissoes where colecao='inscritos')
 =(select array_agg(row(papel,ler,gravar,excluir)::text order by papel) from private.ma_permissoes where colecao='voluntarios'),'Permissões iguais às dos voluntários');
rollback;
