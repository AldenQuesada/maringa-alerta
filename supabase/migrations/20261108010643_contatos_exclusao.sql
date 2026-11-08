begin;
create function private.ma_contato_excluir(municipio text,chave text,revisao text) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;s wa.sessions;r record;cfg jsonb;stamp timestamptz:=clock_timestamp();
begin
 cfg:=wa.contact_config();
 if auth.uid() is null or not private.ma_acesso(municipio,true) then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
 -- Mesmo bloqueio das referências e mesmo bloqueio do processador para esta identidade.
 if left(chave,2)='s:' then
  select ss.* into s from wa.sessions ss join wa.channels c on c.id=ss.channel_id
   where c.municipio_id=municipio and 's:'||ss.id=chave and not ss.simulation;
  if not found then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.channel_id||':'||s.contact,0));
  perform 1 from wa.sessions where id=s.id for update;
 else
  perform 1 from public.ma_cadastros where municipio_id=municipio and colecao='voluntarios' and 'r:'||id=chave for update;
 end if;
 perform pg_advisory_xact_lock(hashtext('ma_relacoes'),hashtext(municipio));
 select data into item from wa.contact_rows(municipio,chave);
 if item is null or not coalesce((item->>'can_delete')::boolean,false) then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
 if revisao is distinct from item->>'revision' then raise exception '%',cfg->'labels'->>'stale' using errcode='40001';end if;
 if s.id is not null and exists(select 1 from wa.outbox where session_id=s.id and state in ('sending','uncertain')) then
  raise exception '%',cfg->'labels'->>'busy' using errcode='55000';end if;
 for r in select c.* from public.ma_cadastros c where c.municipio_id=municipio and c.arquivado_em is null and
 ((s.id is null and c.colecao='voluntarios' and c.id=item->>'record_id') or
 (s.id is not null and cfg->'archive_collections' ? c.colecao and exists(select 1 from wa.contact_records_for(s.id) x where x.collection=c.colecao and x.id=c.id))) for update loop
  if not private.ma_permitido(municipio,r.colecao,'excluir') then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
  if exists(select 1 from private.ma_referencias where municipio_id=municipio and destino_colecao=r.colecao and destino_id=r.id) then
   raise exception '%',cfg->'labels'->>'linked' using errcode='23503';end if;
  update public.ma_cadastros set arquivado_em=stamp where municipio_id=municipio and colecao=r.colecao and id=r.id;
 end loop;
 if s.id is not null then
  update wa.outbox set state='expired',error_code='contact_archived',updated_at=stamp where session_id=s.id and state='pending';
  update wa.inbox set processed_at=stamp,error_code='contact_archived' where channel_id=s.channel_id and contact=s.contact and processed_at is null;
  update wa.sessions set archived_at=stamp,archived_by=auth.uid(),revision=revision+1,updated_at=stamp where id=s.id;
 end if;
 insert into wa.operations(actor,action,target) values(auth.uid(),'contact_archive',municipio||':'||chave);
end $$;
create function public.ma_contato_excluir(municipio text,chave text,revisao text) returns void language sql security invoker set search_path='' as $$
 select private.ma_contato_excluir(municipio,chave,revisao);
$$;
revoke all on function private.ma_contato_excluir(text,text,text),public.ma_contato_excluir(text,text,text) from public,anon,service_role;
grant execute on function private.ma_contato_excluir(text,text,text),public.ma_contato_excluir(text,text,text) to authenticated;
-- Um novo atendimento só restaura o cadastro canônico quando for novamente confirmado.
create or replace function wa.project(s wa.sessions) returns jsonb language plpgsql set search_path='' as $$
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
   on conflict(municipio_id,colecao,id) do update set dados=public.ma_cadastros.dados||excluded.dados,arquivado_em=null;
  if o->>'identity'='contact' then
   insert into wa.contact_records values(s.channel_id,s.contact,o->>'key',rid)
    on conflict(channel_id,contact,output_key) do nothing;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('collection',o->>'collection','id',rid));
 end loop;
 insert into wa.completions values(s.cycle,s.id,s.version_id,s.flow,result,now());
 return result;
end $$;
commit;
