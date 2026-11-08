begin;
-- Fotos antigas podem ter sido ingeridas antes de a inbox guardar a referência.
-- Recuperar apenas objetos já existentes no bucket privado, com chave exata da entrada.
create function wa.contact_restore_media() returns integer language plpgsql set search_path='' as $backfill$
declare affected integer:=0;
begin
 if to_regclass('storage.objects') is not null then
  execute $sql$
   update wa.inbox i set media=jsonb_strip_nulls(jsonb_build_object('bucket','ma-whatsapp','path',o.name,
    'mime',o.metadata->>'mimetype','size',o.metadata->'size','sha256',i.event->'image'->>'sha256','source','stored_object_backfill'))
   from storage.objects o where o.bucket_id='ma-whatsapp' and i.event ? 'image' and i.media is null
   and o.name in (i.channel_id||'/'||i.id||'.jpg',i.channel_id||'/'||i.id||'.png')
   and o.metadata->>'mimetype' in ('image/jpeg','image/png')
  $sql$;
  get diagnostics affected=row_count;
 end if;
 return affected;
end $backfill$;
revoke all on function wa.contact_restore_media() from public,anon,authenticated,service_role;
insert into wa.operations(action,target) select 'contact_media_backfill',wa.contact_restore_media()::text;
update public.ma_configuracao set documento=jsonb_set(documento,'{labels,total_singular}',to_jsonb('contato'::text)),versao=versao+1 where id='contatos';
commit;
