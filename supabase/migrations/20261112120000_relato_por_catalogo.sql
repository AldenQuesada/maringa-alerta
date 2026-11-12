begin;
-- Relato guiado pelo catálogo. O cidadão escolhe a categoria e o tipo por botões, manda o local (localização do
-- WhatsApp ou endereço) e a foto. As opções vêm de ocorrenciaTipos, o mesmo catálogo do mapa: um tipo cadastrado na
-- Gestão aparece no WhatsApp sem nova versão de fluxo. Proteção animal deixa de ser item próprio do menu e vira uma
-- categoria do relato. Preparação apenas: o canal só muda de versão por wa.ma_wa_usar_versao.

-- 1) Categorias do relato, em ordem de exibição. Uma categoria só aparece se o município tiver tipo nela.
update public.ma_configuracao set documento=documento||jsonb_build_object('ocorrenciaCategorias',$c$[
 {"id":"chuva","nome":"Chuva e alagamento","botao":"Chuva e alagamento"},
 {"id":"vento","nome":"Vento e tempestade","botao":"Vento e tempestade"},
 {"id":"terra","nome":"Deslizamento, erosão e desabamento","botao":"Desabamento e erosão"},
 {"id":"fogo","nome":"Incêndio","botao":"Incêndio"},
 {"id":"animais","nome":"Proteção animal","botao":"Proteção animal"}
]$c$::jsonb),versao=versao+1 where id='operacao';

-- 2) Pergunta de local: aceita a localização do WhatsApp ou o endereço digitado.
alter table wa.nodes drop constraint nodes_definition_check;
alter table wa.nodes add constraint nodes_definition_check check(definition->>'kind' in ('text','tel','single','multi','photo','integer','location'));

-- 3) Opções vindas do catálogo, resolvidas pelo servidor a cada pergunta.
create function wa.opcoes(s wa.sessions,node jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare cidade text; fonte jsonb:=node->'catalog'; r jsonb;
begin
 if fonte is null then return coalesce(node->'options','[]');end if;
 select municipio_id into strict cidade from wa.channels where id=s.channel_id;
 if fonte->>'source'='categorias' then
  select coalesce(jsonb_agg(jsonb_build_object('value',c->>'id','button',left(c->>'botao',20),'label',c->>'nome') order by o),'[]') into r
   from public.ma_configuracao m,jsonb_array_elements(m.documento->'ocorrenciaCategorias') with ordinality x(c,o)
   where m.id='operacao' and exists(select 1 from public.ma_cadastros t where t.municipio_id=cidade and t.colecao='ocorrenciaTipos'
    and t.arquivado_em is null and t.dados->>'categoria'=c->>'id');
 elsif fonte->>'source'='tipos' then
  select coalesce(jsonb_agg(jsonb_build_object('value',t.id,'button',left(coalesce(nullif(t.dados->>'botao_whatsapp',''),t.dados->>'nome'),20),'label',t.dados->>'nome')
   order by case when t.dados->>'ordem_whatsapp' ~ '^[0-9]{1,4}$' then (t.dados->>'ordem_whatsapp')::integer else 9999 end,t.dados->>'nome',t.id),'[]') into r
   from public.ma_cadastros t where t.municipio_id=cidade and t.colecao='ocorrenciaTipos' and t.arquivado_em is null
    and t.dados->>'categoria'=s.answers->>(fonte->>'answer');
 else raise exception 'Unknown catalog source';end if;
 -- Limite da lista do WhatsApp.
 return (select coalesce(jsonb_agg(x order by i),'[]') from jsonb_array_elements(r) with ordinality y(x,i) where i<=10);
end $$;
create function wa.no_resolvido(s wa.sessions,node jsonb) returns jsonb language sql stable set search_path='' as $$
 select case when node ? 'catalog' then node||jsonb_build_object('options',wa.opcoes(s,node)) else node end $$;
revoke all on function wa.opcoes(wa.sessions,jsonb) from public,anon,authenticated;
revoke all on function wa.no_resolvido(wa.sessions,jsonb) from public,anon,authenticated;

-- 4) Validação: igual à vigente, mais a pergunta de local.
create or replace function wa.validate(node jsonb, input jsonb) returns jsonb language plpgsql immutable set search_path='' as $function$
declare t text:=btrim(coalesce(input->>'text','')); kind text:=node->>'kind';
 v jsonb; result jsonb:='[]'; part text; n integer; opts jsonb:=node->'options'; lat numeric; lng numeric;
