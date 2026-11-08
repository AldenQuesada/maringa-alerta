-- Contratos executados somente em PostgreSQL descartável. Nenhuma fixture em produção.
begin;
update wa.channels set version_id=(select id from wa.versions where name='municipal-v2-canonico');
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare id text;begin
 select b->>'id' into strict id from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') b where x.id=s and b->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',id));end$$;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000095','purge-test@example.invalid');
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000095','admin');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000095',true);
do $test$
declare c wa.channels;s uuid;r jsonb;rid bigint;oid uuid;v text;ids text[];job jsonb;
begin
 select * into strict c from wa.channels;update wa.channels set enabled=true,outbound_enabled=true;
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'550000000001',c.version_id) returning id into s;
 perform pg_temp.send(s,'3');

 perform pg_temp.send(s,'Pessoa Teste');perform pg_temp.send(s,'Rua Teste, 10');
 r:=pg_temp.send(s,'123');perform pg_temp.assert(r->>'stage'='question' and r->>'text' like '%telefone%','Invalid phone must not advance');
 perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Preciso de alimentos');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Request review');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Request completion');

 perform pg_temp.assert((select count(*)=1 from wa.completions where session_id=s),'Duplicate confirmation cannot duplicate record');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where dados->>'nome'='Pessoa Teste' and colecao='solicitacoes' and dados->>'status'='Aguardando'),'Canonical request');
 perform pg_temp.button(s,'restart');perform pg_temp.send(s,'2');perform pg_temp.send(s,'Relator Teste');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Rua Relato, 2');
 r:=pg_temp.send(s,'1,4');perform pg_temp.assert(r->>'text' like '%não pode ser combinada%','Exclusive vulnerable group');
 perform pg_temp.send(s,'1,3');perform pg_temp.button(s,'skip');perform pg_temp.button(s,'skip');perform pg_temp.button(s,'confirm');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where dados->>'nome'='Relator Teste' and dados->'pessoas_no_local'='["CRIANÇA / ADOLESCENTE","PCD"]' and colecao='relatos'),'Canonical report');
 perform pg_temp.button(s,'restart');perform pg_temp.send(s,'1');perform pg_temp.send(s,'Colaborador Teste');perform pg_temp.send(s,'1');perform pg_temp.send(s,'Rua Colaborador, 5');perform pg_temp.send(s,'44999990000');
 perform pg_temp.send(s,'1,12');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');
 perform pg_temp.assert((select position=8 from wa.sessions where id=s),'OUTRO conditional');
 perform pg_temp.send(s,'Apoio logístico');perform pg_temp.send(s,'0');
 perform pg_temp.assert((select position=10 from wa.sessions where id=s),'Goods delivery conditional');
 perform pg_temp.send(s,'2');perform pg_temp.send(s,'1');perform pg_temp.send(s,'1');perform pg_temp.send(s,'Ponto Teste');perform pg_temp.send(s,'Responsável Teste');perform pg_temp.send(s,'Rua Ponto, 9');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Água');perform pg_temp.button(s,'skip');
 r:=pg_temp.send(s,'-4');perform pg_temp.assert(r->>'stage'='question','Capacity cannot be negative');perform pg_temp.send(s,'50');
 perform pg_temp.button(s,'confirm');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where colecao='bases' and dados->>'nome'='Ponto Teste' and dados->'consentimento_publicacao'='true'),'Consented point in canonical table');
 perform pg_temp.assert((select count(*)=3 from wa.completions where session_id=s),'All three flows persisted');

 select array_agg(record_id) into ids from wa.contact_owned_records where session_id=s;
 perform pg_temp.assert(array_length(ids,1)=4,'All three flows and public point have cascade ownership');
 select record_id into v from wa.contact_owned_records where session_id=s and collection='voluntarios';
 insert into public.ma_cadastros(municipio_id,colecao,id,dados)
 select municipio_id,colecao,'external',dados||jsonb_build_object('id','external','telefone','44988881111') from public.ma_cadastros where colecao='solicitacoes' and id=any(ids);
 update public.ma_cadastros set dados=dados||jsonb_build_object('status','Encaminhada','atribuido_a',v,'necessidade',
 (select rule.key from public.ma_configuracao cfg,jsonb_each(cfg.documento->'compatibilidade') rule,public.ma_cadastros person
 where cfg.id='operacao' and person.id=v and person.colecao='voluntarios'
 and exists(select 1 from jsonb_array_elements_text(rule.value) opt where person.dados->'ajudas' ? opt) limit 1)) where id='external' and colecao='solicitacoes';
 r:=public.ma_contato_detalhe(c.municipio_id,'s:'||s);
 begin perform public.ma_contato_excluir(c.municipio_id,'s:'||s,'delete-v1:'||(r->'contact'->>'revision'));raise exception 'Deleted external ownership';exception when foreign_key_violation then null;end;
 perform pg_temp.assert((select count(*)=4 from wa.contact_owned_records where session_id=s),'Rejected purge rolls back all records');
 delete from public.ma_cadastros where id='external' and colecao='solicitacoes';
 insert into public.ma_cadastros(municipio_id,colecao,id,dados) select municipio_id,colecao,'external',dados||jsonb_build_object('id','external','telefone','44988881111') from public.ma_cadastros where colecao='solicitacoes' and id=any(ids);
 insert into wa.inbox(channel_id,provider_id,contact,event,processed_at) values(c.id,'purge.photo','550000000001',jsonb_build_object('timestamp',extract(epoch from now())::bigint::text,'image','{"id":"12"}'::jsonb),now()) returning id into rid;
 update wa.inbox set media=jsonb_build_object('bucket','ma-whatsapp','path',c.id||'/'||rid||'.jpg') where id=rid;
 insert into wa.outbox(inbox_id,sequence,session_id,payload,state,provider_id) values(rid,1,s,'{"text":"Conteúdo a apagar"}','sent','purge.sent') returning id into oid;
 insert into wa.delivery_events values('purge.sent','read',now(),oid,null);
 perform pg_temp.assert(private.ma_wa_ler_foto(c.id||'/'||rid||'.jpg'),'Photo authorized before purge');
 r:=public.ma_contato_detalhe(c.municipio_id,'s:'||s);
 begin perform public.ma_contato_excluir(c.municipio_id,'s:'||s,r->'contact'->>'revision');raise exception 'Old UI performed irreversible deletion';exception when serialization_failure then null;end;
 perform public.ma_contato_excluir(c.municipio_id,'s:'||s,'delete-v1:'||(r->'contact'->>'revision'));
 perform pg_temp.assert(not exists(select 1 from public.ma_cadastros where id=any(ids)),'Every owned registration physically deleted');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where id='external'),'Other contact preserved');
 perform pg_temp.assert(not exists(select 1 from private.ma_historico where registro_id=any(ids)),'All private historical copies removed');
 perform pg_temp.assert(not exists(select 1 from wa.contact_owned_records where session_id=s),'Ownership rows cascaded');
 perform pg_temp.assert(not exists(select 1 from wa.contact_history where session_id=s),'Restart answers cascaded');
 perform pg_temp.assert(not exists(select 1 from wa.delivery_events where outbox_id=oid),'Delivery state cascaded');
 perform pg_temp.assert(not private.ma_wa_ler_foto(c.id||'/'||rid||'.jpg'),'No new signed URL after purge');
 perform pg_temp.assert((select count(*)=2 from wa.media_deletions),'Private photo paths queued; institutional logo untouched');
 perform pg_temp.assert(public.ma_wa_midia_excluir_reservar() is null,'Cleanup waits for any old upload');
 update wa.media_deletions set available_at=now();
 job:=public.ma_wa_midia_excluir_reservar();
 perform public.ma_wa_midia_excluir_resultado((job->>'id')::uuid,gen_random_uuid(),true);
 perform pg_temp.assert((select count(*)=2 from wa.media_deletions),'Wrong cleanup lease cannot acknowledge');
 perform public.ma_wa_midia_excluir_resultado((job->>'id')::uuid,(job->>'lease')::uuid,true);
 perform pg_temp.assert((select count(*)=1 from wa.media_deletions),'Completed cleanup forgets private path');
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','brand.new','from','550000000001','timestamp',extract(epoch from now())::bigint::text,'text','Oi')));
 perform pg_temp.assert(exists(select 1 from wa.sessions where contact='550000000001' and id<>s and answers='{}' and stage='menu'),'Same number starts completely new registration');
end $test$;
select pg_temp.assert(not has_function_privilege('authenticated','wa.ma_wa_midia_excluir_reservar()','execute'),'Cleanup is server-only');
rollback;
