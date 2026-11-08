begin;
create function wa.contact_config() returns jsonb language sql stable set search_path='' as $$
 select documento from public.ma_configuracao where id='contatos';
$$;
create function wa.contact_field(d jsonb,fields jsonb) returns text language sql immutable set search_path='' as $$
 select d->>key from jsonb_array_elements_text(fields) with ordinality f(key,position)
 where nullif(d->>key,'') is not null order by position limit 1;
$$;
create function wa.contact_summary(d jsonb,fields jsonb) returns text language sql immutable set search_path='' as $$
 select string_agg(value,' · ' order by position) from (
 select position,case when jsonb_typeof(d->key)='array' then (select string_agg(v,', ') from jsonb_array_elements_text(d->key) v) else d->>key end value
 from jsonb_array_elements_text(fields) with ordinality f(key,position)) q where nullif(value,'') is not null;
$$;
create function wa.contact_collection(flow text) returns text language sql stable set search_path='' as $$
 select coalesce(wa.contact_config()->'categories'->flow->>'collection','voluntarios');
$$;
-- Somente registros projetados pela sessão; nunca associar pelo telefone digitado.
create function wa.contact_records_for(session uuid) returns table(collection text,id text,confirmed_at timestamptz)
language sql stable set search_path='' as $$
 select r->>'collection',r->>'id',max(c.created_at) from wa.completions c cross join lateral jsonb_array_elements(c.records) r
 where c.session_id=session group by r->>'collection',r->>'id';
$$;
create function wa.contact_progress(s wa.sessions) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('answered',count(*) filter(where s.answers ? n.key and s.answers->n.key<>'null'),
 'completed_steps',count(*) filter(where s.answers ? n.key),'total',count(*),
 'current_question',max(n.definition->>'question') filter(where n.position=s.position and s.stage='question'),
 'stage',case when s.stage='question' and exists(select 1 from wa.nodes q where q.version_id=s.version_id and q.flow=s.flow and q.position=s.position
 and wa.contact_config()->'identity_nodes' ? q.key) then 'identity' else s.stage end)
 from wa.nodes n where n.version_id=s.version_id and n.flow=s.flow and wa.matches(n.definition->'condition',s.answers);
$$;
create function wa.contact_rows(municipio text,chave text default null)
returns table(id text,category text,stage text,search text,updated_at timestamptz,data jsonb)
language sql stable set search_path='' as $$
 with cfg as (select wa.contact_config() c), sessions as (
 select s.*,ch.municipio_id,f.button,coalesce(reg.dados,'{}') confirmed,reg.id record_id,reg.versao record_version,
 greatest(s.updated_at,reg.atualizado_em) activity,wa.contact_progress(s) progress
 from wa.sessions s join wa.channels ch on ch.id=s.channel_id
 left join wa.flows f on f.version_id=s.version_id and f.key=s.flow
 left join lateral(select r.* from wa.contact_records_for(s.id) x join public.ma_cadastros r
 on r.municipio_id=ch.municipio_id and r.colecao=x.collection and r.id=x.id
 where r.arquivado_em is null and r.colecao=wa.contact_collection(s.flow) order by x.confirmed_at desc,r.id limit 1) reg on true
 where ch.municipio_id=municipio and not s.simulation and s.archived_at is null and (chave is null or 's:'||s.id=chave)
 and auth.uid() is not null and private.ma_permitido(municipio,wa.contact_collection(s.flow),'ler')
 ), rows as (
 select 's:'||s.id id,coalesce(s.flow,'') category,s.progress->>'stage' stage,s.activity updated_at,
 jsonb_build_object('id','s:'||s.id,'session_id',s.id,'category',coalesce(s.flow,''),'category_label',coalesce(s.button,c->'labels'->>'not_chosen'),
 'stage',s.progress->>'stage','origin',c->'labels'->>'whatsapp','first_at',s.first_inbound_at,'updated_at',s.activity,
 'name',coalesce(wa.contact_field(s.answers,c->'fields'->'name'),wa.contact_field(s.confirmed,c->'fields'->'name'),s.profile_name,c->'labels'->>'unnamed'),
 'name_source',case when wa.contact_field(s.answers,c->'fields'->'name') is not null then case when s.stage='done' then 'confirmed' else 'draft' end
 when wa.contact_field(s.confirmed,c->'fields'->'name') is not null then 'confirmed' when s.profile_name is not null then 'profile' else 'unnamed' end,
 'phone',s.contact,'declared_phone',wa.contact_field(s.confirmed||s.answers,c->'fields'->'phone'),
 'address',wa.contact_field(s.confirmed||s.answers,c->'fields'->'address'),'neighborhood',wa.contact_field(s.confirmed||s.answers,c->'fields'->'neighborhood'),
 'zone',wa.contact_field(s.confirmed||s.answers,c->'fields'->'zone'),'summary',wa.contact_summary(s.confirmed||s.answers,c->'fields'->'summary'),
 'record_id',s.record_id,'collection',wa.contact_collection(s.flow),'operational_status',s.confirmed->>'status',
 'revision',md5(s.revision::text||s.activity::text||coalesce(s.record_version::text,'')),
 'can_delete',private.ma_permitido(municipio,wa.contact_collection(s.flow),'excluir'))||s.progress data
 from sessions s cross join cfg
 union all
 select 'r:'||r.id,'colaborador','manual',r.atualizado_em,
 jsonb_build_object('id','r:'||r.id,'category','colaborador','category_label',coalesce((select f.button from wa.channels ch join wa.flows f on f.version_id=ch.version_id
 where ch.municipio_id=municipio and f.key='colaborador' order by ch.created_at desc limit 1),r.colecao),'stage','manual','origin',c->'labels'->>'manual',
 'first_at',r.dados->>'criado_em','updated_at',r.atualizado_em,'name',r.dados->>'nome','name_source','confirmed','phone',r.dados->>'telefone',
 'declared_phone',r.dados->>'telefone','address',r.dados->>'endereco','neighborhood',r.dados->>'bairro','zone',r.dados->>'zona',
 'summary',wa.contact_summary(r.dados,c->'fields'->'summary'),'collection',r.colecao,'record_id',r.id,'revision',r.versao::text,
 'can_delete',private.ma_permitido(municipio,r.colecao,'excluir'),'can_edit',private.ma_permitido(municipio,r.colecao,'gravar'))
 from public.ma_cadastros r cross join cfg where r.municipio_id=municipio and r.colecao='voluntarios' and r.arquivado_em is null
 and (chave is null or 'r:'||r.id=chave) and auth.uid() is not null and private.ma_permitido(municipio,r.colecao,'ler')
 and not exists(select 1 from wa.completions co join wa.sessions s on s.id=co.session_id join wa.channels ch on ch.id=s.channel_id,
 jsonb_array_elements(co.records) x where ch.municipio_id=municipio and x->>'collection'=r.colecao and x->>'id'=r.id)
 ) select rows.id,rows.category,rows.stage,concat_ws(' ',data->>'name',data->>'phone',data->>'declared_phone',data->>'address',data->>'neighborhood',data->>'summary'),rows.updated_at,
 data||jsonb_build_object('stage_label',(select x->>'label' from cfg,jsonb_array_elements(c->'stages') x where x->>'key'=rows.stage)) from rows;