begin
 if input->>'action'='skip' then
  if coalesce((node->>'required')::boolean,false) then return '{"error":"required"}';end if;
  return jsonb_build_object('value',case when kind='multi' then '[]'::jsonb else 'null'::jsonb end);
 end if;
 if kind='photo' then
  if input->'media'->>'path' is null then return '{"error":"photo"}';end if;
  return jsonb_build_object('value',input->'media');
 end if;
 if kind='location' and jsonb_typeof(input->'location')='object' then
  if coalesce(input->'location'->>'latitude','') !~ '^-?[0-9]{1,3}(\.[0-9]{1,15})?$' or coalesce(input->'location'->>'longitude','') !~ '^-?[0-9]{1,3}(\.[0-9]{1,15})?$' then
   return '{"error":"location"}';end if;
  lat:=(input->'location'->>'latitude')::numeric;lng:=(input->'location'->>'longitude')::numeric;
  if lat not between -90 and 90 or lng not between -180 and 180 then return '{"error":"location"}';end if;
  return jsonb_build_object('value',jsonb_strip_nulls(jsonb_build_object('lat',lat,'lng',lng,
   'endereco',nullif(left(regexp_replace(concat_ws(', ',nullif(btrim(input->'location'->>'name'),''),nullif(btrim(input->'location'->>'address'),'')),'\s+',' ','g'),coalesce((node->>'max_length')::integer,2000)),''))));
 end if;
 if t='' then return '{"error":"required"}';end if;
 if length(t)>coalesce((node->>'max_length')::integer,2000) then return '{"error":"too_long"}';end if;
 if kind='location' then return jsonb_build_object('value',jsonb_build_object('endereco',t));end if;
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
    if n=0 then return '{"error":"multi_zero"}';end if;
    if n<1 or n>jsonb_array_length(opts) then return '{"error":"multi_range"}';end if;
    v:=opts->(n-1)->'value';
    if not result @> jsonb_build_array(v) then result:=result||jsonb_build_array(v);end if;
   end loop;
   if jsonb_array_length(result)>1 and node ? 'exclusive' and result @> jsonb_build_array(node->'exclusive') then
    return '{"error":"exclusive"}';end if;
   v:=result;
  end if;
 elsif kind='tel' then
  t:=regexp_replace(t,'[^0-9]','','g');
  if length(t) not between coalesce((node->>'min_digits')::integer,10) and coalesce((node->>'max_digits')::integer,15) then return '{"error":"phone"}';end if;v:=to_jsonb(t);
 elsif kind='integer' then
  if t !~ '^[0-9]{1,7}$' then return '{"error":"integer"}';end if;v:=to_jsonb(t::integer);
 else v:=to_jsonb(t);
 end if;
 return jsonb_build_object('value',v);
end $function$;

