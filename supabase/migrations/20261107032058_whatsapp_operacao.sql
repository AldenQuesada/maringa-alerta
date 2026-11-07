begin;
create function wa.ma_wa_operacao(canal uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare city text; result jsonb;
begin
 select municipio_id into strict city from wa.channels where id=canal;
 if auth.uid() is null or not (private.ma_admin() or private.ma_acesso(city,true)) then raise exception 'Forbidden' using errcode='42501';end if;
 select jsonb_build_object('pendentes',(select count(*) from wa.inbox where channel_id=canal and processed_at is null),
  'quarentena',(select count(*) from wa.inbox where channel_id=canal and processed_at is null and attempts>=5),
  'entregas',(select coalesce(jsonb_object_agg(state,n),'{}') from (select o.state,count(*) n from wa.outbox o join wa.sessions s on s.id=o.session_id where s.channel_id=canal group by o.state) x),
  'conclusoes',(select count(*) from wa.completions x join wa.sessions s on s.id=x.session_id where s.channel_id=canal)) into result;
 return result;
end $$;
create function public.ma_wa_operacao(canal uuid) returns jsonb language sql security invoker set search_path='' as $$
 select wa.ma_wa_operacao(canal);
$$;
revoke all on function public.ma_wa_operacao(uuid) from public,anon,service_role;
grant execute on function public.ma_wa_operacao(uuid) to authenticated;

-- Storage existe no Supabase; testes PostgreSQL puros não o emulam.
do $storage$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
   values('ma-whatsapp','ma-whatsapp',false,5242880,array['image/jpeg','image/png']) on conflict(id) do nothing;
 end if;
end $storage$;
create function private.ma_wa_ler_foto(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from wa.channels c
  where c.id::text=split_part(object_name,'/',1) and (private.ma_admin() or private.ma_acesso(c.municipio_id)));
$$;
revoke all on function private.ma_wa_ler_foto(text) from public,anon,service_role;
grant execute on function private.ma_wa_ler_foto(text) to authenticated;
do $policy$ begin
 if to_regclass('storage.objects') is not null then
  execute 'create policy ma_whatsapp_foto_leitura on storage.objects for select to authenticated using (bucket_id=''ma-whatsapp'' and private.ma_wa_ler_foto(name))';
 end if;
end $policy$;

-- Agendador durável: não depende da vida útil da requisição do webhook.
do $extensions$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then create extension if not exists pg_cron;end if;
 if exists(select 1 from pg_available_extensions where name='pg_net') then create extension if not exists pg_net;end if;
end $extensions$;
create function wa.kick_worker() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; credential text;
begin
 if not exists(select 1 from wa.channels where enabled) then return;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='ma_whatsapp_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='ma_whatsapp_worker_secret';
 if endpoint is null or credential is null then return;end if;
 perform net.http_post(url:=endpoint||'/functions/v1/ma-whatsapp-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-ma-worker-secret',credential),body:='{}'::jsonb,timeout_milliseconds:=45000);
end $$;
revoke all on function wa.kick_worker() from public,anon,authenticated,service_role;
do $schedule$ begin
 if to_regnamespace('cron') is not null and to_regnamespace('net') is not null then
  perform cron.schedule('ma-whatsapp-worker','* * * * *','select wa.kick_worker()');
 end if;
end $schedule$;

-- Fronteiras privilegiadas privadas; a API exposta usa SECURITY INVOKER.
grant usage on schema wa to authenticated;
revoke all on function wa.ma_wa_operacao(uuid) from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_operacao(uuid) to authenticated;
commit;