$$;
create function private.ma_contatos_listar(municipio text,busca text default '',categoria text default '',etapa text default '',pagina integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cfg jsonb;result jsonb;size integer;
begin
 if auth.uid() is null or not private.ma_acesso(municipio) then raise exception 'Sem acesso à prefeitura' using errcode='42501';end if;
 if pagina is null or pagina<1 or pagina>100000 or length(busca)>200 then raise exception 'Filtro inválido';end if;
 cfg:=wa.contact_config();size:=(cfg->>'page_size')::integer;
 with filtered as materialized(select * from wa.contact_rows(municipio) r where (coalesce(categoria,'')='' or r.category=categoria or (categoria='untriaged' and r.category=''))
 and (coalesce(etapa,'')='' or r.stage=etapa) and (coalesce(busca,'')='' or strpos(lower(r.search),lower(busca))>0)),
 page as(select data from filtered order by updated_at desc,id limit size offset (pagina-1)*size)
 select jsonb_build_object('items',coalesce((select jsonb_agg(data) from page),'[]'),'total',(select count(*) from filtered),'page',pagina) into result;
 return result||jsonb_build_object('config',cfg,'categories',coalesce((select jsonb_agg(x) from (
 select distinct on(f.key) f.key,f.button label,f.position from wa.channels c join wa.flows f on f.version_id=c.version_id
 where c.municipio_id=municipio and private.ma_permitido(municipio,wa.contact_collection(f.key),'ler') order by f.key,c.created_at desc) x),'[]'));
end $$;
create function public.ma_contatos_listar(municipio text,busca text default '',categoria text default '',etapa text default '',pagina integer default 1)
returns jsonb language sql security invoker set search_path='' as $$select private.ma_contatos_listar(municipio,busca,categoria,etapa,pagina);$$;
revoke all on function wa.contact_config(),wa.contact_field(jsonb,jsonb),wa.contact_summary(jsonb,jsonb),wa.contact_collection(text),wa.contact_records_for(uuid),wa.contact_progress(wa.sessions),wa.contact_rows(text,text) from public,anon,authenticated,service_role;
revoke all on function private.ma_contatos_listar(text,text,text,text,integer),public.ma_contatos_listar(text,text,text,text,integer) from public,anon,service_role;
grant execute on function private.ma_contatos_listar(text,text,text,text,integer),public.ma_contatos_listar(text,text,text,text,integer) to authenticated;
commit;