-- 5) Renderização: igual à vigente, mais opções do catálogo, rótulo do catálogo no resumo e pedido de localização.
create or replace function wa.render(s wa.sessions, error_key text default null::text) returns jsonb language plpgsql stable set search_path='' as $function$
declare c jsonb;n jsonb;body text;choices jsonb:='[]';actions jsonb;b jsonb;f wa.flows;item record;summary text:='';vars jsonb;intro text;canonical boolean; messages jsonb:='[]'; asset jsonb; question_text text;
begin
 select config into strict c from wa.versions where id=s.version_id;canonical:=c ? 'layout';
 select jsonb_build_object('municipio',p.dados->>'nome','uf',p.dados->>'uf','nome',s.answers->>'nome','protocolo',s.cycle::text,'marca',coalesce(p.dados->>'marca',wa.template(c->'texts'->>'brand',jsonb_build_object('municipio',p.dados->>'nome'))))
 into vars from public.ma_prefeituras p join wa.channels ch on ch.municipio_id=p.id where ch.id=s.channel_id;
 vars:=s.answers||vars||wa.variables(s,c);
 if s.stage='menu' then
  body:=c->'texts'->>'welcome';
  for f in select * from wa.flows where version_id=s.version_id order by position loop
   choices:=choices||jsonb_build_array(jsonb_build_object('id',s.revision||':flow:'||f.key,'label',f.button,'full_label',f.button));
   if coalesce((c->'layout'->>'menu_numbered')::boolean,true) then body:=body||E'\n'||f.position||'. '||f.title;end if;
  end loop;
 elsif s.stage='question' then
  select definition into strict n from wa.nodes where version_id=s.version_id and flow=s.flow and position=s.position;
  n:=wa.no_resolvido(s,n);
  body:=case when not s.answers ? (select key from wa.nodes where version_id=s.version_id and flow=s.flow and position=s.position) then coalesce(n->>'initial_question',n->>'question') else n->>'question' end;
  if s.position=(select min(position) from wa.nodes where version_id=s.version_id and flow=s.flow) then
   select f1.intro into intro from wa.flows f1 where f1.version_id=s.version_id and f1.key=s.flow;
   if intro<>'' then body:=intro||E'\n\n'||body;end if;
  end if;
  if n->>'kind'='multi' then
   if canonical then body:=body||E'\n';end if;
   for item in select value,ordinality from jsonb_array_elements(n->'options') with ordinality loop
    body:=body||E'\n'||item.ordinality||'. '||(item.value->>'value');
   end loop;
   if canonical and not coalesce((n->>'required')::boolean,false) then body:=body||E'\n'||(c->'texts'->>'zero_option');end if;
   body:=body||E'\n\n'||(c->'texts'->>'multi_hint');
   if not coalesce((n->>'required')::boolean,false) then body:=body||case when canonical then '' else E'\n' end||(c->'texts'->>'zero_hint');end if;
  elsif n->>'kind'='single' then
   for item in select value,ordinality from jsonb_array_elements(n->'options') with ordinality loop
    if coalesce((c->'layout'->>'single_numbered')::boolean,true) then body:=body||E'\n'||item.ordinality||'. '||(item.value->>'value');end if;
    choices:=choices||jsonb_build_array(jsonb_build_object('id',s.revision||':choice:'||item.ordinality,'label',item.value->>'button','full_label',coalesce(item.value->>'label',item.value->>'value')));
   end loop;
  end if;
  if not coalesce((n->>'required')::boolean,false) and (n->>'kind'<>'multi' or coalesce((c->'layout'->>'multi_skip_button')::boolean,true)) then
   actions:=case when n->>'kind'='photo' then coalesce(c->'buttons'->'photo',c->'buttons'->'optional') else c->'buttons'->'optional' end;
  end if;
 elsif s.stage='review' then
  for item in select key,definition from wa.nodes where version_id=s.version_id and flow=s.flow order by position loop
   if s.answers ? item.key and s.answers->item.key not in ('null','""','[]') then
    summary:=summary||(item.definition->>'label')||': '||case jsonb_typeof(s.answers->item.key)
     when 'array' then (select coalesce(string_agg(value,', '),'') from jsonb_array_elements_text(s.answers->item.key))
     when 'object' then case when item.definition->>'kind'='location' then coalesce(s.answers->item.key->>'endereco',c->'texts'->>'location_received') else c->'texts'->>'photo_received' end
     else case when item.definition ? 'catalog' then coalesce((select o->>'label' from jsonb_array_elements(wa.opcoes(s,item.definition)) o where o->>'value'=s.answers->>item.key limit 1),s.answers->>item.key)
      else s.answers->>item.key end end||E'\n';
   end if;
  end loop;
  body:=replace(c->'texts'->>'review','{resumo}',rtrim(summary,E'\n'));
  actions:=coalesce(c->'buttons'->'review_by_flow'->s.flow,c->'buttons'->'review');
 else
  body:=coalesce(c->'texts'->'completed'->>s.flow,c->'texts'->>'done');
  if s.simulation then body:=coalesce(c->'texts'->'simulated_completed'->>s.flow,c->'texts'->>'simulated');end if;actions:=c->'buttons'->'done';
 end if;
 for b in select value from jsonb_array_elements(coalesce(actions,'[]')) loop
  choices:=choices||jsonb_build_array(jsonb_build_object('id',s.revision||':action:'||(b->>'action'),'label',coalesce(b->>'button',b->>'label'),'full_label',b->>'label'));
 end loop;
 if n is not null then vars:=vars||jsonb_build_object('count',jsonb_array_length(coalesce(n->'options','[]')),'exclusive',n->>'exclusive');end if;
 if error_key is not null then body:=coalesce(c->'errors'->>error_key,c->'errors'->>'invalid')||E'\n\n'||body;end if;
 -- A ordem editorial e a imagem pertencem ao catálogo versionado.
 if s.stage='question' and n ? 'initial_asset' and not s.answers ? (select key from wa.nodes where version_id=s.version_id and flow=s.flow and position=s.position) then
  asset:=c->'assets'->(n->>'initial_asset');
  if asset is not null then messages:=messages||jsonb_build_array(jsonb_build_object('text',asset->>'caption','image',asset));end if;
 end if;
 question_text:=wa.template(body,vars);
 if coalesce(intro,'')<>'' and error_key is null then
  messages:=messages||jsonb_build_array(jsonb_build_object('text',wa.template(intro,vars)));
  question_text:=substr(question_text,length(wa.template(intro,vars))+3);
 end if;
 -- Pergunta de local: o WhatsApp mostra o botão de enviar localização; o endereço digitado também vale.
 messages:=messages||jsonb_build_array(jsonb_build_object('text',question_text,'buttons',choices)||
  case when s.stage='question' and n->>'kind'='location' and jsonb_array_length(choices)=0 then '{"location_request":true}'::jsonb else '{}'::jsonb end);
 return jsonb_build_object('session_id',s.id,'revision',s.revision,'stage',s.stage,'kind',n->>'kind','text',wa.template(body,vars),
  'messages',messages,'buttons',choices,'list_button',c->'texts'->>'list_button','list_title',c->'texts'->>'list_title','simulation',s.simulation,'version_id',s.version_id);
