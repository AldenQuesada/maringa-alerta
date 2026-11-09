-- Executar apenas no PostgreSQL descartável. Inclui fila real, sem chamar a Meta.
begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',msg;end if;end$$;
grant execute on function pg_temp.assert(boolean,text) to authenticated,anon,service_role;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
grant execute on function pg_temp.send(uuid,text) to authenticated,anon,service_role;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare b text;begin
 select x->>'id' into strict b from wa.sessions q,jsonb_array_elements(wa.render(q)->'buttons') x where q.id=s and x->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',b));end$$;
grant execute on function pg_temp.button(uuid,text) to authenticated,anon,service_role;
update wa.channels set version_id=(select id from wa.versions where name='municipal-v2-canonico'),enabled=true,outbound_enabled=true;
do $test$
declare c wa.channels;s uuid;r jsonb;rid bigint;first_id uuid;delivery jsonb;photo jsonb:='{"path":"test/photo.jpg","mime":"image/jpeg"}';before_count integer;
begin
 select * into strict c from wa.channels;
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'550000009999',c.version_id) returning id into s;
 r:=pg_temp.send(s,'Oi');perform pg_temp.assert(r->>'text' like 'Olá! Bem-vindo%' and r->>'text' not like '%Escolha uma opção do menu%','Greeting is canonical, without error');
 r:=pg_temp.send(s,'1');perform pg_temp.assert(r->'messages'->0->'image'->>'mime_type'='image/png','Pra Somar image in database response');
 perform pg_temp.assert(r->>'text' like 'Programa de Apoio Social%' and r->>'text' not like '%Qual é seu nome?%','Presentation replaces duplicate name question');
 r:=pg_temp.send(s,'');perform pg_temp.assert(not exists(select 1 from jsonb_array_elements(r->'messages') m where m ? 'image'),'Invalid name does not resend image');
 perform pg_temp.send(s,'Pessoa Teste');perform pg_temp.send(s,'2');perform pg_temp.send(s,'Rua Teste, 10');
 r:=pg_temp.send(s,'554499999999999');perform pg_temp.assert(r->>'text' like 'Informe um telefone válido com DDD.%','Phone bounds match simulator');
 perform pg_temp.send(s,'44999990000');
 r:=pg_temp.send(s,'0,1');perform pg_temp.assert(r->>'text' like 'A opção 0%','Exclusive zero');
 r:=pg_temp.send(s,'999');perform pg_temp.assert(r->>'text' like 'Escolha apenas números da lista%','Out-of-range answer');
 r:=pg_temp.send(s,'abc');perform pg_temp.assert(r->>'text' like 'Digite somente os números%','Invalid multiselect');
 perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');
 r:=pg_temp.send(s,'2');perform pg_temp.assert((select stage='question' and position=5 from wa.sessions where id=s),'No offer returns to collaboration question before review');
 perform pg_temp.assert(r->>'text' like 'Selecione pelo menos um tipo de colaboração%','Canonical no-offer explanation');
 perform pg_temp.send(s,'3');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');r:=pg_temp.send(s,'2');
 perform pg_temp.assert(r->>'stage'='review' and r->>'text' not like '%Máquinas e equipamentos:%','Review omits empty optional answers');
 r:=pg_temp.button(s,'correct');perform pg_temp.assert(r->>'text' like 'Vamos revisar suas respostas.%' and r->'messages'->0->>'text'=r->>'text','Correction copy reaches transport');
 perform pg_temp.assert(r->>'text' not like '%Programa de Apoio Social%','Correction asks name without repeating presentation');
 -- Report with actual private-storage metadata.
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'550000009998',c.version_id) returning id into s;
 r:=pg_temp.send(s,'2');perform pg_temp.assert(jsonb_array_length(r->'messages')=2 and r->'messages'->1->>'text'='Qual é seu nome?','Safety intro and question remain separate messages');
 perform pg_temp.send(s,'Pessoa Relato');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Rua Relato, 8');perform pg_temp.send(s,'4');perform pg_temp.button(s,'skip');
 r:=wa.step(s,jsonb_build_object('media',photo));perform pg_temp.assert(r->>'stage'='review' and r->>'text' like '%Fotografia: Imagem anexada%','Photo reviewed canonically');
 r:=pg_temp.button(s,'confirm');perform pg_temp.assert(r->>'text' like '%Foto anexada com sucesso.%','Photo completion truthful');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where colecao='relatos' and dados->'foto'=photo),'Photo metadata persisted privately');
 -- Provider inbox builds image first, then text, and replay never duplicates either.
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','wamid.canonical-image','from','550000009997','timestamp',extract(epoch from now())::bigint::text,'text','1')));
 select id into rid from wa.inbox where provider_id='wamid.canonical-image';
 perform pg_temp.assert(public.ma_wa_processar(rid),'Image turn processed');
 perform pg_temp.assert((select count(*)=2 from wa.outbox where inbox_id=rid),'Image and body queued once');
 perform pg_temp.assert((select payload->'image'->>'caption'='Pra Somar · Mobilização voluntária' from wa.outbox where inbox_id=rid and sequence=1),'Image caption sourced from catalog');
 perform pg_temp.assert((select payload->>'text' like 'Programa de Apoio Social%' from wa.outbox where inbox_id=rid and sequence=2),'Body after image');
 perform pg_temp.assert(not public.ma_wa_processar(rid),'Inbox replay rejected');
 delivery:=public.ma_wa_reservar();first_id:=(delivery->>'id')::uuid;
 perform pg_temp.assert(delivery->'payload' ? 'image','Image claimed first');
 perform pg_temp.assert(public.ma_wa_reservar() is null,'Body waits for previous image delivery result');
 perform public.ma_wa_resultado(first_id,(delivery->>'lease')::uuid,'sent','wamid.image-result');
 delivery:=public.ma_wa_reservar();perform pg_temp.assert(not delivery->'payload' ? 'image','Text follows accepted image');
end $test$;
rollback;
