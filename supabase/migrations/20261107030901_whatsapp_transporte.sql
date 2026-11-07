begin;
-- Estas RPCs são exclusivas do backend; clientes autenticados não podem forjar remetentes.
create function wa.ma_wa_receber(telefone_id text, eventos jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare c wa.channels; e jsonb; total integer:=0; affected integer; oid uuid;
begin
 select * into c from wa.channels where phone_number_id=telefone_id and enabled;
 if not found then return 0;end if;
 if jsonb_typeof(eventos)<>'array' or jsonb_array_length(eventos)>100 then raise exception 'Invalid batch';end if;
 for e in select value from jsonb_array_elements(eventos) loop
  if e->>'type'='status' then
   oid:=null;
   if coalesce(e->>'outbox_id','') ~ '^[0-9a-f-]{36}$' then oid:=(e->>'outbox_id')::uuid;end if;
   insert into wa.delivery_events values(e->>'id',e->>'status',to_timestamp((e->>'timestamp')::double precision),oid,e->>'error_code') on conflict do nothing;
   update wa.outbox o set state=case
     when e->>'status'='read' then 'read'
     when e->>'status'='delivered' and o.state<>'read' then 'delivered'
     when e->>'status'='failed' and o.state not in ('read','delivered') then 'failed'
     when e->>'status'='sent' and o.state in ('sending','uncertain','pending') then 'sent' else o.state end,
     provider_id=coalesce(o.provider_id,e->>'id'),error_code=e->>'error_code',updated_at=now()
    from wa.sessions s where s.id=o.session_id and s.channel_id=c.id
     and (o.provider_id=e->>'id' or o.id=oid);
  elsif e->>'type'='message' then
   if coalesce(e->>'from','')!~'^[0-9]{7,15}$' or length(e->>'id')>300 or octet_length(e::text)>30000 then raise exception 'Invalid event';end if;
   insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,e->>'id',e->>'from',e) on conflict do nothing;
   get diagnostics affected=row_count;total:=total+affected;
  end if;
 end loop;return total;
end $$;
create function public.ma_wa_receber(telefone_id text, eventos jsonb) returns integer language sql security invoker set search_path='' as $$
 select wa.ma_wa_receber(telefone_id,eventos);
$$;
create function wa.ma_wa_entradas() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
 select i.id,i.event,i.channel_id,c.graph_version from wa.inbox i join wa.channels c on c.id=i.channel_id
 join public.ma_prefeituras p on p.id=c.municipio_id
 where i.processed_at is null and i.attempts<5 and c.enabled and p.status='ativa'
 and not exists(select 1 from wa.inbox earlier where earlier.channel_id=i.channel_id and earlier.contact=i.contact and earlier.id<i.id and earlier.processed_at is null)
 order by i.id limit 20) q;
$$;
create function public.ma_wa_entradas() returns jsonb language sql security invoker set search_path='' as $$
 select wa.ma_wa_entradas();
