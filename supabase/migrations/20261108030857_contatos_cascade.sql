begin;
-- Relações reais de propriedade: a sessão é a raiz da cascata.
alter table wa.inbox add constraint inbox_contact_session_fk foreign key(channel_id,contact)
 references wa.sessions(channel_id,contact) on delete cascade deferrable initially deferred;
alter table wa.outbox drop constraint outbox_inbox_id_fkey,add constraint outbox_inbox_id_fkey foreign key(inbox_id) references wa.inbox on delete cascade;
alter table wa.outbox drop constraint outbox_session_id_fkey,add constraint outbox_session_id_fkey foreign key(session_id) references wa.sessions on delete cascade;
alter table wa.completions drop constraint completions_session_id_fkey,add constraint completions_session_id_fkey foreign key(session_id) references wa.sessions on delete cascade;
alter table wa.contact_history drop constraint contact_history_session_id_fkey,add constraint contact_history_session_id_fkey foreign key(session_id) references wa.sessions on delete cascade;
alter table wa.simulation_requests drop constraint simulation_requests_session_id_fkey,add constraint simulation_requests_session_id_fkey foreign key(session_id) references wa.sessions on delete cascade;
alter table wa.contact_records add constraint contact_records_session_fk foreign key(channel_id,contact) references wa.sessions(channel_id,contact) on delete cascade;
alter table wa.delivery_events add constraint delivery_outbox_fk foreign key(outbox_id) references wa.outbox on delete cascade;
create index delivery_outbox on wa.delivery_events(outbox_id);
create table wa.contact_owned_records(
 session_id uuid not null references wa.sessions on delete cascade,municipio_id text not null,collection text not null,record_id text not null,
 primary key(municipio_id,collection,record_id),foreign key(municipio_id,collection,record_id) references public.ma_cadastros(municipio_id,colecao,id) on delete cascade);
create index contact_owned_session on wa.contact_owned_records(session_id);
alter table wa.contact_owned_records enable row level security;
revoke all on wa.contact_owned_records from public,anon,authenticated,service_role;
insert into wa.contact_owned_records
 select distinct s.id,c.municipio_id,r.colecao,r.id from wa.completions co join wa.sessions s on s.id=co.session_id join wa.channels c on c.id=s.channel_id,
 jsonb_array_elements(co.records) x,public.ma_cadastros r where r.municipio_id=c.municipio_id and r.colecao=x->>'collection' and r.id=x->>'id';
create function wa.contact_link_records() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into wa.contact_owned_records select new.session_id,c.municipio_id,x->>'collection',x->>'id'
 from wa.sessions s join wa.channels c on c.id=s.channel_id,jsonb_array_elements(new.records) x where s.id=new.session_id
 on conflict(municipio_id,collection,record_id) do update set session_id=excluded.session_id
 where wa.contact_owned_records.session_id=excluded.session_id;
 if exists(select 1 from jsonb_array_elements(new.records) x join wa.contact_owned_records r on r.collection=x->>'collection' and r.record_id=x->>'id'
 join wa.channels c on c.municipio_id=r.municipio_id join wa.sessions s on s.channel_id=c.id and s.id=new.session_id where r.session_id<>new.session_id) then
 raise exception 'Cadastro pertence a outro contato' using errcode='23514';end if;
 return null;
end $$;
create trigger contact_link_records after insert on wa.completions for each row execute function wa.contact_link_records();
create function wa.contact_delete_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.ma_cadastros where municipio_id=old.municipio_id and colecao=old.collection and id=old.record_id;
 return null;
end $$;
create trigger contact_delete_record after delete on wa.contact_owned_records for each row execute function wa.contact_delete_record();
-- Apenas hashes de IDs aleatórios do provedor: nenhum telefone, resposta ou conversa.
create table wa.deleted_receipts(channel_id uuid not null references wa.channels on delete cascade,event_hash text not null,primary key(channel_id,event_hash));
alter table wa.deleted_receipts enable row level security;
revoke all on wa.deleted_receipts from public,anon,authenticated,service_role;
create function wa.contact_replay_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.channel_id||':'||new.contact,0));
 if exists(select 1 from wa.deleted_receipts where channel_id=new.channel_id and event_hash=encode(sha256(convert_to(new.provider_id,'UTF8')),'hex')) then return null;end if;
 return new;
end $$;
create trigger aa_contact_replay_guard before insert on wa.inbox for each row execute function wa.contact_replay_guard();
create function wa.contact_delete_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into wa.deleted_receipts values(old.channel_id,encode(sha256(convert_to(old.provider_id,'UTF8')),'hex')) on conflict do nothing;return old;
end $$;
create trigger contact_delete_receipt before delete on wa.inbox for each row execute function wa.contact_delete_receipt();
create function wa.contact_delete_delivery() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from wa.delivery_events where provider_id=old.provider_id or outbox_id=old.id;return old;end $$;
create trigger contact_delete_delivery before delete on wa.outbox for each row execute function wa.contact_delete_delivery();
revoke all on function wa.contact_link_records(),wa.contact_delete_record(),wa.contact_replay_guard(),wa.contact_delete_receipt(),wa.contact_delete_delivery() from public,anon,authenticated,service_role;
create or replace function wa.ma_wa_receber(telefone_id text, eventos jsonb) returns integer
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
   select o.id into oid from wa.outbox o join wa.sessions s on s.id=o.session_id where s.channel_id=c.id and (o.provider_id=e->>'id' or o.id=oid) limit 1;
   if oid is null then continue;end if; -- Callback atrasado não restaura conversa apagada.
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
commit;
