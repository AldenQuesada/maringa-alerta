-- Somente no PostgreSQL de CI/descartável, onde Storage não é instalado.
begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',msg;end if;end$$;
grant execute on function pg_temp.assert(boolean,text) to authenticated,anon,service_role;
create schema storage;
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
do $test$
declare c wa.channels;good bigint;wrong bigint;
begin
 select * into strict c from wa.channels;
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'photo.fixture.good','550000009991',jsonb_build_object('timestamp',extract(epoch from now())::bigint::text,'image','{"id":"1"}'::jsonb)) returning id into good;
 insert into wa.inbox(channel_id,provider_id,contact,event) values(c.id,'photo.fixture.wrong','550000009992',jsonb_build_object('timestamp',extract(epoch from now())::bigint::text,'image','{"id":"2"}'::jsonb)) returning id into wrong;
 insert into storage.objects(bucket_id,name,metadata) values('ma-whatsapp',c.id||'/'||good||'.png','{"mimetype":"image/png","size":20}'),('another-bucket',c.id||'/'||wrong||'.png','{"mimetype":"image/png","size":20}');
 perform pg_temp.assert(wa.contact_restore_media()=1,'Exactly one trusted private object recovered');
 perform pg_temp.assert((select media->>'path'=c.id||'/'||good||'.png' from wa.inbox where id=good),'Recovered exact inbox object');
 perform pg_temp.assert((select media is null from wa.inbox where id=wrong),'Other bucket cannot be linked');
 perform pg_temp.assert(wa.contact_restore_media()=0,'Recovery idempotent');
 perform pg_temp.assert(not has_function_privilege('authenticated','wa.contact_restore_media()','execute'),'Browser cannot run recovery');
end $test$;
rollback;
