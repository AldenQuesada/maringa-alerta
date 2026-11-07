begin;
create function wa.advance(s wa.sessions) returns wa.sessions language plpgsql set search_path='' as $$
declare n wa.nodes;
begin
 for n in select * from wa.nodes where version_id=s.version_id and flow=s.flow order by position loop
  if not wa.matches(n.definition->'condition',s.answers) then s.answers:=s.answers-n.key;end if;
 end loop;
 select * into n from wa.nodes where version_id=s.version_id and flow=s.flow and position>s.position
  and wa.matches(definition->'condition',s.answers) order by position limit 1;
 if found then s.position:=n.position;s.stage:='question';else s.stage:='review';end if;
 return s;
end $$;
create function wa.step(session uuid, event jsonb) returns jsonb language plpgsql set search_path='' as $$
declare s wa.sessions; f wa.flows; n wa.nodes; validated jsonb; err text; action text;
 part text[]; rendered jsonb; b jsonb; input jsonb:=jsonb_build_object('text',event->>'text','media',event->'media');
begin
 select * into strict s from wa.sessions where id=session for update;
 if event='{}' then return wa.render(s);end if;
 rendered:=wa.render(s);
 if event ? 'button' then
  if not exists(select 1 from jsonb_array_elements(rendered->'buttons') x where x->>'id'=event->>'button') then err:='stale';
  else
   part:=string_to_array(event->>'button',':');
   if part[2]='choice' then input:=jsonb_build_object('text',part[3]);
   elsif part[2]='action' then action:=part[3];input:=jsonb_build_object('action',action);
   elsif part[2]='flow' then action:='flow';end if;
  end if;
 end if;
 if err is null then
  if action='restart' then
   s.flow:=null;s.stage:='menu';s.position:=0;s.answers:='{}';s.cycle:=gen_random_uuid();
   select version_id into s.version_id from wa.channels where id=s.channel_id;
  elsif s.stage='menu' then
   select * into f from wa.flows where version_id=s.version_id and
    ((action='flow' and key=part[3]) or (action is null and position::text=btrim(event->>'text')));
   if not found then err:='menu';else s.flow:=f.key;s.answers:='{}';s.position:=0;s:=wa.advance(s);end if;
  elsif s.stage='question' then
   select * into strict n from wa.nodes where version_id=s.version_id and flow=s.flow and position=s.position;
   validated:=wa.validate(n.definition,input);
   if validated ? 'error' then err:=validated->>'error';
   else s.answers:=s.answers||jsonb_build_object(n.key,validated->'value');s:=wa.advance(s);end if;
  elsif s.stage='review' then
   if action='correct' then s.position:=0;s:=wa.advance(s);
   elsif action='confirm' then
    select * into strict f from wa.flows where version_id=s.version_id and key=s.flow;
    if not wa.matches(f.condition,s.answers) then
     err:='offer_required';s.position:=0;s:=wa.advance(s);
    else
     -- Revalida obrigatoriedade e consentimentos antes da projeção atômica.
     for n in select * from wa.nodes where version_id=s.version_id and flow=s.flow order by position loop
      if wa.matches(n.definition->'condition',s.answers) then
       if coalesce((n.definition->>'required')::boolean,false) and coalesce(s.answers->n.key,'null') in ('null','[]','""') then
        err:='required';s.position:=n.position;s.stage:='question';exit;
       end if;
      else s.answers:=s.answers-n.key;end if;
     end loop;
     if err is null then perform wa.project(s);s.stage:='done';end if;
    end if;
   else err:='review';end if;
  else err:='done';end if;
 end if;
 s.revision:=s.revision+1;
 update wa.sessions set version_id=s.version_id,flow=s.flow,stage=s.stage,position=s.position,revision=s.revision,
  answers=s.answers,cycle=s.cycle,updated_at=now() where id=s.id;
 return wa.render(s,err);
end $$;
create function wa.ma_wa_simular(canal uuid, requisicao uuid, entrada jsonb default '{}', sessao uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c wa.channels; s wa.sessions; result jsonb;
begin
 if auth.uid() is null or requisicao is null or octet_length(entrada::text)>20000 then raise exception 'Invalid request' using errcode='42501';end if;
 select * into strict c from wa.channels where id=canal;
 if not (private.ma_admin() or private.ma_acesso(c.municipio_id,true)) then raise exception 'Forbidden' using errcode='42501';end if;
 if sessao is null then
  insert into wa.sessions(channel_id,contact,simulation,actor,version_id)
   values(c.id,'sim:'||auth.uid()||':'||requisicao,true,auth.uid(),c.version_id)
   on conflict(channel_id,contact) do nothing;
  select * into strict s from wa.sessions where channel_id=c.id and contact='sim:'||auth.uid()||':'||requisicao for update;
 else
  select * into strict s from wa.sessions where id=sessao and channel_id=c.id and actor=auth.uid() and simulation for update;
 end if;
 select response into result from wa.simulation_requests where session_id=s.id and request_id=requisicao;
 if found then return result;end if;
 result:=wa.step(s.id,entrada);
 insert into wa.simulation_requests values(s.id,requisicao,result);
 return result;
end $$;
create function public.ma_wa_simular(canal uuid, requisicao uuid, entrada jsonb default '{}', sessao uuid default null) returns jsonb language sql security invoker set search_path='' as $$
 select wa.ma_wa_simular(canal,requisicao,entrada,sessao);
$$;
create function wa.ma_wa_canais() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'municipio_id',c.municipio_id,'municipio',p.dados->>'nome',
 'numero',c.display_phone,'ativo',c.enabled,'envio_ativo',c.outbound_enabled,'versao',v.name,'publicado_em',v.published_at)),'[]')
 from wa.channels c join public.ma_prefeituras p on p.id=c.municipio_id join wa.versions v on v.id=c.version_id
 where auth.uid() is not null and (private.ma_admin() or private.ma_acesso(c.municipio_id,true));
$$;
create function public.ma_wa_canais() returns jsonb language sql security invoker set search_path='' as $$
 select wa.ma_wa_canais();
$$;
revoke all on all functions in schema wa from public,anon,authenticated,service_role;
revoke all on function public.ma_wa_simular(uuid,uuid,jsonb,uuid),public.ma_wa_canais() from public,anon,service_role;
grant execute on function public.ma_wa_simular(uuid,uuid,jsonb,uuid),public.ma_wa_canais() to authenticated;

-- Fronteiras privilegiadas privadas; a API exposta usa SECURITY INVOKER.
grant usage on schema wa to authenticated;
revoke all on function wa.ma_wa_simular(uuid,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_simular(uuid,uuid,jsonb,uuid) to authenticated;
grant usage on schema wa to authenticated;
revoke all on function wa.ma_wa_canais() from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_canais() to authenticated;
commit;
