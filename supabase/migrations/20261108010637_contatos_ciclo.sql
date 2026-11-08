begin;
-- Identidade continua sendo a sessão única canal/remetente. Nenhum cadastro parcial fictício.
alter table wa.sessions add column first_inbound_at timestamptz not null default now(),
 add column profile_name text, add column archived_at timestamptz, add column archived_by uuid references auth.users;
update wa.sessions s set first_inbound_at=coalesce((select min(received_at) from wa.inbox i where i.channel_id=s.channel_id and i.contact=s.contact),s.updated_at);
create index sessions_pipeline on wa.sessions(channel_id,updated_at desc,id) where not simulation and archived_at is null;
create index inbox_contact_history on wa.inbox(channel_id,contact,received_at,id);
alter table public.ma_cadastros add column arquivado_em timestamptz;
create policy cadastro_ativo on public.ma_cadastros as restrictive for all to authenticated,ma_escritor
 using(arquivado_em is null) with check(arquivado_em is null);
create table wa.contact_history(
 id bigint generated always as identity primary key,session_id uuid not null references wa.sessions,
 cycle uuid not null,action text not null,actor uuid references auth.users,created_at timestamptz not null default clock_timestamp(),snapshot jsonb not null);
create index contact_history_session on wa.contact_history(session_id,id desc);
alter table wa.contact_history enable row level security;
revoke all on wa.contact_history from public,anon,authenticated,service_role;
revoke all on sequence wa.contact_history_id_seq from public,anon,authenticated,service_role;
create function wa.contact_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.archived_at is distinct from new.archived_at or old.cycle<>new.cycle then
  insert into wa.contact_history(session_id,cycle,action,actor,snapshot) values(old.id,old.cycle,
   case when new.archived_at is not null then 'archive' when old.archived_at is not null then 'reopen' else 'restart' end,
   auth.uid(),jsonb_build_object('version_id',old.version_id,'flow',old.flow,'stage',old.stage,'answers',old.answers));
 end if;return new;
end $$;
create trigger contact_audit before update on wa.sessions for each row execute function wa.contact_audit();
create function wa.contact_received() returns trigger language plpgsql security definer set search_path='' as $$
declare c wa.channels;s wa.sessions;stamp timestamptz;profile text;
begin
 select * into strict c from wa.channels where id=new.channel_id;
 perform pg_advisory_xact_lock(hashtextextended(new.channel_id||':'||new.contact,0));
 stamp:=least(to_timestamp((new.event->>'timestamp')::double precision),now());
 profile:=nullif(left(regexp_replace(coalesce(new.event->>'profile_name',''),'[[:cntrl:]]','','g'),120),'');
 insert into wa.sessions(channel_id,contact,version_id,last_inbound_at,first_inbound_at,profile_name)
 values(c.id,new.contact,c.version_id,stamp,new.received_at,profile) on conflict do nothing;
 select * into strict s from wa.sessions where channel_id=c.id and contact=new.contact for update;
 if s.archived_at is not null then
  -- Reenvio do provedor não dispara este AFTER INSERT. Eventos atrasados também não reabrem.
  if stamp<=s.archived_at then
   update wa.inbox set processed_at=now(),error_code='contact_archived' where id=new.id;return null;
  end if;
  update wa.sessions set archived_at=null,archived_by=null,flow=null,stage='menu',position=0,answers='{}',
   cycle=gen_random_uuid(),version_id=c.version_id,revision=revision+1 where id=s.id;
 end if;
 update wa.sessions set profile_name=coalesce(profile,profile_name),last_inbound_at=greatest(last_inbound_at,stamp),updated_at=now() where id=s.id;
 return null;
end $$;
create trigger contact_received after insert on wa.inbox for each row execute function wa.contact_received();
revoke all on function wa.contact_audit(),wa.contact_received() from public,anon,authenticated,service_role;

-- Reserva e exclusão adquirem primeiro a sessão, depois a fila. Evita envio depois da exclusão.
create or replace function wa.ma_wa_reservar() returns jsonb language plpgsql security definer set search_path='' as $$
declare o wa.outbox;s wa.sessions;c wa.channels;sid uuid;
begin
 update wa.outbox set state='uncertain',error_code='lease_expired',updated_at=now() where state='sending' and lease_until<now();
 select ss.id into sid from wa.sessions ss join wa.channels cc on cc.id=ss.channel_id
 join public.ma_prefeituras p on p.id=cc.municipio_id
 where not ss.simulation and ss.archived_at is null and cc.outbound_enabled and p.status='ativa'
 and exists(select 1 from wa.outbox x where x.session_id=ss.id and x.state='pending' and x.next_attempt_at<=now()
 and not exists(select 1 from wa.outbox prior where prior.session_id=x.session_id and
 (prior.inbox_id,prior.sequence)<(x.inbox_id,x.sequence) and prior.state in ('pending','sending','uncertain')))
 order by ss.last_inbound_at,ss.id limit 1 for update of ss skip locked;
 if sid is null then return null;end if;
 select * into strict s from wa.sessions where id=sid;
 if s.last_inbound_at<now()-interval '23 hours 55 minutes' then
  update wa.outbox set state='expired',error_code='window_expired',updated_at=now() where session_id=sid and state='pending';return null;
 end if;
 select x.* into o from wa.outbox x where x.session_id=sid and x.state='pending' and x.next_attempt_at<=now()
 and not exists(select 1 from wa.outbox prior where prior.session_id=x.session_id and (prior.inbox_id,prior.sequence)<(x.inbox_id,x.sequence)
 and prior.state in ('pending','sending','uncertain')) order by x.inbox_id,x.sequence limit 1 for update skip locked;
 if not found then return null;end if;
 update wa.outbox set state='sending',attempt=attempt+1,lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',updated_at=now() where id=o.id returning * into o;
 select * into strict c from wa.channels where id=s.channel_id;
 return jsonb_build_object('id',o.id,'lease',o.lease,'to',s.contact,'payload',o.payload,'phone_number_id',c.phone_number_id,'graph_version',c.graph_version);
end $$;
-- As referências novas também recusam destinos arquivados, sob a mesma trava municipal.
create function private.ma_referencia_ativa() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('ma_relacoes'),hashtext(new.municipio_id));
 if exists(select 1 from public.ma_cadastros where municipio_id=new.municipio_id and colecao=new.destino_colecao and id=new.destino_id and arquivado_em is not null) then
  raise exception 'Cadastro de destino arquivado' using errcode='23503';end if;return new;
end $$;
revoke all on function private.ma_referencia_ativa() from public,anon,authenticated,ma_escritor,service_role;
create trigger ma_referencia_ativa before insert or update on private.ma_referencias for each row execute function private.ma_referencia_ativa();
commit;