$$;
create function wa.ma_wa_processar(entrada bigint, midia jsonb default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare i wa.inbox; c wa.channels; s wa.sessions; response jsonb; ev jsonb; body text; part integer:=0; stamp timestamptz; controls boolean;
begin
 select * into i from wa.inbox where id=entrada and processed_at is null and attempts<5 for update skip locked;
 if not found then return false;end if;
 if not pg_try_advisory_xact_lock(hashtextextended(i.channel_id||':'||i.contact,0)) then return false;end if;
 if exists(select 1 from wa.inbox where channel_id=i.channel_id and contact=i.contact and id<i.id and processed_at is null) then return false;end if;
 select c1.* into c from wa.channels c1 join public.ma_prefeituras p on p.id=c1.municipio_id where c1.id=i.channel_id and c1.enabled and p.status='ativa';
 if not found then return false;end if;
 begin
  stamp:=least(to_timestamp((i.event->>'timestamp')::double precision),now());
  if stamp<now()-interval '23 hours 55 minutes' then
   update wa.inbox set processed_at=now(),error_code='window_expired' where id=i.id;return true;
  end if;
  insert into wa.sessions(channel_id,contact,version_id,last_inbound_at) values(c.id,i.contact,c.version_id,stamp) on conflict do nothing;
  select * into strict s from wa.sessions where channel_id=c.id and contact=i.contact for update;
  update wa.sessions set last_inbound_at=greatest(last_inbound_at,stamp) where id=s.id;
  ev:=jsonb_strip_nulls(jsonb_build_object('text',i.event->>'text','button',i.event->>'button','media',midia));
  if ev='{}' then ev:='{"text":""}';end if;
  response:=wa.step(s.id,ev);body:=response->>'text';
  controls:=jsonb_array_length(response->'buttons') between 1 and 3 and length(body)>1024;
  loop
   part:=part+1;
   insert into wa.outbox(inbox_id,sequence,session_id,payload)
    values(i.id,part,s.id,jsonb_build_object('text',left(body,3500),'buttons',case when length(body)>3500 or controls then '[]'::jsonb else response->'buttons' end));
   body:=substr(body,3501);exit when body='';
  end loop;
  if controls then
   insert into wa.outbox(inbox_id,sequence,session_id,payload) select i.id,part+1,s.id,
    jsonb_build_object('text',config->'texts'->>'controls','buttons',response->'buttons') from wa.versions where id=s.version_id;
  end if;
  update wa.inbox set processed_at=now(),error_code=null where id=i.id;
 exception when others then
  update wa.inbox set attempts=attempts+1,error_code=sqlstate where id=i.id;return false;
 end;
 return true;
end $$;
create function public.ma_wa_processar(entrada bigint, midia jsonb default null) returns boolean language sql security invoker set search_path='' as $$
 select wa.ma_wa_processar(entrada,midia);
$$;
create function wa.ma_wa_reservar() returns jsonb language plpgsql security definer set search_path='' as $$
declare o wa.outbox; s wa.sessions; c wa.channels;
begin
 update wa.outbox set state='uncertain',error_code='lease_expired',updated_at=now() where state='sending' and lease_until<now();
 update wa.outbox x set state='expired',error_code='window_expired' from wa.sessions ss
  where ss.id=x.session_id and x.state='pending' and ss.last_inbound_at<now()-interval '23 hours 55 minutes';
 select x.* into o from wa.outbox x join wa.sessions ss on ss.id=x.session_id join wa.channels cc on cc.id=ss.channel_id
 join public.ma_prefeituras p on p.id=cc.municipio_id
 where x.state='pending' and x.next_attempt_at<=now() and cc.outbound_enabled and p.status='ativa' and not ss.simulation
 and not exists(select 1 from wa.outbox prior where prior.session_id=x.session_id
  and (prior.inbox_id,prior.sequence)<(x.inbox_id,x.sequence) and prior.state in ('pending','sending','uncertain'))
 order by x.inbox_id,x.sequence limit 1 for update of x skip locked;
 if not found then return null;end if;
 update wa.outbox set state='sending',attempt=attempt+1,lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',updated_at=now()
 where id=o.id returning * into o;
 select * into strict s from wa.sessions where id=o.session_id;select * into strict c from wa.channels where id=s.channel_id;
 return jsonb_build_object('id',o.id,'lease',o.lease,'to',s.contact,'payload',o.payload,'phone_number_id',c.phone_number_id,'graph_version',c.graph_version);
end $$;
create function public.ma_wa_reservar() returns jsonb language sql security invoker set search_path='' as $$
 select wa.ma_wa_reservar();
$$;
create function wa.ma_wa_resultado(saida uuid,reserva uuid,resultado text,provedor_id text default null,codigo text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if resultado not in ('sent','failed','uncertain','retry') then raise exception 'Invalid delivery state';end if;
 update wa.outbox set state=case when resultado='retry' and attempt<5 then 'pending' when resultado='retry' then 'failed' else resultado end,
  provider_id=coalesce(provedor_id,provider_id),error_code=codigo,next_attempt_at=now()+make_interval(secs=>least(900,30*power(2,attempt)::integer)),
  lease_until=null,updated_at=now() where id=saida and lease=reserva and state='sending';
end $$;
create function public.ma_wa_resultado(saida uuid,reserva uuid,resultado text,provedor_id text default null,codigo text default null) returns void language sql security invoker set search_path='' as $$
 select wa.ma_wa_resultado(saida,reserva,resultado,provedor_id,codigo);
$$;
revoke all on function public.ma_wa_receber(text,jsonb),public.ma_wa_entradas(),public.ma_wa_processar(bigint,jsonb),
 public.ma_wa_reservar(),public.ma_wa_resultado(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ma_wa_receber(text,jsonb),public.ma_wa_entradas(),public.ma_wa_processar(bigint,jsonb),
 public.ma_wa_reservar(),public.ma_wa_resultado(uuid,uuid,text,text,text) to service_role;

-- Fronteiras privilegiadas privadas; a API exposta usa SECURITY INVOKER.
grant usage on schema wa to service_role;
revoke all on function wa.ma_wa_receber(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_receber(text,jsonb) to service_role;
grant usage on schema wa to service_role;
revoke all on function wa.ma_wa_entradas() from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_entradas() to service_role;
grant usage on schema wa to service_role;
revoke all on function wa.ma_wa_processar(bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_processar(bigint,jsonb) to service_role;
grant usage on schema wa to service_role;
revoke all on function wa.ma_wa_reservar() from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_reservar() to service_role;
grant usage on schema wa to service_role;
revoke all on function wa.ma_wa_resultado(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_resultado(uuid,uuid,text,text,text) to service_role;
commit;
