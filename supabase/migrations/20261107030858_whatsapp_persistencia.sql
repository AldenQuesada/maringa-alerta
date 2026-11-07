begin;
create function wa.project(s wa.sessions) returns jsonb language plpgsql set search_path='' as $$
declare o jsonb; field record; d jsonb; v jsonb; rid text; result jsonb:='[]'; city text; existing jsonb;
begin
 if s.simulation then return '[]';end if;
 select records into existing from wa.completions where cycle=s.cycle;
 if found then return existing;end if;
 select c.municipio_id into strict city from wa.channels c join public.ma_prefeituras p on p.id=c.municipio_id
  where c.id=s.channel_id and c.enabled and p.status='ativa';
 for o in select value from wa.flows f, jsonb_array_elements(f.outputs) where f.version_id=s.version_id and f.key=s.flow loop
  if not wa.matches(o->'condition',s.answers) then continue;end if;
  if o->>'collection' not in ('voluntarios','bases','solicitacoes','relatos') then raise exception 'Invalid projection target';end if;
  rid:=null;
  if o->>'identity'='contact' then
   select record_id into rid from wa.contact_records where channel_id=s.channel_id and contact=s.contact and output_key=o->>'key';
  end if;
  rid:=coalesce(rid,gen_random_uuid()::text);d:='{}';
  for field in select * from jsonb_each(o->'fields') loop
   if field.value ? 'answer' then v:=coalesce(s.answers->(field.value->>'answer'),'null'::jsonb);
   elsif field.value ? 'constant' then v:=field.value->'constant';
   elsif field.value->>'context'='now' then v:=to_jsonb(now());
   elsif field.value->>'context'='contact' then v:=to_jsonb(s.contact);
   else raise exception 'Unknown mapping';end if;
   d:=d||jsonb_build_object(field.key,v);
  end loop;
  d:=d||jsonb_build_object('id',rid,'municipioId',city,'whatsapp_protocolo',s.cycle,'whatsapp_canal',s.channel_id);
  insert into public.ma_cadastros(municipio_id,colecao,id,dados) values(city,o->>'collection',rid,d)
   on conflict(municipio_id,colecao,id) do update set dados=public.ma_cadastros.dados||excluded.dados;
  if o->>'identity'='contact' then
   insert into wa.contact_records values(s.channel_id,s.contact,o->>'key',rid)
    on conflict(channel_id,contact,output_key) do nothing;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('collection',o->>'collection','id',rid));
 end loop;
 insert into wa.completions values(s.cycle,s.id,s.version_id,s.flow,result,now());
 return result;
end $$;
revoke all on all functions in schema wa from public,anon,authenticated,service_role;
commit;