end $function$;

-- 6) Passo: igual ao vigente, mais a localização na entrada e a validação contra as opções do catálogo.
create or replace function wa.step(session uuid, event jsonb) returns jsonb language plpgsql set search_path='' as $function$
declare s wa.sessions; f wa.flows; n wa.nodes; validated jsonb; err text; action text;
 previous_stage text;previous_position integer;part text[]; rendered jsonb; b jsonb; input jsonb:=jsonb_strip_nulls(jsonb_build_object('text',event->>'text','media',event->'media','location',event->'location'));
begin
 select * into strict s from wa.sessions where id=session for update;
 if event='{}' then return wa.render(s);end if;
 previous_stage:=s.stage;previous_position:=s.position;
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
   if not found then err:=null;else s.flow:=f.key;s.answers:='{}';s.position:=0;s:=wa.advance(s);end if;
  elsif s.stage='question' then
   select * into strict n from wa.nodes where version_id=s.version_id and flow=s.flow and position=s.position;
   validated:=wa.validate(wa.no_resolvido(s,n.definition),input);
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
 if s.stage='review' then
  select * into strict f from wa.flows where version_id=s.version_id and key=s.flow;
  if not wa.matches(f.condition,s.answers) then
   err:='offer_required';
   select position into s.position from wa.nodes where version_id=s.version_id and flow=s.flow and coalesce((definition->>'condition_retry')::boolean,false) order by position limit 1;
   if s.position is null then select min(position) into s.position from wa.nodes where version_id=s.version_id and flow=s.flow;end if;
   s.stage:='question';
  end if;
 end if;
 s.revision:=s.revision+1;
 update wa.sessions set version_id=s.version_id,flow=s.flow,stage=s.stage,position=s.position,revision=s.revision,
  answers=s.answers,cycle=s.cycle,updated_at=now() where id=s.id;
 rendered:=wa.render(s,err);
 if action='correct' then
  select config->'texts'->>'correction' into action from wa.versions where id=s.version_id;
  if action is not null then
   rendered:=jsonb_set(rendered,'{text}',to_jsonb(action||E'\n\n'||(rendered->>'text')));
   rendered:=jsonb_set(rendered,'{messages}',jsonb_build_array(jsonb_build_object('text',rendered->>'text','buttons',rendered->'buttons')));
  end if;
 end if;
 -- Não repetir a imagem de apresentação ao validar novamente a mesma pergunta.
 if previous_stage=s.stage and previous_position=s.position then
  rendered:=jsonb_set(rendered,'{messages}',(select coalesce(jsonb_agg(m),'[]') from jsonb_array_elements(rendered->'messages') m where not m ? 'image'));
 end if;
 return rendered;
end $function$;

