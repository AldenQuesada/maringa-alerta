begin;
create index inbox_contact_order on wa.inbox(channel_id,contact,id) where processed_at is null;
create index outbox_session_order on wa.outbox(session_id,inbox_id,sequence);
create index sessions_actor on wa.sessions(actor) where actor is not null;
create index sessions_version on wa.sessions(version_id);
create index channels_city on wa.channels(municipio_id);
create index channels_version on wa.channels(version_id);
create index completions_session on wa.completions(session_id);
create index completions_version on wa.completions(version_id);
create table wa.operations (
 id bigint generated always as identity primary key, actor uuid references auth.users,
 action text not null, target text not null, created_at timestamptz not null default now()
);
create index operations_actor on wa.operations(actor);
alter table wa.operations enable row level security;
revoke all on wa.operations from public,anon,authenticated,service_role;
revoke all on sequence wa.operations_id_seq from public,anon,authenticated,service_role;

create function wa.ma_wa_falha_entrada(entrada bigint) returns void language sql security definer set search_path='' as $$
 update wa.inbox set attempts=attempts+1,error_code='media_unavailable' where id=entrada and processed_at is null and attempts<5;
$$;
create function public.ma_wa_falha_entrada(entrada bigint) returns void language sql security invoker set search_path='' as $$ select wa.ma_wa_falha_entrada(entrada); $$;
revoke all on function wa.ma_wa_falha_entrada(bigint),public.ma_wa_falha_entrada(bigint) from public,anon,authenticated;
grant execute on function wa.ma_wa_falha_entrada(bigint),public.ma_wa_falha_entrada(bigint) to service_role;

create function wa.check_rule(rule jsonb, version uuid, flow_key text, before_position integer) returns void language plpgsql set search_path='' as $$
declare r jsonb;
begin
 if rule is null or rule='{}' then return;end if;
 if rule ? 'any' or rule ? 'all' then
  for r in select value from jsonb_array_elements(coalesce(rule->'any',rule->'all')) loop perform wa.check_rule(r,version,flow_key,before_position);end loop;
 elsif rule ? 'field' and (rule ? 'eq' or rule ? 'contains' or rule ? 'nonempty') then
  if not exists(select 1 from wa.nodes where version_id=version and flow=flow_key and key=rule->>'field' and position<before_position) then
   raise exception 'Condition references missing or future answer';end if;
 else raise exception 'Invalid condition';end if;
end $$;
alter function wa.publish(uuid) rename to publish_structure;
create function wa.publish(version uuid) returns void language plpgsql set search_path='' as $$
declare c jsonb;f wa.flows;n wa.nodes;b jsonb;o jsonb;field record;key text;
begin
 select config into strict c from wa.versions where id=version and published_at is null;
 foreach key in array array['welcome','controls','multi_hint','zero_hint','photo_received','review','done','simulated'] loop
  if length(coalesce(c->'texts'->>key,'')) not between 1 and 3000 then raise exception 'Missing or excessive text: %',key;end if;
 end loop;
 foreach key in array array['required','too_long','phone','integer','choice','multi','exclusive','photo','stale','menu','review','done','offer_required','invalid'] loop
  if length(coalesce(c->'errors'->>key,'')) not between 1 and 500 then raise exception 'Missing error text: %',key;end if;
 end loop;
 foreach key in array array['optional','review','done'] loop
  if coalesce(jsonb_array_length(c->'buttons'->key),0) not between 1 and 3 then raise exception 'Invalid button set';end if;
  for b in select value from jsonb_array_elements(c->'buttons'->key) loop
   if b->>'action' not in ('skip','confirm','correct','restart') or length(coalesce(b->>'label','')) not between 1 and 20 then raise exception 'Invalid button';end if;
  end loop;
 end loop;
 if (select count(*) from wa.flows where version_id=version)>10 then raise exception 'Too many menu entries';end if;
 for f in select * from wa.flows where version_id=version loop
  perform wa.check_rule(f.condition,version,f.key,2147483647);
  for o in select value from jsonb_array_elements(f.outputs) loop
   perform wa.check_rule(o->'condition',version,f.key,2147483647);
   if o->>'identity' not in ('contact','cycle') or coalesce(o->>'key','')='' then raise exception 'Invalid output identity';end if;
   for field in select * from jsonb_each(o->'fields') loop
    if field.value ? 'answer' then
     if not exists(select 1 from wa.nodes node where node.version_id=version and node.flow=f.key and node.key=field.value->>'answer') then raise exception 'Invalid answer mapping';end if;
    elsif not field.value ? 'constant' and coalesce(field.value->>'context','') not in ('now','contact') then raise exception 'Invalid field mapping';end if;
   end loop;
  end loop;
 end loop;
 for n in select * from wa.nodes where version_id=version loop
  perform wa.check_rule(n.definition->'condition',version,n.flow,n.position);
  if length(n.definition->>'question')>3000 or coalesce((n.definition->>'max_length')::integer,2000) not between 1 and 2000 then raise exception 'Question exceeds bounds';end if;
  if (select count(*)<>count(distinct value->>'value') from jsonb_array_elements(coalesce(n.definition->'options','[]'))) then raise exception 'Duplicate choices';end if;
 end loop;
 perform wa.publish_structure(version);
