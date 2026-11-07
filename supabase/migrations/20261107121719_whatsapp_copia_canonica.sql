begin;
-- Somente peças institucionais; fotos de cidadãos continuam no bucket privado ma-whatsapp.
do $storage$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('ma-whatsapp-catalogo','ma-whatsapp-catalogo',true,5242880,array['image/png','image/jpeg']) on conflict(id) do nothing;
 end if;
end $storage$;
create or replace function wa.publish(version uuid) returns void language plpgsql set search_path='' as $$
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
   if b->>'action' not in ('skip','confirm','correct','restart') or length(coalesce(b->>'button',b->>'label','')) not between 1 and 20 then raise exception 'Invalid button';end if;
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
    elsif not field.value ? 'constant' and coalesce(field.value->>'context','') not in ('now','contact') then raise exception 'Invalid field mapping';end if;
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
  if length(n.definition->>'question')>3000 or coalesce((n.definition->>'max_length')::integer,2000) not between 1 and 2000 then raise exception 'Question exceeds bounds';end if;
  if (select count(*)<>count(distinct value->>'value') from jsonb_array_elements(coalesce(n.definition->'options','[]'))) then raise exception 'Duplicate choices';end if;
 end loop;
 perform wa.publish_structure(version);
end $$;
create or replace function wa.validate(node jsonb, input jsonb) returns jsonb
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
end $$;
-- Computações declarativas: campos, textos e resultados são definidos no catálogo.
create or replace function wa.variables(s wa.sessions,c jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare v jsonb:='{}';r record;value jsonb;
begin
 for r in select x.key,x.value from jsonb_each(coalesce(c->'computed','{}')) x loop
  case r.value->>'kind'
  when 'distinct_count' then
   select to_jsonb(count(distinct e.value)) into value from jsonb_array_elements_text(r.value->'fields') f(field)
    cross join lateral jsonb_array_elements_text(case when jsonb_typeof(s.answers->f.field)='array' then s.answers->f.field else '[]' end) e(value);
  when 'conditional_text' then
   value:=to_jsonb(case when coalesce(s.answers->>(r.value->>'field'),'')<>'' then wa.template(c->'texts'->>(r.value->>'template'),s.answers) else '' end);
  when 'output_constant' then
   select o->'fields'->(r.value->>'field')->'constant' into value from wa.flows f,jsonb_array_elements(f.outputs) o
    where f.version_id=s.version_id and f.key=s.flow and o->'fields' ? (r.value->>'field') limit 1;
  when 'presence_text' then
   value:=c->'texts'->(case when coalesce(s.answers->(r.value->>'field'),'null') not in ('null','""','[]') then r.value->>'yes' else r.value->>'no' end);
  else raise exception 'Unknown catalog computation';
  end case;
  v:=v||jsonb_build_object(r.key,value);
 end loop;
 return v;
end $$;
revoke all on function wa.variables(wa.sessions,jsonb) from public,anon,authenticated,service_role;
create or replace function wa.render(s wa.sessions, error_key text default null) returns jsonb
language plpgsql stable set search_path='' as $$
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
     when 'object' then c->'texts'->>'photo_received' else s.answers->>item.key end||E'\n';
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
 messages:=messages||jsonb_build_array(jsonb_build_object('text',question_text,'buttons',choices));
 return jsonb_build_object('session_id',s.id,'revision',s.revision,'stage',s.stage,'kind',n->>'kind','text',wa.template(body,vars),
  'messages',messages,'buttons',choices,'list_button',c->'texts'->>'list_button','list_title',c->'texts'->>'list_title','simulation',s.simulation,'version_id',s.version_id);
end $$;

create or replace function wa.step(session uuid, event jsonb) returns jsonb language plpgsql set search_path='' as $$
declare s wa.sessions; f wa.flows; n wa.nodes; validated jsonb; err text; action text;
 previous_stage text;previous_position integer;part text[]; rendered jsonb; b jsonb; input jsonb:=jsonb_build_object('text',event->>'text','media',event->'media');
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
end $$;
-- Cópia literal das mensagens canônicas de src/atendimento/app.js. Nova versão imutável.
do $catalog$
declare old_v uuid;new_v uuid;c jsonb;p jsonb:='{"layout": {"menu_numbered": false, "single_numbered": false, "multi_skip_button": false}, "texts": {"welcome": "Olá! Bem-vindo ao {marca}.\n\nUm sistema desenvolvido pela Prefeitura de {municipio} para que todos possam somar esforços na recuperação da nossa cidade em caso de eventos climáticos e desastres naturais.\n\nEscolha uma opção para continuar:", "brand": "{municipio} Alerta", "controls": "Está tudo correto?", "multi_hint": "Você pode escolher mais de uma opção. Digite os números separados por vírgula. Exemplo: 1, 3, 5.", "zero_hint": " Se nenhuma se aplica, digite 0.", "zero_option": "0. Nenhuma das opções", "photo_received": "Imagem anexada", "correction": "Vamos revisar suas respostas. As escolhas anteriores foram preservadas.", "list_button": "Selecionar", "list_title": "Opções", "review": "Confira suas informações antes de concluir:\n\n{resumo}\n\nEstá tudo correto?", "completed": {"colaborador": "Cadastro de colaborador concluído! ✅\n\nProtocolo: {protocolo}\nOfertas cadastradas: {ofertas}{doacao}\n\nOs dados aparecem na Gestão e no Mapa de Colaboradores no sistema municipal. Nenhuma mensagem foi enviada a órgãos ou voluntários.", "solicitacao": "Seu pedido de ajuda foi registrado. ✅\n\nAjuda solicitada: {descricao}\nSituação: {situacao}\n\nO pedido aparece no Mapa da Ajuda no sistema municipal, sem divulgar seu endereço.", "relato": "Relato recebido para triagem! ✅\n\nProtocolo: {protocolo}\nEndereço: {endereco_ocorrencia}\nSituação: {situacao}\n{foto_status}\n\nA equipe deverá verificar antes de confirmar uma ocorrência no Mapa de Evento. Nenhum acionamento real foi realizado."}, "donation_line": "\nDoação: {forma_entrega_doacao}", "photo_attached": "Foto anexada com sucesso.", "photo_absent": "Sem foto anexada."}, "errors": {"phone": "Informe um telefone válido com DDD.", "integer": "Informe um número de pessoas ou pule esta pergunta.", "offer_required": "Selecione pelo menos um tipo de colaboração para concluir.", "multi": "Digite somente os números das opções, separados por vírgula. Exemplo: 1, 3, 5.", "multi_zero": "A opção 0 (nenhuma) deve ser enviada sozinha e só vale para perguntas opcionais.", "multi_range": "Escolha apenas números da lista, entre 1 e {count}.", "exclusive": "\"{exclusive}\" não pode ser combinada com outras respostas. Informe apenas o seu número."}, "buttons": {"optional": [{"action": "skip", "label": "Pular esta pergunta"}], "photo": [{"action": "skip", "label": "Continuar sem foto"}], "review": [{"action": "confirm", "label": "✓ Confirmar e concluir", "button": "Confirmar e concluir"}, {"action": "correct", "label": "✎ Corrigir respostas", "button": "Corrigir respostas"}]}}'::jsonb;
begin
select version_id into strict old_v from wa.channels where phone_number_id='1277929198738053';
select config into c from wa.versions where id=old_v;
c:=c||jsonb_build_object('layout',p->'layout','texts',(c->'texts')||(p->'texts'),'errors',(c->'errors')||(p->'errors'),'buttons',(c->'buttons')||(p->'buttons'));
insert into wa.versions(name,config) values('municipal-v2-canonico',c) returning id into new_v;
insert into wa.flows select new_v,key,position,title,button,intro,condition,outputs from wa.flows where version_id=old_v;
insert into wa.nodes select new_v,flow,key,position,definition from wa.nodes where version_id=old_v;
update wa.flows set intro='' where version_id=new_v and key in ('colaborador','solicitacao');
update wa.nodes set definition=definition||jsonb_build_object('initial_question','Programa de Apoio Social e Mobilização Voluntária de {municipio}

“Onde a boa vontade se transforma em ação”

Unindo:
Empresas 🤝 Voluntários 🤝 Entidades

Para começar, digite seu nome e sobrenome 👇') where version_id=new_v and flow='colaborador' and key='nome';
update wa.nodes set definition=definition||jsonb_build_object('question','Muito obrigado, {nome}! Como você gostaria de se cadastrar?

◾ Pessoa física
◾ Pessoa jurídica

Toque em uma das opções abaixo. 👇') where version_id=new_v and flow='colaborador' and key='tipo_pessoa';
update wa.nodes set definition=definition||jsonb_build_object('label','Divulgar ponto') where version_id=new_v and key='ponto_publico';
update wa.nodes set definition=definition||jsonb_build_object('label','Tipo de ponto') where version_id=new_v and key='ponto_tipo';
update wa.nodes set definition=definition||jsonb_build_object('label','Nome do ponto') where version_id=new_v and key='ponto_nome';
update wa.nodes set definition=definition||jsonb_build_object('label','Responsável') where version_id=new_v and key='ponto_responsavel';
update wa.nodes set definition=definition||jsonb_build_object('label','Endereço do ponto') where version_id=new_v and key='ponto_endereco';
update wa.nodes set definition=definition||jsonb_build_object('label','Telefone do ponto') where version_id=new_v and key='ponto_telefone';
update wa.nodes set definition=definition||jsonb_build_object('label','Serviço oferecido') where version_id=new_v and key='ponto_funcao';
update wa.nodes set definition=definition||jsonb_build_object('label','Horário de atendimento') where version_id=new_v and key='ponto_horario';
update wa.nodes set definition=definition||jsonb_build_object('label','Capacidade em pessoas') where version_id=new_v and key='ponto_capacidade';
update wa.nodes set definition=definition||jsonb_build_object('label','Nome') where version_id=new_v and key='nome';
update wa.nodes set definition=definition||jsonb_build_object('label','Pessoa') where version_id=new_v and key='tipo_pessoa';
update wa.nodes set definition=definition||jsonb_build_object('label','Telefone') where version_id=new_v and key='telefone';
update wa.nodes set definition=definition||jsonb_build_object('label','Endereço') where version_id=new_v and key='endereco';
update wa.nodes set definition=definition||jsonb_build_object('label','Ajuda a pessoas') where version_id=new_v and key='ajudas';
update wa.nodes set definition=definition||jsonb_build_object('label','Máquinas e equipamentos') where version_id=new_v and key='maquinas';
update wa.nodes set definition=definition||jsonb_build_object('label','Empreendedores') where version_id=new_v and key='empreendedores';
update wa.nodes set definition=definition||jsonb_build_object('label','Materiais e combustível') where version_id=new_v and key='materiais';
update wa.nodes set definition=definition||jsonb_build_object('label','Entrega da doação') where version_id=new_v and key='forma_entrega_doacao';
update wa.nodes set definition=definition||jsonb_build_object('label','Ajuda solicitada') where version_id=new_v and key='descricao';
update wa.nodes set definition=definition||jsonb_build_object('label','Local da ocorrência') where version_id=new_v and key='endereco_ocorrencia';
update wa.nodes set definition=definition||jsonb_build_object('label','Pessoas no local') where version_id=new_v and key='pessoas_no_local';
update wa.nodes set definition=definition||jsonb_build_object('label','Descrição') where version_id=new_v and key='necessidade_relato';
update wa.nodes set definition=definition||jsonb_build_object('label','Fotografia') where version_id=new_v and key='foto';
update wa.nodes set definition=definition||jsonb_build_object('label','Especificar outros') where version_id=new_v and key='outros';
update wa.nodes set definition=jsonb_set(definition,'{options}', '[{"value":"FÍSICA","button":"Pessoa física","label":"Pessoa física"},{"value":"JURÍDICA","button":"Pessoa jurídica","label":"Pessoa jurídica"}]'::jsonb) where version_id=new_v and flow='colaborador' and key='tipo_pessoa';
update wa.versions set config=jsonb_set(config,'{buttons,review_by_flow}',jsonb_build_object('relato',(config->'buttons'->'review')||jsonb_build_array(jsonb_build_object('action','restart','label','Voltar ao início')))) where id=new_v;
update wa.nodes set definition=definition||'{"min_digits":10,"max_digits":13}'::jsonb where version_id=new_v and definition->>'kind'='tel';
update wa.nodes set definition=definition||'{"condition_retry":true}'::jsonb where version_id=new_v and flow='colaborador' and key='ajudas';
update wa.versions set config=config||'{"computed":{"ofertas":{"kind":"distinct_count","fields":["ajudas","maquinas","empreendedores","materiais"]},"doacao":{"kind":"conditional_text","field":"forma_entrega_doacao","template":"donation_line"},"situacao":{"kind":"output_constant","field":"status"},"foto_status":{"kind":"presence_text","field":"foto","yes":"photo_attached","no":"photo_absent"}}}'::jsonb where id=new_v;
update wa.versions set config=config||jsonb_build_object('assets',jsonb_build_object('pra_somar',jsonb_build_object(
 'url','https://yyoozisgoginwepzvnvu.supabase.co/storage/v1/object/public/ma-whatsapp-catalogo/pra-somar/80ef92aa7d4db05b620251511906053d83e869dd2f5586202afee13e4e8c2ff9.png',
 'mime_type','image/png','sha256','80ef92aa7d4db05b620251511906053d83e869dd2f5586202afee13e4e8c2ff9',
 'width',320,'height',320,'alt','Identidade visual do Pra Somar','caption','Pra Somar · Mobilização voluntária')))
 where id=new_v;
update wa.nodes set definition=definition||'{"initial_asset":"pra_somar"}'::jsonb where version_id=new_v and flow='colaborador' and key='nome';
update wa.versions set config=jsonb_set(config,'{texts,simulated_completed}',(
 select jsonb_object_agg(key,'Simulação concluída. Nenhum cadastro ou mensagem real foi criado.'||E'\n\n'||value)
 from jsonb_each_text(config->'texts'->'completed'))) where id=new_v;
perform wa.publish(new_v);
-- Preparação apenas. O canal troca de versão após testes e publicação do worker/imagem.
insert into wa.operations(action,target) values('canonical_copy_prepared',new_v::text);
end $catalog$;

create or replace function wa.ma_wa_processar(entrada bigint, midia jsonb default null) returns boolean
language plpgsql security definer set search_path='' as $$
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
  ev:=jsonb_strip_nulls(jsonb_build_object('text',i.event->>'text','button',i.event->>'button','media',midia));
  if ev='{}' then ev:='{"text":""}';end if;
  response:=wa.step(s.id,ev);
  for message in select value from jsonb_array_elements(response->'messages') loop
   body:=message->>'text';buttons:=coalesce(message->'buttons','[]');
   if message ? 'image' then
    part:=part+1;
    insert into wa.outbox(inbox_id,sequence,session_id,payload) values(i.id,part,s.id,jsonb_build_object('text',body,'buttons','[]'::jsonb,'image',message->'image'));
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
end $$;
commit;