-- 7) Projeção: igual à vigente, mais parte de uma resposta (path) e o nome do perfil do WhatsApp.
create or replace function wa.project(s wa.sessions) returns jsonb language plpgsql set search_path='' as $function$
declare o jsonb; field record; d jsonb; v jsonb; rid text; result jsonb:='[]'; city text; existing jsonb;
begin
 if s.simulation then return '[]';end if;
 select records into existing from wa.completions where cycle=s.cycle;
 if found then return existing;end if;
 select c.municipio_id into strict city from wa.channels c join public.ma_prefeituras p on p.id=c.municipio_id
  where c.id=s.channel_id and c.enabled and p.status='ativa';
 for o in select value from wa.flows f, jsonb_array_elements(f.outputs) where f.version_id=s.version_id and f.key=s.flow loop
  if not wa.matches(o->'condition',s.answers) then continue;end if;
  if o->>'collection' not in ('voluntarios','bases','solicitacoes','relatos','inscritos') then raise exception 'Invalid projection target';end if;
  rid:=null;
  if o->>'identity'='contact' then
   select record_id into rid from wa.contact_records where channel_id=s.channel_id and contact=s.contact and output_key=o->>'key';
  end if;
  rid:=coalesce(rid,gen_random_uuid()::text);d:='{}';
  for field in select * from jsonb_each(o->'fields') loop
   if field.value ? 'answer' then
    v:=s.answers->(field.value->>'answer');
    if field.value ? 'path' and jsonb_typeof(v)='object' then v:=v->(field.value->>'path');elsif field.value ? 'path' then v:=null;end if;
    v:=coalesce(v,'null'::jsonb);
   elsif field.value ? 'constant' then v:=field.value->'constant';
   elsif field.value->>'context'='now' then v:=to_jsonb(now());
   elsif field.value->>'context'='contact' then v:=to_jsonb(s.contact);
   elsif field.value->>'context'='profile_name' then
    v:=coalesce((select to_jsonb(nullif(btrim(i.event->>'profile_name'),'')) from wa.inbox i where i.channel_id=s.channel_id and i.contact=s.contact order by i.id desc limit 1),'null'::jsonb);
   else raise exception 'Unknown mapping';end if;
   d:=d||jsonb_build_object(field.key,v);
  end loop;
  d:=d||jsonb_build_object('id',rid,'municipioId',city,'whatsapp_protocolo',s.cycle,'whatsapp_canal',s.channel_id);
  insert into public.ma_cadastros(municipio_id,colecao,id,dados) values(city,o->>'collection',rid,d)
   on conflict(municipio_id,colecao,id) do update set dados=public.ma_cadastros.dados||excluded.dados,arquivado_em=null;
  if o->>'identity'='contact' then
   insert into wa.contact_records values(s.channel_id,s.contact,o->>'key',rid)
    on conflict(channel_id,contact,output_key) do nothing;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('collection',o->>'collection','id',rid));
 end loop;
 insert into wa.completions values(s.cycle,s.id,s.version_id,s.flow,result,now());
 return result;
end $function$;

-- 8) Publicação: igual à vigente, aceitando pergunta de catálogo, pergunta de local, path e nome do perfil.
create or replace function wa.publish(version uuid) returns void language plpgsql set search_path='' as $function$
declare c jsonb;f wa.flows;n wa.nodes;b jsonb;o jsonb;field record;key text;
begin
 select config into strict c from wa.versions where id=version and published_at is null;
 foreach key in array array['welcome','controls','multi_hint','zero_hint','photo_received','review','done','simulated'] loop
  if length(coalesce(c->'texts'->>key,'')) not between 1 and 3000 then raise exception 'Missing or excessive text: %',key;end if;
 end loop;
 foreach key in array array['required','too_long','phone','integer','choice','multi','exclusive','photo','stale','menu','review','done','offer_required','invalid'] loop
  if length(coalesce(c->'errors'->>key,'')) not between 1 and 500 then raise exception 'Missing error text: %',key;end if;
 end loop;
 foreach key in array array['optional','review','done'] loop
  if coalesce(jsonb_array_length(c->'buttons'->key),0) not between 1 and 3 then raise exception 'Invalid button set';end if;
  for b in select value from jsonb_array_elements(c->'buttons'->key) loop
   if b->>'action' not in ('skip','confirm','correct','restart') or length(coalesce(b->>'button',b->>'label',''))  not between 1 and 20 then raise exception 'Invalid button';end if;
  end loop;
 end loop;
 if (select count(*) from wa.flows where version_id=version)>10 then raise exception 'Too many menu entries';end if;
 for f in select * from wa.flows where version_id=version loop
  perform wa.check_rule(f.condition,version,f.key,2147483647);
  for o in select value from jsonb_array_elements(f.outputs) loop
   perform wa.check_rule(o->'condition',version,f.key,2147483647);
   if o->>'identity' not in ('contact','cycle') or coalesce(o->>'key','')='' then raise exception 'Invalid output identity';end if;
   for field in select * from jsonb_each(o->'fields') loop
    if field.value ? 'answer' then
     if not exists(select 1 from wa.nodes node where node.version_id=version and node.flow=f.key and node.key=field.value->>'answer') then raise exception 'Invalid answer mapping';end if;
     if field.value ? 'path' and coalesce(field.value->>'path','') !~ '^[a-z_]{1,40}$' then raise exception 'Invalid answer path';end if;
    elsif not field.value ? 'constant' and coalesce(field.value->>'context','') not in ('now','contact','profile_name') then raise exception 'Invalid field mapping';end if;
   end loop;
  end loop;
 end loop;
 for n in select * from wa.nodes where version_id=version loop
  perform wa.check_rule(n.definition->'condition',version,n.flow,n.position);
  if n.definition ? 'initial_asset' then
   b:=c->'assets'->(n.definition->>'initial_asset');
   if b is null or coalesce(b->>'url','') !~ '^https://' or b->>'mime_type' not in ('image/png','image/jpeg')
    or coalesce(b->>'sha256','') !~ '^[0-9a-f]{64}$' or length(coalesce(b->>'caption',''))>1024 then raise exception 'Invalid image catalog reference';end if;
  end if;
  if n.definition ? 'catalog' then
   if n.definition->>'kind'<>'single' or n.definition ? 'options' or n.definition->'catalog'->>'source' not in ('categorias','tipos') then raise exception 'Invalid catalog question';end if;
   if n.definition->'catalog'->>'source'='tipos' then
    perform wa.check_rule(jsonb_build_object('field',n.definition->'catalog'->>'answer','nonempty',true),version,n.flow,n.position);
   end if;
  end if;
  if n.definition->>'kind'='location' and not coalesce((n.definition->>'required')::boolean,false) then raise exception 'Location question must be required';end if;
  if length(n.definition->>'question')>3000 or coalesce((n.definition->>'max_length')::integer,2000) not between 1 and 2000 then raise exception 'Question exceeds bounds';end if;
  if (select count(*)<>count(distinct value->>'value') from jsonb_array_elements(coalesce(n.definition->'options','[]'))) then raise exception 'Duplicate choices';end if;
 end loop;
 perform wa.publish_structure(version);
