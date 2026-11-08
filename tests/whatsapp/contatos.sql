-- Exclusivamente no banco descartável: filas reais, sem chamadas à Meta.
begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',msg;end if;end$$;
create function pg_temp.send(s uuid,t text) returns jsonb language sql as $$select wa.step(s,jsonb_build_object('text',t))$$;
create function pg_temp.button(s uuid,action text) returns jsonb language plpgsql as $$declare b text;begin
 select x->>'id' into strict b from wa.sessions q,jsonb_array_elements(wa.render(q)->'buttons') x where q.id=s and x->>'id' like '%:'||action;
 return wa.step(s,jsonb_build_object('button',b));end$$;
insert into private.ma_permissoes(papel,colecao,ler,gravar,excluir) values ('leitor','voluntarios',true,false,false),('leitor','solicitacoes',true,false,false),('leitor','relatos',true,false,false);
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000091','pipeline-admin@example.invalid'),('00000000-0000-4000-8000-000000000092','pipeline-reader@example.invalid');
insert into public.ma_vinculos(municipio_id,user_id,papel) select id,'00000000-0000-4000-8000-000000000091','admin' from public.ma_prefeituras;
insert into public.ma_vinculos(municipio_id,user_id,papel) select id,'00000000-0000-4000-8000-000000000092','leitor' from public.ma_prefeituras;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
update wa.channels set version_id=(select id from wa.versions where name='municipal-v2-canonico'),enabled=true,outbound_enabled=true;
do $test$
declare c wa.channels;s uuid;r jsonb;v jsonb;rid bigint;n integer;delivery jsonb;arch timestamptz;confirmed text;
begin
 select * into strict c from wa.channels;
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','pipeline.first','from','550000001111','timestamp',extract(epoch from now())::bigint::text,'text','oi','profile_name','Nome do perfil')));
 select id into strict s from wa.sessions where contact='550000001111';
 r:=public.ma_contatos_listar(c.municipio_id);perform pg_temp.assert(r->>'total'='1' and r->'items'->0->>'stage_label'='Aguardando triagem','First oi visible before processing');
 perform pg_temp.assert(r->'items'->0->>'name'='Nome do perfil' and r->'items'->0->>'name_source'='profile','Profile provenance');
 perform pg_temp.assert((public.ma_contatos_listar(c.municipio_id,'','untriaged')->>'total')='1','Pretriage filter');
 perform pg_temp.assert(not exists(select 1 from public.ma_cadastros where colecao='voluntarios'),'No fabricated volunteer');
 select id into rid from wa.inbox where provider_id='pipeline.first';perform public.ma_wa_processar(rid);
 perform pg_temp.send(s,'1');perform pg_temp.send(s,'Nome declarado');
 r:=public.ma_contato_detalhe(c.municipio_id,'s:'||s);perform pg_temp.assert(r->'contact'->>'name'='Nome declarado' and r->'contact'->>'stage'='identity','Incremental identity');
 perform pg_temp.assert(r->'contact'->>'answered'='1','Accepted answers progress');
 perform pg_temp.send(s,'INVALID');r:=public.ma_contato_detalhe(c.municipio_id,'s:'||s);perform pg_temp.assert(r->'contact'->>'answered'='1','Invalid input cannot advance progress');
 perform pg_temp.send(s,'1');perform pg_temp.send(s,'Rua Teste, 10');perform pg_temp.send(s,'44999990000');
 perform pg_temp.send(s,'3');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'0');perform pg_temp.send(s,'2');
 perform pg_temp.assert((select stage='review' from wa.sessions where id=s),'Collaborator reaches review');
 perform pg_temp.button(s,'confirm');
 r:=public.ma_contatos_listar(c.municipio_id);perform pg_temp.assert(r->>'total'='1' and r->'items'->0->>'stage'='done','Confirmation reuses same row');
 confirmed:=r->'items'->0->>'record_id';perform pg_temp.assert(confirmed is not null,'Canonical registration linked');
 -- Manual cadastro de telefone igual não é ligado à identidade verificada.
 insert into public.ma_cadastros(municipio_id,colecao,id,dados) values(c.municipio_id,'voluntarios','manual',jsonb_build_object('id','manual','municipioId',c.municipio_id,'nome','Manual','tipo_pessoa','FÍSICA','endereco','Rua Manual','telefone','44999990000'));
 perform pg_temp.assert((public.ma_contatos_listar(c.municipio_id)->>'total')='2','Manual record remains distinct');
 -- As três categorias preservam os próprios registros.
 for n in 2..3 loop
  insert into wa.sessions(channel_id,contact,version_id) values(c.id,'55000000111'||n,c.version_id) returning id into s;
  perform pg_temp.send(s,n::text);perform pg_temp.send(s,'Pessoa '||n);
  if n=2 then perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Rua Ocorrencia');perform pg_temp.send(s,'4');perform pg_temp.button(s,'skip');perform pg_temp.button(s,'skip');
  else perform pg_temp.send(s,'Rua Pedido');perform pg_temp.send(s,'44999990000');perform pg_temp.send(s,'Preciso de alimentos');end if;
  perform pg_temp.button(s,'confirm');
  r:=public.ma_contato_detalhe(c.municipio_id,'s:'||s);perform pg_temp.assert(r->'contact'->>'stage'='done','Flow confirmed '||n);
  perform pg_temp.assert(jsonb_array_length(r->'records')=1,'Canonical record exposed '||n);
  perform pg_temp.assert(r->'contact'->>'category'=case when n=2 then 'relato' else 'solicitacao' end,'Separate triage '||n);
 end loop;
 select id into s from wa.sessions where contact='550000001111';
 r:=public.ma_contato_detalhe(c.municipio_id,'s:'||s);
 perform pg_temp.assert(r->'conversation'->'items'->0->'payload'->>'text'='oi','Conversation contains actual inbound');
 perform pg_temp.assert(r->'conversation'->'items'->1->'payload'->>'text' like 'Olá! Bem-vindo%','Conversation contains actual queued copy');
 begin perform public.ma_contato_excluir(c.municipio_id,'s:'||s,'stale');raise exception 'Stale deletion accepted';exception when serialization_failure then null;end;
 delivery:=public.ma_wa_reservar();
 begin perform public.ma_contato_excluir(c.municipio_id,'s:'||s,r->'contact'->>'revision');raise exception 'In-flight deletion accepted';exception when object_not_in_prerequisite_state then null;end;
 perform public.ma_wa_resultado((delivery->>'id')::uuid,(delivery->>'lease')::uuid,'sent','pipeline.sent');
 perform public.ma_contato_excluir(c.municipio_id,'s:'||s,r->'contact'->>'revision');
 perform pg_temp.assert((public.ma_contatos_listar(c.municipio_id)->>'total')='3','Archive hides contact without manual resurrection');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where id=confirmed and arquivado_em is not null),'Canonical collaborator soft deleted');
 perform pg_temp.assert(public.ma_wa_reservar() is null,'Archived contact has no pending send');
 perform set_config('role','authenticated',true);
 perform pg_temp.assert(not exists(select 1 from public.ma_cadastros where id=confirmed),'Archived volunteer invisible to actual authenticated RLS');
 perform pg_temp.assert((public.ma_contatos_listar(c.municipio_id)->>'total')='3','Authenticated wrappers can read scoped directory');
 perform set_config('role','none',true);
 -- Provider replay não reabre, mesmo com timestamp alterado.
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','pipeline.first','from','550000001111','timestamp',extract(epoch from now())::bigint::text,'text','oi')));
 perform pg_temp.assert((select archived_at is not null from wa.sessions where id=s),'Replay cannot reopen');
 -- Novo evento com timestamp anterior à exclusão também não reabre.
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','pipeline.late','from','550000001111','timestamp',extract(epoch from now()-interval '5 minutes')::bigint::text,'text','oi')));
 perform pg_temp.assert((select archived_at is not null from wa.sessions where id=s),'Delayed event cannot reopen');
 -- Avançar relógio lógico apenas na fixture, preservando auditoria.
 update wa.sessions set archived_at=now()-interval '5 minutes' where id=s;
 perform public.ma_wa_receber(c.phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','pipeline.new','from','550000001111','timestamp',extract(epoch from now())::bigint::text,'text','oi')));
 perform pg_temp.assert((select archived_at is null and stage='menu' and answers='{}' from wa.sessions where id=s),'New inbound starts fresh cycle');
 perform pg_temp.assert((select count(*)>=2 from wa.contact_history where session_id=s),'Lifecycle audited');
 perform pg_temp.assert(exists(select 1 from public.ma_cadastros where id=confirmed and arquivado_em is not null),'Reopening alone does not restore offering');
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
 r:=public.ma_contatos_listar(c.municipio_id);perform pg_temp.assert(not (r->'items'->0->>'can_delete')::boolean,'Reader cannot delete');
 begin perform public.ma_contato_excluir(c.municipio_id,'r:manual','1');raise exception 'Reader deleted';exception when insufficient_privilege then null;end;
 begin perform public.ma_contatos_listar('other-city');raise exception 'Cross tenant leaked';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.ma_contatos_listar(c.municipio_id);raise exception 'Unauthenticated leaked';exception when insufficient_privilege then null;end;
end $test$;
select pg_temp.assert(not has_function_privilege('anon','public.ma_contatos_listar(text,text,text,text,integer)','execute'),'Anon RPC denied');
select pg_temp.assert(not has_table_privilege('authenticated','wa.sessions','select'),'Session table not exposed');
select pg_temp.assert(not has_function_privilege('authenticated','wa.contact_rows(text,text)','execute'),'Private directory denied');
rollback;