end $$;
-- Autoria de nova versão, sem editar o catálogo que já está em atendimento.
create function wa.ma_wa_publicar(nome text,configuracao jsonb,fluxos jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid;f jsonb;n jsonb;
begin
 if auth.uid() is null or not private.ma_admin() then raise exception 'Forbidden' using errcode='42501';end if;
 if octet_length(fluxos::text)>500000 or jsonb_array_length(fluxos)>10 then raise exception 'Catalog limit';end if;
 insert into wa.versions(name,config) values(nome,configuracao) returning id into v;
 for f in select value from jsonb_array_elements(fluxos) loop
  insert into wa.flows values(v,f->>'key',(f->>'position')::integer,f->>'title',f->>'button',coalesce(f->>'intro',''),coalesce(f->'condition','{}'),f->'outputs');
  if jsonb_array_length(f->'nodes')>100 then raise exception 'Node limit';end if;
  for n in select value from jsonb_array_elements(f->'nodes') loop
   insert into wa.nodes values(v,f->>'key',n->>'key',(n->>'position')::integer,n->'definition');
  end loop;
 end loop;
 perform wa.publish(v);
 insert into wa.operations(actor,action,target) values(auth.uid(),'publish',v::text);
 return v;
end $$;
create function public.ma_wa_publicar(nome text,configuracao jsonb,fluxos jsonb) returns uuid language sql security invoker set search_path='' as $$select wa.ma_wa_publicar(nome,configuracao,fluxos);$$;
create function wa.ma_wa_usar_versao(canal uuid,versao uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.ma_admin() then raise exception 'Forbidden' using errcode='42501';end if;
 if not exists(select 1 from wa.versions where id=versao and published_at is not null) then raise exception 'Published version required';end if;
 update wa.channels set version_id=versao where id=canal;
 if not found then raise exception 'Unknown channel';end if;
 insert into wa.operations(actor,action,target) values(auth.uid(),'channel_version',canal||':'||versao);
end $$;
create function public.ma_wa_usar_versao(canal uuid,versao uuid) returns void language sql security invoker set search_path='' as $$select wa.ma_wa_usar_versao(canal,versao);$$;
revoke all on function wa.check_rule(jsonb,uuid,text,integer),wa.publish(uuid),wa.publish_structure(uuid) from public,anon,authenticated,service_role;
revoke all on function wa.ma_wa_publicar(text,jsonb,jsonb),public.ma_wa_publicar(text,jsonb,jsonb),wa.ma_wa_usar_versao(uuid,uuid),public.ma_wa_usar_versao(uuid,uuid) from public,anon,service_role;
grant execute on function wa.ma_wa_publicar(text,jsonb,jsonb),public.ma_wa_publicar(text,jsonb,jsonb),wa.ma_wa_usar_versao(uuid,uuid),public.ma_wa_usar_versao(uuid,uuid) to authenticated;
commit;
