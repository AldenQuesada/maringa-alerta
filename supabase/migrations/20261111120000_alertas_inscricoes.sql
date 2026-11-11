begin;
-- Cadastro para receber alertas. Somente acréscimos: coleção "inscritos", gatilho do bairro e um fluxo novo
-- numa versão nova do WhatsApp. O canal continua na versão atual até a troca por wa.ma_wa_usar_versao.

-- Coleção nova, somada à lista vigente sem reescrevê-la.
do $colecao$
declare d text;
begin
 select pg_get_constraintdef(oid) into strict d from pg_constraint where conname='ma_cadastros_colecao_check';
 if position('''alertas''::text' in d)=0 then raise exception 'Lista de coleções inesperada';end if;
 alter table public.ma_cadastros drop constraint ma_cadastros_colecao_check;
 execute 'alter table public.ma_cadastros add constraint ma_cadastros_colecao_check '||replace(d,'''alertas''::text','''alertas''::text, ''inscritos''::text');
end $colecao$;

-- Telefones de cidadãos: mesmas permissões dos voluntários.
insert into private.ma_permissoes select papel,'inscritos',ler,gravar,excluir from private.ma_permissoes where colecao='voluntarios';

-- Contrato: o telefone vem do próprio contato do WhatsApp; nome e bairro chegam no cadastro e são preservados na saída.
update public.ma_configuracao set documento=documento||$j${"inscritos":{"required":["telefone"],"enums":{"origem":["WhatsApp","Gestão"]}}}$j$::jsonb,
 versao=versao+1 where id='contratos';
-- Formulário gerado da Gestão, para conferir a lista e ligar bairros não reconhecidos.
update public.ma_configuracao set documento=jsonb_set(documento,'{esquemas,inscritos}',$j${"label":"Inscritos em alertas","singular":"Inscrito","collection":"inscritos","summary":"Cidadãos cadastrados pelo WhatsApp para receber os alertas do bairro.","columns":["nome","bairro","ativo"],"fields":[
 {"key":"nome","label":"Nome","type":"text"},
 {"key":"telefone","label":"WhatsApp","type":"text","required":true},
 {"key":"bairro","label":"Bairro informado","type":"text"},
 {"key":"bairro_id","label":"Bairro cadastrado","type":"hidden"},
 {"key":"ativo","label":"Recebe alertas","type":"hidden"}]}$j$::jsonb),
 versao=versao+1 where id='interface';

-- O motor do WhatsApp publica e grava só em coleções autorizadas. Soma "inscritos" às duas listas, sem tocar no resto.
do $projecao$
declare f regprocedure;d text;velho text:='(''voluntarios'',''bases'',''solicitacoes'',''relatos'')';
begin
 foreach f in array array['wa.project(wa.sessions)'::regprocedure,'wa.publish_structure(uuid)'::regprocedure] loop
  d:=pg_get_functiondef(f);
  if (length(d)-length(replace(d,velho,'')))/length(velho)<>1 then raise exception 'Função % inesperada',f;end if;
  execute replace(d,velho,'(''voluntarios'',''bases'',''solicitacoes'',''relatos'',''inscritos'')');
 end loop;
end $projecao$;
revoke all on function wa.project(wa.sessions) from public,anon,authenticated,service_role;
revoke all on function wa.publish_structure(uuid) from public,anon,authenticated,service_role;

-- Nome de bairro comparável: sem acento, sem pontuação, abreviações comuns por extenso.
create function private.ma_nome_bairro(t text) returns text language sql immutable set search_path='' as $$
 select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  ' '||regexp_replace(lower(translate(coalesce(t,''),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')),'[^a-z0-9]+',' ','g')||' ',
  ' jd ',' jardim ','g'),' vl ',' vila ','g'),' pq ',' parque ','g'),' conj ',' conjunto ','g'),'\s+',' ','g'))
$$;
revoke all on function private.ma_nome_bairro(text) from public,anon,authenticated;