end $function$;

create or replace function wa.publish_structure(version uuid) returns void language plpgsql set search_path='' as $function$
declare f wa.flows; n wa.nodes; o jsonb;
begin
 if not exists(select 1 from wa.versions where id=version and published_at is null) then raise exception 'Draft required';end if;
 if not exists(select 1 from wa.flows where version_id=version) then raise exception 'Empty catalog';end if;
 for f in select * from wa.flows where version_id=version loop
  if not exists(select 1 from wa.nodes where version_id=version and flow=f.key) then raise exception 'Empty flow';end if;
  for o in select value from jsonb_array_elements(f.outputs) loop
   if o->>'collection' not in ('voluntarios','bases','solicitacoes','relatos','inscritos') or jsonb_typeof(o->'fields')<>'object' then
    raise exception 'Invalid projection';end if;
  end loop;
 end loop;
 for n in select * from wa.nodes where version_id=version loop
  if coalesce(n.definition->>'question','')='' or coalesce(n.definition->>'label','')='' then raise exception 'Missing question/label';end if;
  if n.definition->>'kind' in ('single','multi') and not n.definition ? 'catalog' and coalesce(jsonb_array_length(n.definition->'options'),0)=0 then raise exception 'Missing options';end if;
  for o in select value from jsonb_array_elements(coalesce(n.definition->'options','[]')) loop
   if coalesce(o->>'value','')='' or coalesce(o->>'button','')='' or length(o->>'button')>20 then raise exception 'Invalid option';end if;
  end loop;
 end loop;
 update wa.versions set published_at=now() where id=version;
end $function$;

