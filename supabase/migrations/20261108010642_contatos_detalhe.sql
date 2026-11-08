begin;
alter table wa.inbox add column media jsonb;
create function wa.process_contact(entrada bigint,midia jsonb default null) returns boolean language plpgsql security definer set search_path='' as $$
declare ok boolean;
begin
 ok:=wa.ma_wa_processar(entrada,midia);
 if ok and midia is not null then update wa.inbox set media=midia where id=entrada and error_code is null;end if;
 return ok;
end $$;
create or replace function public.ma_wa_processar(entrada bigint,midia jsonb default null) returns boolean
language sql security invoker set search_path='' as $$select wa.process_contact(entrada,midia);$$;
revoke all on function wa.process_contact(bigint,jsonb) from public,anon,authenticated;
grant execute on function wa.process_contact(bigint,jsonb) to service_role;
-- Metadados já persistidos no cadastro permitem recuperar fotografias anteriores sem copiar arquivos.
update wa.inbox i set media=r.dados->'foto' from public.ma_cadastros r
 where i.event ? 'image' and r.colecao='relatos' and r.dados->'foto'->>'path' in (i.channel_id||'/'||i.id||'.jpg',i.channel_id||'/'||i.id||'.png');
create function wa.contact_history_allowed(municipio text) returns boolean language sql stable set search_path='' as $$
 select auth.uid() is not null and private.ma_acesso(municipio) and not exists(select 1 from jsonb_each(wa.contact_config()->'categories') c
 where not private.ma_permitido(municipio,c.value->>'collection','ler'));
$$;
create or replace function private.ma_wa_ler_foto(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from wa.channels c where c.id::text=split_part(object_name,'/',1) and wa.contact_history_allowed(c.municipio_id));
$$;
create function wa.contact_messages(s wa.sessions,before_key text default null) returns jsonb language sql stable set search_path='' as $$
 with messages as (
 select lpad(i.id::text,20,'0')||':0000' key,i.received_at at,'inbound' direction,null::text state,
 jsonb_build_object('text',coalesce(i.event->>'text',(select coalesce(b->>'full_label',b->>'label') from wa.outbox o,
 jsonb_array_elements(o.payload->'buttons') b where o.session_id=s.id and o.inbox_id<i.id and b->>'id'=i.event->>'button'
 order by o.inbox_id desc,o.sequence desc limit 1)), 'media',i.media,'image_pending',i.event ? 'image' and i.media is null) payload
 from wa.inbox i where i.channel_id=s.channel_id and i.contact=s.contact
 union all
 select lpad(o.inbox_id::text,20,'0')||':'||lpad(o.sequence::text,4,'0'),o.created_at,'outbound',o.state,o.payload
 from wa.outbox o where o.session_id=s.id
 ), page as (select * from messages where before_key is null or key<before_key order by key desc limit 51)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(m) order by m.key) from (select * from page order by key desc limit 50)m),'[]'),
 'more',(select count(*)>50 from page),'cursor',(select min(key) from (select key from page order by key desc limit 50)m));
$$;
create function private.ma_contato_detalhe(municipio text,chave text,antes text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare item jsonb;s wa.sessions;answers jsonb;records jsonb;conversation jsonb;history_allowed boolean;
begin
 if auth.uid() is null or not private.ma_acesso(municipio) then raise exception 'Sem acesso à prefeitura' using errcode='42501';end if;
 select data into item from wa.contact_rows(municipio,chave);
 if item is null then raise exception 'Contato indisponível' using errcode='42501';end if;
 if item ? 'session_id' then
  select * into strict s from wa.sessions where id=(item->>'session_id')::uuid;
  select coalesce(jsonb_agg(jsonb_build_object('key',n.key,'label',n.definition->>'label','question',n.definition->>'question',
   'kind',n.definition->>'kind','answered',s.answers ? n.key,'value',s.answers->n.key) order by n.position),'[]') into answers
   from wa.nodes n where n.version_id=s.version_id and n.flow=s.flow and wa.matches(n.definition->'condition',s.answers);
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'collection',r.colecao,'label',cfg.documento->'esquemas'->r.colecao->>'singular',
   'confirmed_at',x.confirmed_at,'status',r.dados->>'status','archived',r.arquivado_em is not null) order by x.confirmed_at desc),'[]') into records
   from wa.contact_records_for(s.id) x join public.ma_cadastros r on r.municipio_id=municipio and r.colecao=x.collection and r.id=x.id
   cross join public.ma_configuracao cfg where cfg.id='interface' and private.ma_permitido(municipio,r.colecao,'ler');
  history_allowed:=wa.contact_history_allowed(municipio);
  if history_allowed then conversation:=wa.contact_messages(s,antes);end if;
 else
  select coalesce(jsonb_agg(jsonb_build_object('key',f->>'key','label',f->>'label','question',f->>'label','kind',f->>'type',
   'answered',r.dados ? (f->>'key'),'value',r.dados->(f->>'key')) order by ord),'[]') into answers
   from public.ma_cadastros r,public.ma_configuracao c,
   jsonb_array_elements(c.documento->'esquemas'->'voluntarios'->'fields') with ordinality fields(f,ord)
   where c.id='interface' and r.municipio_id=municipio and r.colecao='voluntarios' and r.id=item->>'record_id' and f->>'type'<>'hidden';
  records:='[]';history_allowed:=true;
 end if;
 return jsonb_build_object('contact',item,'answers',answers,'records',records,'history_allowed',history_allowed,
 'conversation',coalesce(conversation,'{"items":[],"more":false}'::jsonb));
end $$;
create function public.ma_contato_detalhe(municipio text,chave text,antes text default null) returns jsonb
language sql security invoker set search_path='' as $$select private.ma_contato_detalhe(municipio,chave,antes);$$;
revoke all on function wa.contact_history_allowed(text),wa.contact_messages(wa.sessions,text) from public,anon,authenticated,service_role;
revoke all on function private.ma_contato_detalhe(text,text,text),public.ma_contato_detalhe(text,text,text) from public,anon,service_role;
grant execute on function private.ma_contato_detalhe(text,text,text),public.ma_contato_detalhe(text,text,text) to authenticated;
commit;