-- O servidor liga o bairro digitado ao bairro cadastrado e marca entrada e saída. Sem correspondência única,
-- bairro_id fica vazio e a gestão corrige; o cidadão não é questionado de novo.
create function private.ma_inscritos() returns trigger language plpgsql security definer set search_path='' as $$
declare antes jsonb;achados text[];ativo boolean;ativo_antes boolean;
begin
 if new.colecao<>'inscritos' then return new;end if;
 if tg_op='UPDATE' then antes:=old.dados;end if;
 if new.dados->>'bairro' is distinct from antes->>'bairro' or (new.dados->>'bairro_id') is null then
  select array_agg(c.id) into achados from public.ma_cadastros c
   where c.municipio_id=new.municipio_id and c.colecao='bairros' and c.arquivado_em is null
    and private.ma_nome_bairro(c.dados->>'nome')=private.ma_nome_bairro(new.dados->>'bairro');
  new.dados:=new.dados||jsonb_build_object('bairro_id',case when cardinality(achados)=1 then to_jsonb(achados[1]) else 'null'::jsonb end);
 end if;
 ativo:=coalesce((new.dados->>'ativo')::boolean,true);
 ativo_antes:=coalesce((antes->>'ativo')::boolean,false);
 new.dados:=new.dados||jsonb_build_object('ativo',ativo);
 if ativo and (antes is null or not ativo_antes) then new.dados:=new.dados||jsonb_build_object('entrou_em',clock_timestamp(),'saiu_em',null);
 elsif not ativo and (antes is null or ativo_antes) then new.dados:=new.dados||jsonb_build_object('saiu_em',clock_timestamp());end if;
 return new;
end;
$$;
revoke all on function private.ma_inscritos() from public,anon,authenticated;
create trigger ma_zz_inscritos before insert or update on public.ma_cadastros for each row execute function private.ma_inscritos();

-- Versão nova do WhatsApp: cópia imutável da publicada mais recente, mais os fluxos de entrada e saída.
do $versao$
declare old_v uuid;new_v uuid;
begin
select id into strict old_v from wa.versions where published_at is not null order by published_at desc,created_at desc limit 1;
insert into wa.versions(name,config)
 select 'municipal-v4-alertas',jsonb_set(config,'{texts,completed}',coalesce(config->'texts'->'completed','{}')||jsonb_build_object(
  'alertas','Pronto. Para mudar ou parar, escolha "Alertas do meu bairro" no menu.'))
 from wa.versions where id=old_v returning id into new_v;
insert into wa.flows select new_v,key,position,title,button,intro,condition,outputs from wa.flows where version_id=old_v;
insert into wa.nodes select new_v,flow,key,position,definition from wa.nodes where version_id=old_v;
update wa.versions set config=jsonb_set(config,'{texts,simulated_completed}',coalesce(config->'texts'->'simulated_completed','{}')||jsonb_build_object(
  'alertas','Simulação concluída. Nenhum cadastro real foi criado ou alterado.'))
 where id=new_v and config->'texts' ? 'simulated_completed';

-- Um item no menu: entrar ou sair. Para sair, um toque e a confirmação; nada mais é perguntado.
insert into wa.flows(version_id,key,position,title,button,intro,condition,outputs) values
 (new_v,'alertas',(select coalesce(max(position),0)+1 from wa.flows where version_id=new_v),
  'Alertas do meu bairro','Alertas do bairro',
  'Cadastre-se uma vez para receber os alertas da prefeitura no seu bairro: animais perdidos, mutirões e eventos.','{}'::jsonb,
  $o$[{"key":"inscricao","collection":"inscritos","identity":"contact","condition":{"field":"opcao","eq":"Receber alertas"},
   "fields":{"nome":{"answer":"nome"},"bairro":{"answer":"bairro"},"telefone":{"context":"contact"},"ativo":{"constant":true},
    "origem":{"constant":"WhatsApp"},"atualizado_em":{"context":"now"}}},
  {"key":"inscricao","collection":"inscritos","identity":"contact","condition":{"field":"opcao","eq":"Parar de receber"},
   "fields":{"telefone":{"context":"contact"},"ativo":{"constant":false},"atualizado_em":{"context":"now"}}}]$o$::jsonb);
insert into wa.nodes(version_id,flow,key,position,definition) values
 (new_v,'alertas','opcao',1,$n${"label":"Alertas","question":"O que você quer fazer?","kind":"single","required":true,"max_length":200,"options":[
  {"value":"Receber alertas","button":"Receber alertas","label":"Receber alertas"},
  {"value":"Parar de receber","button":"Parar de receber","label":"Parar de receber"}]}$n$::jsonb),
 (new_v,'alertas','nome',2,$n${"label":"Nome","question":"Qual é seu nome?","kind":"text","required":true,"max_length":200,"condition":{"field":"opcao","eq":"Receber alertas"}}$n$::jsonb),
 (new_v,'alertas','bairro',3,$n${"label":"Bairro","question":"Qual é o seu bairro?","kind":"text","required":true,"max_length":200,"condition":{"field":"opcao","eq":"Receber alertas"}}$n$::jsonb);
perform wa.publish(new_v);
insert into wa.operations(action,target) values('alertas_flow_prepared',new_v::text);
end $versao$;
commit;