-- 9) Entrada: igual à vigente, mais a localização recebida e o pedido de localização na saída.
create or replace function wa.ma_wa_processar(entrada bigint, midia jsonb default null::jsonb) returns boolean language plpgsql security definer set search_path='' as $function$
declare i wa.inbox; c wa.channels; s wa.sessions; response jsonb; ev jsonb; body text; part integer:=0; stamp timestamptz; controls boolean;message jsonb;buttons jsonb;
begin
 select * into i from wa.inbox where id=entrada and processed_at is null and attempts<5 for update skip locked;
 if not found then return false;end if;
 if not pg_try_advisory_xact_lock(hashtextextended(i.channel_id||':'||i.contact,0)) then return false;end if;
 if exists(select 1 from wa.inbox where channel_id=i.channel_id and contact=i.contact and id<i.id and processed_at is null) then return false;end if;
 select c1.* into c from wa.channels c1 join public.ma_prefeituras p on p.id=c1.municipio_id where c1.id=i.channel_id and c1.enabled and p.status='ativa';
 if not found then return false;end if;
 begin
  stamp:=least(to_timestamp((i.event->>'timestamp')::double precision),now());
  if stamp<now()-interval '23 hours 55 minutes' then
   update wa.inbox set processed_at=now(),error_code='window_expired' where id=i.id;return true;
  end if;
  insert into wa.sessions(channel_id,contact,version_id,last_inbound_at) values(c.id,i.contact,c.version_id,stamp) on conflict do nothing;
  select * into strict s from wa.sessions where channel_id=c.id and contact=i.contact for update;
  update wa.sessions set last_inbound_at=greatest(last_inbound_at,stamp) where id=s.id;
  ev:=jsonb_strip_nulls(jsonb_build_object('text',i.event->>'text','button',i.event->>'button','media',midia,
   'location',case when jsonb_typeof(i.event->'location')='object' then i.event->'location' end));
  if ev='{}' then ev:='{"text":""}';end if;
  response:=wa.step(s.id,ev);
  for message in select value from jsonb_array_elements(response->'messages') loop
   body:=message->>'text';buttons:=coalesce(message->'buttons','[]');
   if message ? 'image' then
    part:=part+1;
    insert into wa.outbox(inbox_id,sequence,session_id,payload) values(i.id,part,s.id,jsonb_build_object('text',body,'buttons','[]'::jsonb,'image',message->'image'));
    continue;
   end if;
   if coalesce((message->>'location_request')::boolean,false) and length(body)<=1024 then
    part:=part+1;
    insert into wa.outbox(inbox_id,sequence,session_id,payload) values(i.id,part,s.id,jsonb_build_object('text',body,'buttons','[]'::jsonb,'location_request',true));
    continue;
   end if;
   controls:=jsonb_array_length(buttons) between 1 and 10 and length(body)>1024;
   loop
    part:=part+1;
    insert into wa.outbox(inbox_id,sequence,session_id,payload)
     values(i.id,part,s.id,jsonb_build_object('list_button',response->'list_button','list_title',response->'list_title','text',left(body,3500),'buttons',case when length(body)>3500 or controls then '[]'::jsonb else buttons end));
    body:=substr(body,3501);exit when body='';
   end loop;
   if controls then
    part:=part+1;
    insert into wa.outbox(inbox_id,sequence,session_id,payload) select i.id,part,s.id,
     jsonb_build_object('text',config->'texts'->>'controls','buttons',buttons,'list_button',response->'list_button','list_title',response->'list_title') from wa.versions where id=(response->>'version_id')::uuid;
   end if;
  end loop;
  update wa.inbox set processed_at=now(),error_code=null where id=i.id;
 exception when others then
  update wa.inbox set attempts=attempts+1,error_code=sqlstate where id=i.id;return false;
 end;
 return true;
end $function$;

-- 10) Relato com tipo do catálogo: o servidor confere o tipo e preenche categoria, situação e nome do tipo.
-- A situação é a de sempre (situacao_whatsapp do tipo, ou o nome), então a triagem de animais segue igual.
-- O ponto enviado pelo WhatsApp é conferido; sem endereço digitado, o endereço registra o ponto.
create function private.ma_relato_tipo() returns trigger language plpgsql security definer set search_path='' as $$
declare tipo jsonb; cfg jsonb; lat numeric; lng numeric;
begin
 if new.colecao<>'relatos' or coalesce(new.dados->>'tipo_id','')='' then return new;end if;
 select dados into tipo from public.ma_cadastros where municipio_id=new.municipio_id and colecao='ocorrenciaTipos' and id=new.dados->>'tipo_id';
 if not found then raise exception 'Tipo de ocorrência desconhecido' using errcode='23514';end if;
 select documento->'protecaoAnimal' into cfg from public.ma_configuracao where id='operacao';
 new.dados:=new.dados||jsonb_build_object('tipo_nome',tipo->>'nome','situacao',coalesce(nullif(tipo->>'situacao_whatsapp',''),tipo->>'nome'),
  'categoria',case when tipo->>'categoria'=cfg->>'categoriaTipos' then 'animal' else tipo->>'categoria' end);
 if coalesce(new.dados->>'lat','')<>'' or coalesce(new.dados->>'lng','')<>'' then
  if coalesce(new.dados->>'lat','') !~ '^-?[0-9]{1,3}(\.[0-9]{1,15})?$' or coalesce(new.dados->>'lng','') !~ '^-?[0-9]{1,3}(\.[0-9]{1,15})?$' then
   raise exception 'Ponto inválido' using errcode='23514';end if;
  lat:=(new.dados->>'lat')::numeric;lng:=(new.dados->>'lng')::numeric;
  if lat not between -90 and 90 or lng not between -180 and 180 then raise exception 'Ponto inválido' using errcode='23514';end if;
  new.dados:=new.dados||jsonb_build_object('lat',lat::text,'lng',lng::text);
  if coalesce(btrim(new.dados->>'endereco'),'')='' then new.dados:=new.dados||jsonb_build_object('endereco','Localização enviada: '||lat::text||', '||lng::text);end if;
 else new.dados:=new.dados-'lat'-'lng';
 end if;
 if coalesce(btrim(new.dados->>'nome'),'')='' then new.dados:=new.dados||jsonb_build_object('nome','Não informado');end if;
 return new;
