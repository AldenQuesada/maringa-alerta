-- Contratos executados somente em PostgreSQL descartável. Nenhuma fixture em produção.
begin;
update wa.channels set version_id=(select id from wa.versions where name='municipal-v2-canonico');
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare id text;begin
 select b->>'id' into strict id from wa.sessions x,jsonb_array_elements(wa.render(x)->'buttons') b where x.id=s and b->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',id));end$$;
do $test$
declare c wa.channels;s uuid;r jsonb;old_button text;n integer;rev bigint;inbox bigint;delivery jsonb;other uuid;
begin
 select * into strict c from wa.channels;
 perform pg_temp.assert(not c.enabled,'Channel must be disabled at installation');
 perform pg_temp.assert((select count(*)=3 from wa.flows where version_id=c.version_id),'Three flows');
 perform pg_temp.assert((select count(*)=29 from wa.nodes where version_id=c.version_id),'29 questions');
 begin update wa.nodes set definition=definition||'{"question":"x"}';raise exception 'immutability failed';exception when raise_exception then if sqlerrm='immutability failed' then raise;end if;end;
 update wa.channels set enabled=true,outbound_enabled=true where id=c.id;
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'550000000001',c.version_id) returning id into s;
 perform pg_temp.send(s,'3');
 select revision||':choice:1' into old_button from wa.sessions where id=s;
 perform pg_temp.send(s,'Pessoa Teste');perform pg_temp.send(s,'Rua Teste, 10');
 r:=pg_temp.send(s,'123');perform pg_temp.assert(r->>'stage'='question' and r->>'text' like '%telefone%','Invalid phone must not advance');
 perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Preciso de alimentos');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Request review');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'stage'='done','Request completion');
 perform wa.step(s,jsonb_build_object('button',old_button));
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
 -- Correction removes no-longer-applicable data, preserving other canonical fields.
 perform pg_temp.button(s,'restart');perform pg_temp.send(s,'1');perform pg_temp.send(s,'Colaborador Teste');perform pg_temp.send(s,'1');perform pg_temp.send(s,'Rua Nova, 5');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'3');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'2');
 perform pg_temp.assert((select stage='review' and not answers?'outros' and not answers?'ponto_nome' from wa.sessions where id=s),'Conditional cleanup');
 perform pg_temp.button(s,'correct');perform pg_temp.send(s,'Nome Corrigido');perform pg_temp.send(s,'1');perform pg_temp.send(s,'Rua Nova, 6');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'3');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'2');perform pg_temp.button(s,'confirm');
 perform pg_temp.assert((select count(*)=1 from public.ma_cadastros where colecao='voluntarios'),'Same verified sender updates own volunteer');
 -- Same typed phone from a different verified sender must not overwrite identity.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'550000000002',c.version_id) returning id into other;
 perform pg_temp.send(other,'1');perform pg_temp.send(other,'Outra Pessoa');perform pg_temp.send(other,'1');perform pg_temp.send(other,'Outro endereço');perform pg_temp.send(other,'44999990000');perform pg_temp.send(other,'3');perform pg_temp.send(other,'0');perform pg_temp.send(other,'0');perform pg_temp.send(other,'0');perform pg_temp.send(other,'2');perform pg_temp.button(other,'confirm');
 perform pg_temp.assert((select count(*)=2 from public.ma_cadastros where colecao='voluntarios'),'Typed phone cannot merge senders');
 -- Inbox replay and outbox lease/unknown outcome.
 r:=jsonb_build_array(jsonb_build_object('type','message','id','wamid.test','from','550000000003','timestamp',extract(epoch from now())::bigint::text,'text','Oi'));
 perform public.ma_wa_receber(c.phone_number_id,r);perform public.ma_wa_receber(c.phone_number_id,r);
 perform pg_temp.assert((select count(*)=1 from wa.inbox),'Inbox idempotency');
 select id into inbox from wa.inbox;perform pg_temp.assert(public.ma_wa_processar(inbox),'Inbox processing');perform pg_temp.assert(not public.ma_wa_processar(inbox),'Repeated processing rejected');
 delivery:=public.ma_wa_reservar();perform pg_temp.assert(delivery is not null,'Outbox claim');
 perform public.ma_wa_resultado((delivery->>'id')::uuid,gen_random_uuid(),'sent','fake');
 perform pg_temp.assert((select state='sending' from wa.outbox where id=(delivery->>'id')::uuid),'Lease fencing');
 perform public.ma_wa_resultado((delivery->>'id')::uuid,(delivery->>'lease')::uuid,'uncertain',null,'timeout');
 perform pg_temp.assert(public.ma_wa_reservar() is null,'Unknown outcomes are not blindly retried');
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','status','id','wamid.sent','timestamp',extract(epoch from now())::bigint::text,'status','read','outbox_id',delivery->>'id')));
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','status','id','wamid.sent','timestamp',extract(epoch from now())::bigint::text,'status','sent','outbox_id',delivery->>'id')));
 perform pg_temp.assert((select state='read' from wa.outbox where id=(delivery->>'id')::uuid),'Delivery status is monotonic');
end $test$;
-- API role boundaries and simulation isolation.
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-0000-0000-000000000991','wa-test@example.invalid',now());
insert into public.ma_vinculos values('maringa','00000000-0000-0000-0000-000000000991','operador');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000991',true);
set local role authenticated;
do $test$ declare r jsonb;c uuid;req uuid:=gen_random_uuid();s uuid;begin
 c:=(public.ma_wa_canais()->0->>'id')::uuid;
 r:=public.ma_wa_simular(c,req);s:=(r->>'session_id')::uuid;
 perform pg_temp.assert(public.ma_wa_simular(c,req)=r,'Simulation request idempotency');
 begin perform public.ma_wa_receber('1','[]');raise exception 'role bypass';exception when insufficient_privilege then null;end;
 begin perform 1 from wa.sessions;raise exception 'table exposed';exception when insufficient_privilege then null;end;
end $test$;
reset role;
do $test$ declare s uuid;before_count integer;begin
 select id into s from wa.sessions where simulation;select count(*) into before_count from public.ma_cadastros;
 perform pg_temp.send(s,'3');perform pg_temp.send(s,'Simulação');perform pg_temp.send(s,'Endereço fictício');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Teste');perform pg_temp.button(s,'confirm');
 perform pg_temp.assert((select count(*)=before_count from public.ma_cadastros),'Simulation never writes canonical records');
 perform pg_temp.assert(not exists(select 1 from wa.outbox where session_id=s),'Simulation never sends WhatsApp');
end $test$;
rollback;
