begin;
-- DSL restrita: dados declarativos, nunca SQL/JavaScript fornecido pelo catálogo.
create function wa.matches(rule jsonb, answers jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare r jsonb;
begin
 if rule is null or rule='{}' then return true;end if;
 if rule ? 'any' then
  for r in select value from jsonb_array_elements(rule->'any') loop
   if wa.matches(r,answers) then return true;end if;
  end loop;return false;
 elsif rule ? 'all' then
  for r in select value from jsonb_array_elements(rule->'all') loop
   if not wa.matches(r,answers) then return false;end if;
  end loop;return true;
 elsif rule ? 'eq' then return coalesce(answers->(rule->>'field')=rule->'eq',false);
 elsif rule ? 'contains' then return coalesce((answers->(rule->>'field')) @> jsonb_build_array(rule->'contains'),false);
 elsif rule ? 'nonempty' then return coalesce(answers->(rule->>'field') not in ('null','[]','""'),false);
 end if;
 raise exception 'Unknown catalog condition';
end $$;
create function wa.validate(node jsonb, input jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare t text:=btrim(coalesce(input->>'text','')); kind text:=node->>'kind';
 v jsonb; result jsonb:='[]'; part text; n integer; opts jsonb:=node->'options';
begin
 if input->>'action'='skip' then
  if coalesce((node->>'required')::boolean,false) then return '{"error":"required"}';end if;
  return jsonb_build_object('value',case when kind='multi' then '[]'::jsonb else 'null'::jsonb end);
 end if;
 if kind='photo' then
  if input->'media'->>'path' is null then return '{"error":"photo"}';end if;
  return jsonb_build_object('value',input->'media');
 end if;
 if t='' then return '{"error":"required"}';end if;
 if length(t)>coalesce((node->>'max_length')::integer,2000) then return '{"error":"too_long"}';end if;
 if kind in ('single','multi') then
  if kind='single' then
   select value->'value' into v from jsonb_array_elements(opts) with ordinality o(value,idx)
    where idx::text=t or value->>'value'=t limit 1;
   if v is null then return '{"error":"choice"}';end if;
  else
   if t='0' and not coalesce((node->>'required')::boolean,false) then return '{"value":[]}';end if;
   t:=regexp_replace(t,'\s+e\s+',',','gi');
   for part in select regexp_split_to_table(t,'[,;\s]+') loop
    if part !~ '^[0-9]{1,3}$' then return '{"error":"multi"}';end if;
    n:=part::integer;
    if n<1 or n>jsonb_array_length(opts) then return '{"error":"choice"}';end if;
    v:=opts->(n-1)->'value';
    if not result @> jsonb_build_array(v) then result:=result||jsonb_build_array(v);end if;
   end loop;
   if jsonb_array_length(result)>1 and node ? 'exclusive' and result @> jsonb_build_array(node->'exclusive') then
    return '{"error":"exclusive"}';end if;
   v:=result;
  end if;
 elsif kind='tel' then
  t:=regexp_replace(t,'[^0-9]','','g');
  if length(t) not between 10 and 15 then return '{"error":"phone"}';end if;v:=to_jsonb(t);
 elsif kind='integer' then
  if t !~ '^[0-9]{1,7}$' then return '{"error":"integer"}';end if;v:=to_jsonb(t::integer);
 else v:=to_jsonb(t);
 end if;
 return jsonb_build_object('value',v);
end $$;
create function wa.publish(version uuid) returns void language plpgsql set search_path='' as $$
declare f wa.flows; n wa.nodes; o jsonb;
begin
 if not exists(select 1 from wa.versions where id=version and published_at is null) then raise exception 'Draft required';end if;
 if not exists(select 1 from wa.flows where version_id=version) then raise exception 'Empty catalog';end if;
 for f in select * from wa.flows where version_id=version loop
  if not exists(select 1 from wa.nodes where version_id=version and flow=f.key) then raise exception 'Empty flow';end if;
  for o in select value from jsonb_array_elements(f.outputs) loop
   if o->>'collection' not in ('voluntarios','bases','solicitacoes','relatos') or jsonb_typeof(o->'fields')<>'object' then
    raise exception 'Invalid projection';end if;
  end loop;
 end loop;
 for n in select * from wa.nodes where version_id=version loop
  if coalesce(n.definition->>'question','')='' or coalesce(n.definition->>'label','')='' then raise exception 'Missing question/label';end if;
  if n.definition->>'kind' in ('single','multi') and coalesce(jsonb_array_length(n.definition->'options'),0)=0 then raise exception 'Missing options';end if;
  for o in select value from jsonb_array_elements(coalesce(n.definition->'options','[]')) loop
   if coalesce(o->>'value','')='' or coalesce(o->>'button','')='' or length(o->>'button')>20 then raise exception 'Invalid option';end if;
  end loop;
 end loop;
 update wa.versions set published_at=now() where id=version;
end $$;
revoke all on all functions in schema wa from public,anon,authenticated,service_role;
commit;
