begin;
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
grant execute on function pg_temp.assert(boolean,text) to authenticated,anon,service_role;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-0000-0000-000000000992','wa-editor@example.invalid',now());
insert into private.ma_admins values('00000000-0000-0000-0000-000000000992');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000992',true);
do $test$
declare v uuid;c wa.channels;flows jsonb;config jsonb;s uuid;r jsonb;before_count integer;
begin
 select * into strict c from wa.channels;select x.config into config from wa.versions x where id=c.version_id;
 select jsonb_agg(to_jsonb(f)||jsonb_build_object('nodes',(select jsonb_agg(to_jsonb(n)) from wa.nodes n where n.version_id=f.version_id and n.flow=f.key))) into flows from wa.flows f where version_id=c.version_id;
 v:=public.ma_wa_publicar('teste-versao-2',config,flows);
 perform pg_temp.assert(exists(select 1 from wa.versions where id=v and published_at is not null),'Catalog authorship');
 insert into wa.sessions(channel_id,contact,version_id) values(c.id,'550000000009',c.version_id) returning id into s;
 perform public.ma_wa_usar_versao(c.id,v);
 perform pg_temp.assert((select version_id=c.version_id from wa.sessions where id=s),'Existing session pinned to its version');
 r:=wa.step(s,'{}');perform pg_temp.assert((r->>'version_id')::uuid=c.version_id,'Rendering keeps session version');
 select count(*) into before_count from wa.versions;
 begin
  perform public.ma_wa_publicar('invalida',config,jsonb_set(flows,'{0,nodes,0,definition,condition}','{"field":"future_missing","eq":"yes"}'));
  raise exception 'invalid catalog accepted';
 exception when raise_exception then if sqlerrm='invalid catalog accepted' then raise;end if;end;
 perform pg_temp.assert((select count(*)=before_count from wa.versions),'Invalid catalog rollback is atomic');
end $test$;
set local role anon;
do $test$ begin
 begin perform public.ma_wa_canais();raise exception 'anonymous access';exception when insufficient_privilege then null;end;
 begin perform public.ma_wa_reservar();raise exception 'anonymous send';exception when insufficient_privilege then null;end;
end $test$;
reset role;
rollback;
