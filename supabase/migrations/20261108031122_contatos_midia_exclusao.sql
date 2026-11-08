begin;
-- A API de Storage remove o arquivo físico. DELETE em storage.objects não é usado.
create table wa.media_deletions(
 id uuid primary key default gen_random_uuid(),path text not null unique check(path ~ '^[0-9a-f-]{36}/[0-9]+\.(jpg|png)$'),
 available_at timestamptz not null default now(),lease uuid,lease_until timestamptz,attempt integer not null default 0);
alter table wa.media_deletions enable row level security;
revoke all on wa.media_deletions from public,anon,authenticated,service_role;
create index media_deletions_ready on wa.media_deletions(available_at);
create function wa.contact_delete_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.event ? 'image' then
  -- Atraso cobre download/upload já em andamento no worker; IDs da inbox não são reutilizados.
  insert into wa.media_deletions(path,available_at) values(old.channel_id||'/'||old.id||'.jpg',now()+interval '2 minutes'),(old.channel_id||'/'||old.id||'.png',now()+interval '2 minutes') on conflict(path) do nothing;
 end if;return old;
end $$;
create trigger contact_delete_media before delete on wa.inbox for each row execute function wa.contact_delete_media();
create function wa.ma_wa_midia_excluir_reservar() returns jsonb language plpgsql security definer set search_path='' as $$
declare item wa.media_deletions;
begin
 select * into item from wa.media_deletions where available_at<=now() and (lease_until is null or lease_until<now()) order by available_at,id limit 1 for update skip locked;
 if not found then return null;end if;
 update wa.media_deletions set lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',attempt=attempt+1 where id=item.id returning * into item;
 return jsonb_build_object('id',item.id,'lease',item.lease,'path',item.path);
end $$;
create function wa.ma_wa_midia_excluir_resultado(tarefa uuid,reserva uuid,sucesso boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if sucesso then delete from wa.media_deletions where id=tarefa and lease=reserva;
 else update wa.media_deletions set lease_until=null,available_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempt,7))::integer)) where id=tarefa and lease=reserva;end if;
end $$;
create function public.ma_wa_midia_excluir_reservar() returns jsonb language sql security invoker set search_path='' as $$select wa.ma_wa_midia_excluir_reservar();$$;
create function public.ma_wa_midia_excluir_resultado(tarefa uuid,reserva uuid,sucesso boolean) returns void language sql security invoker set search_path='' as $$select wa.ma_wa_midia_excluir_resultado(tarefa,reserva,sucesso);$$;
revoke all on function wa.contact_delete_media() from public,anon,authenticated,service_role;
revoke all on function wa.ma_wa_midia_excluir_reservar(),wa.ma_wa_midia_excluir_resultado(uuid,uuid,boolean),public.ma_wa_midia_excluir_reservar(),public.ma_wa_midia_excluir_resultado(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function wa.ma_wa_midia_excluir_reservar(),wa.ma_wa_midia_excluir_resultado(uuid,uuid,boolean),public.ma_wa_midia_excluir_reservar(),public.ma_wa_midia_excluir_resultado(uuid,uuid,boolean) to service_role;
create or replace function private.ma_wa_ler_foto(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from wa.inbox i join wa.channels c on c.id=i.channel_id
 where object_name in(i.channel_id||'/'||i.id||'.jpg',i.channel_id||'/'||i.id||'.png') and wa.contact_history_allowed(c.municipio_id));
$$;
create or replace function wa.kick_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; credential text;
begin
 if not exists(select 1 from wa.channels where enabled) and not exists(select 1 from wa.media_deletions) then return;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='ma_whatsapp_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='ma_whatsapp_worker_secret';
 if endpoint is null or credential is null then return;end if;
 perform net.http_post(url:=endpoint||'/functions/v1/ma-whatsapp-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-ma-worker-secret',credential),body:='{}'::jsonb,timeout_milliseconds:=45000);
end $$;
commit;
