begin;
create function wa.template(body text, variables jsonb) returns text language plpgsql immutable set search_path='' as $$
declare k text;v jsonb;
begin
 for k,v in select * from jsonb_each(variables) loop body:=replace(body,'{'||k||'}',coalesce(v#>>'{}',''));end loop;
 return body;
end $$;
create function wa.render(s wa.sessions, error_key text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare c jsonb; n jsonb; body text; choices jsonb:='[]'; actions jsonb; b jsonb;
 f wa.flows; item record; summary text:=''; vars jsonb;
begin
 select config into strict c from wa.versions where id=s.version_id;
 select jsonb_build_object('municipio',dados->>'nome','uf',dados->>'uf','nome',s.answers->>'nome','protocolo',s.cycle::text)
 into vars from public.ma_prefeituras p join wa.channels ch on ch.municipio_id=p.id where ch.id=s.channel_id;
 if s.stage='menu' then
  body:=c->'texts'->>'welcome';
  for f in select * from wa.flows where version_id=s.version_id order by position loop
   choices:=choices||jsonb_build_array(jsonb_build_object('id',s.revision||':flow:'||f.key,'label',f.button));
   body:=body||E'\n'||f.position||'. '||f.title;
  end loop;
 elsif s.stage='question' then
  select definition into strict n from wa.nodes where version_id=s.version_id and flow=s.flow and position=s.position;
  body:=n->>'question';
  if s.position=(select min(position) from wa.nodes where version_id=s.version_id and flow=s.flow) then
   select intro||E'\n\n'||body into body from wa.flows where version_id=s.version_id and key=s.flow;
  end if;
  for item in select value,ordinality from jsonb_array_elements(coalesce(n->'options','[]')) with ordinality loop
   body:=body||E'\n'||item.ordinality||'. '||(item.value->>'value');
   if n->>'kind'='single' then choices:=choices||jsonb_build_array(jsonb_build_object('id',s.revision||':choice:'||item.ordinality,'label',item.value->>'button'));end if;
  end loop;
  if n->>'kind'='multi' then body:=body||E'\n\n'||(c->'texts'->>'multi_hint');end if;
  if not coalesce((n->>'required')::boolean,false) then
   actions:=c->'buttons'->'optional';
   if n->>'kind'='multi' then body:=body||E'\n'||(c->'texts'->>'zero_hint');end if;
  end if;
 elsif s.stage='review' then
  for item in select key,definition from wa.nodes where version_id=s.version_id and flow=s.flow order by position loop
   if s.answers ? item.key and s.answers->item.key<>'null' then
    summary:=summary||(item.definition->>'label')||': '||case jsonb_typeof(s.answers->item.key)
     when 'array' then (select coalesce(string_agg(value,', '),'—') from jsonb_array_elements_text(s.answers->item.key))
     when 'object' then c->'texts'->>'photo_received' else s.answers->>item.key end||E'\n';
   end if;
  end loop;
  body:=replace(c->'texts'->>'review','{resumo}',summary);actions:=c->'buttons'->'review';
 else
  select coalesce(c->'texts'->'completed'->>s.flow,c->'texts'->>'done') into body;
  if s.simulation then body:=c->'texts'->>'simulated';end if;
  actions:=c->'buttons'->'done';
 end if;
 for b in select value from jsonb_array_elements(coalesce(actions,'[]')) loop
  choices:=choices||jsonb_build_array(jsonb_build_object('id',s.revision||':action:'||(b->>'action'),'label',b->>'label'));
 end loop;
 if error_key is not null then body:=coalesce(c->'errors'->>error_key,c->'errors'->>'invalid')||E'\n\n'||body;end if;
 return jsonb_build_object('session_id',s.id,'revision',s.revision,'stage',s.stage,'kind',n->>'kind',
  'text',wa.template(body,vars),'buttons',choices,'simulation',s.simulation,'version_id',s.version_id);
end $$;
revoke all on all functions in schema wa from public,anon,authenticated,service_role;
commit;
