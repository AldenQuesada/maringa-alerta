begin;
create schema if not exists wa;
revoke all on schema wa from public,anon,authenticated,service_role;
create table wa.versions (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 published_at timestamptz, config jsonb not null check(jsonb_typeof(config)='object'),
 created_at timestamptz not null default now()
);
create table wa.flows (
 version_id uuid references wa.versions on delete cascade, key text,
 position integer not null check(position>0), title text not null, button text not null check(length(button)<=20),
 intro text not null default '', condition jsonb not null default '{}',
 outputs jsonb not null check(jsonb_typeof(outputs)='array'),
 primary key(version_id,key), unique(version_id,position)
);
create table wa.nodes (
 version_id uuid, flow text, key text, position integer not null check(position>0),
 definition jsonb not null check(definition->>'kind' in ('text','tel','single','multi','photo','integer')),
 primary key(version_id,flow,key), unique(version_id,flow,position),
 foreign key(version_id,flow) references wa.flows on delete cascade
);
create table wa.channels (
 id uuid primary key default gen_random_uuid(), municipio_id text not null references public.ma_prefeituras,
 phone_number_id text not null unique check(phone_number_id~'^[0-9]+$'), waba_id text not null,
 display_phone text not null, version_id uuid not null references wa.versions,
 enabled boolean not null default false, outbound_enabled boolean not null default false,
 graph_version text not null check(graph_version~'^v[0-9]+\.[0-9]+$'),
 created_at timestamptz not null default now(), check(not outbound_enabled or enabled)
);
create function wa.immutable_catalog() returns trigger language plpgsql set search_path='' as $$
declare v uuid;
begin
 if tg_table_name='versions' then
   if old.published_at is not null then raise exception 'Published versions are immutable';end if;
 else
   v:=case when tg_op='DELETE' then old.version_id else new.version_id end;
   if exists(select 1 from wa.versions where id=v and published_at is not null)
     or (tg_op='UPDATE' and exists(select 1 from wa.versions where id=old.version_id and published_at is not null)) then
     raise exception 'Published versions are immutable';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger immutable before update or delete on wa.versions for each row execute function wa.immutable_catalog();
create trigger immutable before insert or update or delete on wa.flows for each row execute function wa.immutable_catalog();
create trigger immutable before insert or update or delete on wa.nodes for each row execute function wa.immutable_catalog();
alter table wa.versions enable row level security;
alter table wa.flows enable row level security;
alter table wa.nodes enable row level security;
alter table wa.channels enable row level security;
revoke all on all tables in schema wa from public,anon,authenticated,service_role;
revoke all on all functions in schema wa from public,anon,authenticated,service_role;
commit;
