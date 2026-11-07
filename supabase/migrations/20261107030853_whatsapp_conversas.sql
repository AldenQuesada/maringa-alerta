begin;
create table wa.sessions (
 id uuid primary key default gen_random_uuid(), channel_id uuid not null references wa.channels,
 contact text not null, simulation boolean not null default false, actor uuid references auth.users,
 version_id uuid not null references wa.versions, flow text,
 stage text not null default 'menu' check(stage in ('menu','question','review','done')),
 position integer not null default 0, revision bigint not null default 0,
 cycle uuid not null default gen_random_uuid(), answers jsonb not null default '{}',
 last_inbound_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(simulation=(actor is not null)), unique(channel_id,contact)
);
create table wa.inbox (
 id bigint generated always as identity primary key, channel_id uuid not null references wa.channels,
 provider_id text not null, contact text not null, event jsonb not null,
 received_at timestamptz not null default now(), processed_at timestamptz, attempts integer not null default 0,
 error_code text, unique(channel_id,provider_id)
);
create index inbox_pending on wa.inbox(id) where processed_at is null;
create table wa.outbox (
 id uuid primary key default gen_random_uuid(), inbox_id bigint not null references wa.inbox, sequence integer not null,
 session_id uuid not null references wa.sessions, payload jsonb not null,
 state text not null default 'pending' check(state in ('pending','sending','sent','delivered','read','failed','uncertain','expired')),
 provider_id text unique, attempt integer not null default 0, lease uuid, lease_until timestamptz,
 next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now(),
 error_code text, updated_at timestamptz not null default now(), unique(inbox_id,sequence)
);
create index outbox_pending on wa.outbox(next_attempt_at,created_at) where state='pending';
create table wa.completions (
 cycle uuid primary key, session_id uuid not null references wa.sessions,
 version_id uuid not null references wa.versions, flow text not null,
 records jsonb not null, created_at timestamptz not null default now()
);
create table wa.contact_records (
 channel_id uuid references wa.channels, contact text, output_key text, record_id text not null,
 primary key(channel_id,contact,output_key)
);
create table wa.simulation_requests (
 session_id uuid references wa.sessions, request_id uuid, response jsonb not null,
 primary key(session_id,request_id)
);
create table wa.delivery_events (
 provider_id text, state text, event_at timestamptz, outbox_id uuid,
 error_code text, primary key(provider_id,state,event_at)
);
alter table wa.sessions enable row level security;
alter table wa.inbox enable row level security;
alter table wa.outbox enable row level security;
alter table wa.completions enable row level security;
alter table wa.contact_records enable row level security;
alter table wa.simulation_requests enable row level security;
alter table wa.delivery_events enable row level security;
revoke all on all tables in schema wa from public,anon,authenticated,service_role;
revoke all on all sequences in schema wa from public,anon,authenticated,service_role;
commit;