end $$;
revoke all on function private.ma_relato_tipo() from public,anon,authenticated;
create trigger ma_a_relato_tipo before insert or update on public.ma_cadastros for each row execute function private.ma_relato_tipo();

-- 11) Versão nova do WhatsApp, cópia da v4: relato guiado pelo catálogo; Proteção animal sai do menu e vira categoria.
do $versao$
declare old_v uuid;new_v uuid;
begin
select id into strict old_v from wa.versions where name='municipal-v4-alertas' and published_at is not null;
insert into wa.versions(name,config)
 select 'municipal-v5-relato-catalogo',
  jsonb_set(jsonb_set(jsonb_set(config,'{texts,completed,relato}',to_jsonb('Relato recebido para triagem! ✅'||E'\n\n'||'Protocolo: {protocolo}'||E'\n\n'||'A equipe vai verificar antes de publicar no mapa. Em risco imediato, ligue 190, 192 ou 193.'::text)),
   '{texts,location_received}','"Localização enviada"'),'{errors,location}','"Não reconheci o local. Toque em Enviar localização ou digite o endereço com rua, número e bairro."')
 from wa.versions where id=old_v returning id into new_v;
update wa.versions set config=jsonb_set(config,'{texts,simulated_completed,relato}',
 to_jsonb('Simulação concluída. Nenhum cadastro ou mensagem real foi criado.'||E'\n\n'||(config->'texts'->'completed'->>'relato')))
 where id=new_v and config->'texts' ? 'simulated_completed';
insert into wa.flows select new_v,key,position,title,button,intro,condition,outputs from wa.flows where version_id=old_v and key not in ('relato','animal','alertas');
insert into wa.nodes select new_v,flow,key,position,definition from wa.nodes where version_id=old_v and flow not in ('relato','animal','alertas');
-- Relatar ocorrência: mesma posição, título e aviso de segurança; perguntas novas.
insert into wa.flows(version_id,key,position,title,button,intro,condition,outputs)
 select new_v,key,position,title,button,intro,condition,$o$[{"key":"relato","collection":"relatos","identity":"cycle",
  "fields":{"nome":{"context":"profile_name"},"telefone":{"context":"contact"},"anonimo":{"constant":false},"tipo_id":{"answer":"tipo"},
   "endereco":{"answer":"local","path":"endereco"},"lat":{"answer":"local","path":"lat"},"lng":{"answer":"local","path":"lng"},
   "foto":{"answer":"foto"},"status":{"constant":"Em triagem"},"origem":{"constant":"WhatsApp"},"criado_em":{"context":"now"}}}]$o$::jsonb
 from wa.flows where version_id=old_v and key='relato';
insert into wa.nodes(version_id,flow,key,position,definition) values
 (new_v,'relato','categoria',1,$n${"label":"Categoria","question":"O que você quer relatar?","kind":"single","required":true,"catalog":{"source":"categorias"}}$n$::jsonb),
 (new_v,'relato','tipo',2,$n${"label":"Tipo","question":"Qual destas situações?","kind":"single","required":true,"catalog":{"source":"tipos","answer":"categoria"}}$n$::jsonb),
 (new_v,'relato','local',3,$n${"label":"Local","question":"Onde é? Toque em Enviar localização ou digite o endereço com rua, número e bairro.","kind":"location","required":true,"max_length":500}$n$::jsonb),
 (new_v,'relato','foto',4,$n${"label":"Foto","question":"Envie uma foto, se for seguro fotografar. Você também pode concluir sem foto.","kind":"photo","required":false,"max_length":2000}$n$::jsonb);
-- Alertas do meu bairro: igual, na posição liberada pela saída de Proteção animal.
insert into wa.flows select new_v,key,(select max(position)+1 from wa.flows where version_id=new_v),title,button,intro,condition,outputs from wa.flows where version_id=old_v and key='alertas';
insert into wa.nodes select new_v,flow,key,position,definition from wa.nodes where version_id=old_v and flow='alertas';
perform wa.publish(new_v);
insert into wa.operations(action,target) values('relato_catalogo_prepared',new_v::text);
end $versao$;
commit;
