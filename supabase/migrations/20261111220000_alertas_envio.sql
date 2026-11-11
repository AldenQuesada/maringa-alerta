begin;
-- Alertas, etapas E2 a E4. Somente acréscimos: nenhuma função, tabela ou regra existente é reescrita,
-- exceto private.ma_inscritos, criada por este módulo na etapa E1.
-- E2: dados da página pública de um alerta aprovado ou de uma ação agendada, lidos só pelo servidor (função de borda).
-- E3: fila de envio por modelo aprovado na Meta, para os inscritos da área (bairro e vizinhos, e zonas que os cobrem);
--     saída pela palavra SAIR ou pelo botão "Parar alertas" do modelo; inscrição por "Zona N".
-- E4: aprovar e enviar pelo mapa, com a situação da entrega.
-- O envio real nasce desligado (envio.ativo=false). Ligar depende dos modelos aprovados na Meta.

-- Regras do envio. Nomes de modelo, idioma, campos, botões, palavras de saída e textos ficam aqui, não no código.
update public.ma_configuracao set documento=jsonb_set(documento,'{protecaoAnimal,envio}',$j${
 "ativo":false,
 "validadeHoras":24,
 "situacoes":{"alertas":"Aprovado","acoes":"Agendada"},
 "modelos":{
  "alertas":{"nome":"alerta_animal_bairro","idioma":"pt_BR","corpo":["mensagem"],"botoes":["pagina","sair"]},
  "acoes":{"nome":"acao_animal_bairro","idioma":"pt_BR","corpo":["nome","quando","local"],"botoes":["pagina","sair"]}},
 "saida":{"palavras":["sair"],"botao":"alertas_sair",
  "resposta":"Pronto. Você não vai mais receber os alertas do bairro. Para voltar, escolha \"Alertas do meu bairro\" no menu."},
 "paginaPublica":{"textos":{
  "alertas":{"rotulo":"Alerta da Proteção Animal","area":"Bairros do alerta","publicado":"Publicado em","especie":"Espécie",
   "ajuda":"Se você viu este animal, responda à mensagem do alerta no WhatsApp e escolha Proteção animal.",
   "encerrado":"Caso encerrado","desfecho":"Desfecho"},
  "acoes":{"rotulo":"Proteção Animal no seu bairro","quando":"Quando","onde":"Onde","tipo":"Tipo",
   "cancelada":"Ação cancelada","realizada":"Ação já realizada"},
  "rodape":"Você recebe porque se cadastrou nos Alertas do meu bairro. Para parar, responda SAIR no WhatsApp."}}}$j$::jsonb),
 versao=versao+1 where id='operacao' and documento ? 'protecaoAnimal';
do $$begin if not exists(select 1 from public.ma_configuracao where id='operacao' and documento#>'{protecaoAnimal,envio}' is not null)
 then raise exception 'Configuração da proteção animal ausente';end if;end$$;

-- Fila de envio. Um envio por contato, por registro de origem e por canal: repetir o clique não duplica.
create table wa.envios (
 id uuid primary key default gen_random_uuid(),
 channel_id uuid not null references wa.channels, municipio_id text not null,
 origem_colecao text not null check(origem_colecao in ('alertas','acoes')), origem_id text not null,
 inscrito_id text not null, contato text not null check(contato ~ '^[0-9]{7,15}$'), payload jsonb not null,
 state text not null default 'pending' check(state in ('pending','sending','sent','delivered','read','failed','uncertain','expired','cancelled')),
 provider_id text unique, attempt integer not null default 0, lease uuid, lease_until timestamptz,
 next_attempt_at timestamptz not null default now(), error_code text, criado_por uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(channel_id,origem_colecao,origem_id,contato)
);
create index envios_pendentes on wa.envios(next_attempt_at) where state='pending';
create index envios_origem on wa.envios(municipio_id,origem_colecao,origem_id);
alter table wa.envios enable row level security;
revoke all on wa.envios from public,anon,authenticated,service_role;

-- Inscrição por zona: sem bairro único, "Zona 7" ou "zona 07" liga à zona cadastrada.
create or replace function private.ma_inscritos() returns trigger language plpgsql security definer set search_path='' as $$
declare antes jsonb;achados text[];zonas text[];ativo boolean;ativo_antes boolean;
begin
 if new.colecao<>'inscritos' then return new;end if;
 if tg_op='UPDATE' then antes:=old.dados;end if;
 if new.dados->>'bairro' is distinct from antes->>'bairro' or (new.dados->>'bairro_id') is null then
  select array_agg(c.id) into achados from public.ma_cadastros c
   where c.municipio_id=new.municipio_id and c.colecao='bairros' and c.arquivado_em is null
    and private.ma_nome_bairro(c.dados->>'nome')=private.ma_nome_bairro(new.dados->>'bairro');
  new.dados:=new.dados||jsonb_build_object('bairro_id',case when cardinality(achados)=1 then to_jsonb(achados[1]) else 'null'::jsonb end);
  zonas:=null;
  if cardinality(achados) is distinct from 1 then
   select array_agg(c.id) into zonas from public.ma_cadastros c
    where c.municipio_id=new.municipio_id and c.colecao='zonas' and c.arquivado_em is null
     and regexp_replace(private.ma_nome_bairro(c.dados->>'nome'),'\m0+(\d)','\1','g')=regexp_replace(private.ma_nome_bairro(new.dados->>'bairro'),'\m0+(\d)','\1','g');
  end if;
  new.dados:=new.dados||jsonb_build_object('zona_id',case when cardinality(zonas)=1 then to_jsonb(zonas[1]) else 'null'::jsonb end);
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

-- O registro de origem ainda pode ser enviado? Alerta aprovado de ocorrência confirmada; ação agendada de hoje em diante.
create function private.ma_envio_valido(municipio text,colecao_alvo text,registro text) returns boolean
language sql stable security definer set search_path='' as $$
 select case colecao_alvo
  when 'alertas' then exists(select 1 from public.ma_cadastros a join public.ma_cadastros i
    on i.municipio_id=a.municipio_id and i.colecao='incidentes' and i.id=a.dados->>'incidente_id'
   where a.municipio_id=municipio and a.colecao='alertas' and a.id=registro and a.arquivado_em is null
    and a.dados->>'status'=(select documento#>>'{protecaoAnimal,envio,situacoes,alertas}' from public.ma_configuracao where id='operacao')
    and i.dados->>'status'='Confirmada' and coalesce(i.dados->>'visibilidade','')<>'restrita')
  when 'acoes' then exists(select 1 from public.ma_cadastros a
   where a.municipio_id=municipio and a.colecao='acoes' and a.id=registro and a.arquivado_em is null
    and a.dados->>'status'=(select documento#>>'{protecaoAnimal,envio,situacoes,acoes}' from public.ma_configuracao where id='operacao')
    and (a.dados->>'data')::date>=(now() at time zone 'America/Sao_Paulo')::date)
  else false end;
$$;
revoke all on function private.ma_envio_valido(text,text,text) from public,anon,authenticated;

-- Inscritos ativos da área: bairro da lista, ou zona que cobre um bairro da lista (sobreposição, não só a divisa).
create function private.ma_envio_destinatarios(municipio text,bairros text[]) returns table(inscrito_id text,contato text)
language sql stable security definer set search_path='' as $$
 select c.id,c.dados->>'telefone' from public.ma_cadastros c
 where c.municipio_id=municipio and c.colecao='inscritos' and c.arquivado_em is null
  and coalesce((c.dados->>'ativo')::boolean,false) and coalesce(c.dados->>'telefone','') ~ '^[0-9]{7,15}$'
  and (c.dados->>'bairro_id'=any(bairros) or c.dados->>'zona_id' in (
   select z.id from territorio.entidades z join territorio.entidades b on b.municipio_id=z.municipio_id and b.colecao='bairros' and b.id=any(bairros)
   where z.municipio_id=municipio and z.colecao='zonas' and z.area is not null and b.area is not null
    and gis.st_intersects(z.area,b.area) and not gis.st_touches(z.area,b.area)));
$$;
revoke all on function private.ma_envio_destinatarios(text,text[]) from public,anon,authenticated;

-- Área do registro: o alerta guarda a área calculada na criação; ação e ocorrência usam o bairro delas e os vizinhos.
create function private.ma_envio_area(municipio text,colecao_alvo text,registro text) returns text[]
language plpgsql stable security definer set search_path='' as $$
declare d jsonb;
begin
 select dados into d from public.ma_cadastros where municipio_id=municipio and colecao=colecao_alvo and id=registro;
 if colecao_alvo='alertas' then return (select array_agg(z->>'id') from jsonb_array_elements(coalesce(d->'zonas','[]'::jsonb)) z);end if;
 if coalesce(d->>'bairro_id','')='' then return null;end if;
 return (select array_agg(b.id) from territorio.entidades a
  join territorio.entidades b on b.municipio_id=a.municipio_id and b.colecao='bairros' and b.area is not null and (b.id=a.id or gis.st_intersects(a.area,b.area))
  where a.municipio_id=municipio and a.colecao='bairros' and a.id=d->>'bairro_id' and a.area is not null);
end;
$$;
revoke all on function private.ma_envio_area(text,text,text) from public,anon,authenticated;

-- Mensagem no formato de modelo da Meta. Os parâmetros não podem ter quebra de linha nem espaços seguidos.
create function private.ma_envio_modelo(municipio text,colecao_alvo text,registro text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cfg jsonb;m jsonb;d jsonb;campos jsonb;corpo jsonb:='[]';botoes jsonb:='[]';chave text;i integer:=0;
begin
 select documento#>'{protecaoAnimal,envio}' into cfg from public.ma_configuracao where id='operacao';
 m:=cfg->'modelos'->colecao_alvo;
 if m is null then raise exception 'Modelo de envio não configurado para %',colecao_alvo using errcode='23514';end if;
 select dados into strict d from public.ma_cadastros where municipio_id=municipio and colecao=colecao_alvo and id=registro;
 campos:=case colecao_alvo
  when 'alertas' then jsonb_build_object('mensagem',d->>'mensagem')
  else jsonb_build_object('nome',d->>'nome',
   'quando',to_char((d->>'data')::date,'DD/MM/YYYY')||coalesce(', '||nullif(btrim(d->>'horario'),''),''),
   'local',coalesce(nullif(concat_ws(', ',nullif(btrim(d->>'endereco'),''),nullif(btrim(d->>'bairro'),'')),''),'-')) end;
 for chave in select value from jsonb_array_elements_text(m->'corpo') loop
  corpo:=corpo||jsonb_build_array(jsonb_build_object('type','text','text',
   left(coalesce(nullif(btrim(regexp_replace(campos->>chave,'\s+',' ','g')),''),'-'),700)));
 end loop;
 for chave in select value from jsonb_array_elements_text(m->'botoes') loop
  botoes:=botoes||jsonb_build_array(case chave
   when 'pagina' then jsonb_build_object('type','button','sub_type','url','index',i::text,'parameters',
    jsonb_build_array(jsonb_build_object('type','text','text','m='||municipio||'&c='||colecao_alvo||'&id='||registro)))
   when 'sair' then jsonb_build_object('type','button','sub_type','quick_reply','index',i::text,'parameters',
    jsonb_build_array(jsonb_build_object('type','payload','payload',cfg#>>'{saida,botao}')))
   end);
  if botoes->-1='null'::jsonb then raise exception 'Botão de modelo desconhecido: %',chave using errcode='23514';end if;
  i:=i+1;
 end loop;
 return jsonb_build_object('template',jsonb_build_object('name',m->>'nome','language',jsonb_build_object('code',m->>'idioma'),
  'components',jsonb_build_array(jsonb_build_object('type','body','parameters',corpo))||botoes));
end;
$$;
revoke all on function private.ma_envio_modelo(text,text,text) from public,anon,authenticated;

-- E4: enfileira o envio para os inscritos da área. Quem pode aprovar alerta pode enviar.
create function wa.ma_wa_enviar_inscritos(municipio text,colecao_alvo text,registro text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb;c wa.channels;area text[];payload jsonb;novos integer;total integer;
begin
 if auth.uid() is null then raise exception 'Operação não autorizada' using errcode='42501';end if;
 select documento->'protecaoAnimal' into cfg from public.ma_configuracao where id='operacao';
 if colecao_alvo not in ('alertas','acoes') then raise exception 'Coleção sem envio' using errcode='22023';end if;
 if not private.ma_capaz(municipio,cfg#>>'{capacidades,aprovarAlerta}') or not private.ma_permitido(municipio,colecao_alvo,'ler') then
  raise exception 'Envio exige capacidade específica' using errcode='42501';end if;
 if not coalesce((cfg#>>'{envio,ativo}')::boolean,false) then
  raise exception 'O envio pelo WhatsApp ainda não está ligado' using errcode='55000';end if;
 select ch.* into c from wa.channels ch join public.ma_prefeituras p on p.id=ch.municipio_id
  where ch.municipio_id=municipio and ch.enabled and ch.outbound_enabled and p.status='ativa' order by ch.id limit 1;
 if not found then raise exception 'Canal de WhatsApp da prefeitura desligado' using errcode='55000';end if;
 if not private.ma_envio_valido(municipio,colecao_alvo,registro) then
  raise exception 'Registro fora da situação de envio' using errcode='23514';end if;
 area:=private.ma_envio_area(municipio,colecao_alvo,registro);
 if coalesce(cardinality(area),0)=0 then raise exception 'Registro sem bairro cadastrado para definir a área' using errcode='23514';end if;
 payload:=private.ma_envio_modelo(municipio,colecao_alvo,registro);
 insert into wa.envios(channel_id,municipio_id,origem_colecao,origem_id,inscrito_id,contato,payload,criado_por)
  select c.id,municipio,colecao_alvo,registro,d.inscrito_id,d.contato,payload,auth.uid() from private.ma_envio_destinatarios(municipio,area) d
  on conflict do nothing;
 get diagnostics novos=row_count;
 select count(*) into total from wa.envios where channel_id=c.id and origem_colecao=colecao_alvo and origem_id=registro;
 return jsonb_build_object('na_fila',novos,'total',total);
end;
$$;
create function public.ma_enviar_inscritos(municipio text,colecao_alvo text,registro text) returns jsonb
language sql security invoker set search_path='' as $$select wa.ma_wa_enviar_inscritos(municipio,colecao_alvo,registro)$$;

-- E4: situação para a ficha do mapa. Para uma ocorrência, devolve o alerta dela.
create function wa.ma_wa_envio_painel(municipio text,colecao_alvo text,registro text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cfg jsonb;al_id text;al_dados jsonb;alvo_colecao text;alvo_id text;area text[];inc jsonb;foto boolean:=false;
begin
 if auth.uid() is null then raise exception 'Operação não autorizada' using errcode='42501';end if;
 select documento->'protecaoAnimal' into cfg from public.ma_configuracao where id='operacao';
 if colecao_alvo not in ('incidentes','acoes') then raise exception 'Coleção sem envio' using errcode='22023';end if;
 if not private.ma_capaz(municipio,cfg#>>'{capacidades,aprovarAlerta}') or not private.ma_permitido(municipio,colecao_alvo,'ler') then
  return jsonb_build_object('capaz',false);end if;
 if colecao_alvo='incidentes' then
  select dados into inc from public.ma_cadastros where municipio_id=municipio and colecao='incidentes' and id=registro;
  if inc is null then raise exception 'Registro inexistente ou sem acesso' using errcode='P0002';end if;
  select exists(select 1 from public.ma_cadastros r where r.municipio_id=municipio and r.colecao='relatos' and r.id=inc->>'origem_relato'
   and coalesce(r.dados#>>'{foto,path}','')<>'') into foto;
  select a.id,a.dados into al_id,al_dados from public.ma_cadastros a where a.municipio_id=municipio and a.colecao='alertas' and a.arquivado_em is null
   and a.dados->>'incidente_id'=registro and a.dados->>'status'<>'Cancelado' order by a.dados->>'criado_em' desc limit 1;
  if al_id is null then area:=private.ma_envio_area(municipio,'incidentes',registro);
  else alvo_colecao:='alertas';alvo_id:=al_id;area:=private.ma_envio_area(municipio,'alertas',al_id);end if;
 else alvo_colecao:='acoes';alvo_id:=registro;area:=private.ma_envio_area(municipio,'acoes',registro);end if;
 return jsonb_build_object('capaz',true,'ativo',coalesce((cfg#>>'{envio,ativo}')::boolean,false),
  'alerta',case when al_id is null then null else jsonb_build_object('id',al_id,'mensagem',al_dados->>'mensagem','status',al_dados->>'status',
   'aprovado_em',al_dados->>'aprovado_em','mostrar_foto',coalesce((al_dados->>'mostrar_foto')::boolean,false)) end,
  'tem_foto',foto,
  -- Ocorrência sem alerta: pode receber alerta se confirmada e pública. Com alerta ou ação: o registro ainda vale para envio.
  'enviavel',case when alvo_colecao is null then inc->>'status'='Confirmada' and coalesce(inc->>'visibilidade','')<>'restrita'
   else private.ma_envio_valido(municipio,alvo_colecao,alvo_id) end,
  'bairros',(select coalesce(jsonb_agg(c.dados->>'nome' order by c.dados->>'nome'),'[]') from public.ma_cadastros c
   where c.municipio_id=municipio and c.colecao='bairros' and c.id=any(area)),
  'inscritos',(select count(*) from private.ma_envio_destinatarios(municipio,coalesce(area,'{}'))),
  'entregas',(select coalesce(jsonb_object_agg(x.state,x.n),'{}') from (select e.state,count(*) n from wa.envios e
   where e.municipio_id=municipio and e.origem_colecao=alvo_colecao and e.origem_id=alvo_id group by e.state) x));
end;
$$;
create function public.ma_envio_painel(municipio text,colecao_alvo text,registro text) returns jsonb
language sql stable security invoker set search_path='' as $$select wa.ma_wa_envio_painel(municipio,colecao_alvo,registro)$$;

-- E4: aprovar o alerta de uma ocorrência confirmada, pelo caminho canônico (contrato, travas e histórico).
-- Executa com a permissão de quem chama; a trava do módulo exige a capacidade de aprovação.
create function public.ma_alerta_aprovar(municipio text,incidente text,mensagem text,mostrar_foto boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare novo text:='alerta-'||replace(gen_random_uuid()::text,'-','');atual record;
begin
 if coalesce(btrim(mensagem),'')='' then raise exception 'Mensagem do alerta obrigatória' using errcode='23514';end if;
 if exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao='alertas' and arquivado_em is null
  and dados->>'incidente_id'=incidente and dados->>'status'<>'Cancelado') then
  raise exception 'Esta ocorrência já tem alerta' using errcode='23505';end if;
 perform public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('operacao','inserir','colecao','alertas','id',novo,'municipio_id',municipio,
  'dados',jsonb_build_object('id',novo,'municipioId',municipio,'incidente_id',incidente,'mensagem',btrim(mensagem),'nivel','Bairro',
   'mostrar_foto',coalesce(mostrar_foto,false)))));
 select dados,versao into strict atual from public.ma_cadastros where municipio_id=municipio and colecao='alertas' and id=novo;
 perform public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao','alertas','id',novo,'municipio_id',municipio,
  'versao',atual.versao,'dados',atual.dados||jsonb_build_object('status','Aprovado'))));
 return jsonb_build_object('id',novo,'status','Aprovado');
end;
$$;

-- E3: o trabalhador reserva um envio por vez. Registro que deixou de valer ou inscrito que saiu é cancelado, não enviado.
create function wa.ma_wa_reservar_envio() returns jsonb language plpgsql security definer set search_path='' as $$
declare e wa.envios;c wa.channels;cfg jsonb;n integer:=0;
begin
 select documento#>'{protecaoAnimal,envio}' into cfg from public.ma_configuracao where id='operacao';
 if not coalesce((cfg->>'ativo')::boolean,false) then return null;end if;
 update wa.envios set state='uncertain',error_code='lease_expired',updated_at=now() where state='sending' and lease_until<now();
 update wa.envios set state='expired',error_code='validade',updated_at=now()
  where state='pending' and created_at<now()-make_interval(hours=>coalesce((cfg->>'validadeHoras')::integer,24));
 loop
  n:=n+1;exit when n>50;
  select x.* into e from wa.envios x join wa.channels cc on cc.id=x.channel_id join public.ma_prefeituras p on p.id=cc.municipio_id
   where x.state='pending' and x.next_attempt_at<=now() and cc.enabled and cc.outbound_enabled and p.status='ativa'
   order by x.next_attempt_at,x.created_at limit 1 for update of x skip locked;
  if not found then return null;end if;
  if not private.ma_envio_valido(e.municipio_id,e.origem_colecao,e.origem_id) or not exists(select 1 from public.ma_cadastros i
   where i.municipio_id=e.municipio_id and i.colecao='inscritos' and i.id=e.inscrito_id and i.arquivado_em is null
    and coalesce((i.dados->>'ativo')::boolean,false) and i.dados->>'telefone'=e.contato) then
   update wa.envios set state='cancelled',error_code='origem_ou_inscricao',updated_at=now() where id=e.id;
   continue;
  end if;
  update wa.envios set state='sending',attempt=attempt+1,lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',updated_at=now()
   where id=e.id returning * into e;
  select * into strict c from wa.channels where id=e.channel_id;
  return jsonb_build_object('id',e.id,'lease',e.lease,'to',e.contato,'payload',e.payload,'phone_number_id',c.phone_number_id,'graph_version',c.graph_version);
 end loop;
 return null;
end;
$$;
create function public.ma_wa_reservar_envio() returns jsonb language sql security invoker set search_path='' as $$select wa.ma_wa_reservar_envio()$$;
create function wa.ma_wa_resultado_envio(saida uuid,reserva uuid,resultado text,provedor_id text default null,codigo text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if resultado not in ('sent','failed','uncertain','retry') then raise exception 'Invalid delivery state';end if;
 update wa.envios set state=case when resultado='retry' and attempt<5 then 'pending' when resultado='retry' then 'failed' else resultado end,
  provider_id=coalesce(provedor_id,provider_id),error_code=codigo,next_attempt_at=now()+make_interval(secs=>least(900,30*power(2,attempt)::integer)),
  lease_until=null,updated_at=now() where id=saida and lease=reserva and state='sending';
end;
$$;
create function public.ma_wa_resultado_envio(saida uuid,reserva uuid,resultado text,provedor_id text default null,codigo text default null)
returns void language sql security invoker set search_path='' as $$select wa.ma_wa_resultado_envio(saida,reserva,resultado,provedor_id,codigo)$$;

-- E3: situação de entrega. O recebimento descarta o retorno da Meta que não é de uma resposta da conversa;
-- nesse ponto, e só nele, passa a entregar o retorno à fila de envios. O resto do recebimento não muda.
create function wa.ma_wa_envio_retorno(canal uuid,e jsonb) returns void language plpgsql security definer set search_path='' as $$
declare alvo uuid;
begin
 if coalesce(e->>'outbox_id','') ~ '^[0-9a-f-]{36}$' then alvo:=(e->>'outbox_id')::uuid;end if;
 update wa.envios x set state=case
   when e->>'status'='read' then 'read'
   when e->>'status'='delivered' and x.state<>'read' then 'delivered'
   when e->>'status'='failed' and x.state not in ('read','delivered') then 'failed'
   when e->>'status'='sent' and x.state in ('sending','uncertain','pending') then 'sent' else x.state end,
  provider_id=coalesce(x.provider_id,e->>'id'),error_code=coalesce(e->>'error_code',x.error_code),updated_at=now()
  where x.channel_id=canal and (x.provider_id=e->>'id' or x.id=alvo);
end;
$$;
do $receber$
declare d text;antigo text:='if oid is null then continue;end if;';
begin
 d:=pg_get_functiondef('wa.ma_wa_receber(text,jsonb)'::regprocedure);
 if (length(d)-length(replace(d,antigo,'')))/length(antigo)<>1 then raise exception 'Recebimento inesperado: trecho de descarte não encontrado uma única vez';end if;
 execute replace(d,antigo,'if oid is null then perform wa.ma_wa_envio_retorno(c.id,e);continue;end if;');
end $receber$;

-- E3: saída por SAIR ou pelo botão "Parar alertas". Só age para quem está inscrito; para os demais, a mensagem
-- segue o fluxo normal. Qualquer falha aqui devolve a mensagem ao fluxo normal, sem perder o recebimento.
create function wa.ma_wa_saida_alertas() returns trigger language plpgsql security definer set search_path='' as $$
declare cfg jsonb;texto text;c wa.channels;s wa.sessions;inscrito text;
begin
 select documento#>'{protecaoAnimal,envio,saida}' into cfg from public.ma_configuracao where id='operacao';
 if cfg is null then return null;end if;
 texto:=private.ma_nome_bairro(new.event->>'text');
 if not (coalesce(new.event->>'button','')=cfg->>'botao' or (texto<>'' and coalesce(cfg->'palavras','[]'::jsonb) ? texto)) then return null;end if;
 begin
  select * into strict c from wa.channels where id=new.channel_id;
  select i.id into inscrito from public.ma_cadastros i where i.municipio_id=c.municipio_id and i.colecao='inscritos' and i.arquivado_em is null
   and i.dados->>'telefone'=new.contact and coalesce((i.dados->>'ativo')::boolean,false) order by i.id limit 1;
  if inscrito is null then return null;end if;
  update public.ma_cadastros set dados=dados||jsonb_build_object('ativo',false,'atualizado_em',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
   where municipio_id=c.municipio_id and colecao='inscritos' and id=inscrito;
  update wa.envios set state='cancelled',error_code='saida',updated_at=now() where channel_id=c.id and contato=new.contact and state='pending';
  insert into wa.sessions(channel_id,contact,version_id,last_inbound_at)
   values(c.id,new.contact,c.version_id,least(to_timestamp((new.event->>'timestamp')::double precision),now())) on conflict do nothing;
  select * into strict s from wa.sessions where channel_id=c.id and contact=new.contact;
  update wa.sessions set last_inbound_at=greatest(last_inbound_at,least(to_timestamp((new.event->>'timestamp')::double precision),now())) where id=s.id;
  insert into wa.outbox(inbox_id,sequence,session_id,payload) values(new.id,1,s.id,jsonb_build_object('text',cfg->>'resposta','buttons','[]'::jsonb));
  update wa.inbox set processed_at=now(),error_code=null where id=new.id;
 exception when others then return null;
 end;
 return null;
end;
$$;
create trigger ma_saida_alertas after insert on wa.inbox for each row execute function wa.ma_wa_saida_alertas();

-- Exclusão de contato: os envios do contato saem junto com a conversa.
create function wa.ma_wa_envios_limpar() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from wa.envios where channel_id=old.channel_id and contato=old.contact;return null;end;
$$;
create trigger ma_envios_limpar after delete on wa.sessions for each row execute function wa.ma_wa_envios_limpar();

-- E2: dados públicos de um alerta aprovado ou de uma ação, para a página aberta pelo botão do modelo.
-- Só a função de borda (service_role) chama; nada de denunciante, telefone, coordenada exata ou caso restrito.
create function wa.ma_wa_aviso_publico(municipio text,colecao_alvo text,registro text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cfg jsonb;d jsonb;inc jsonb;tipo jsonb;cidade text;
begin
 select documento#>'{protecaoAnimal,envio,paginaPublica,textos}' into cfg from public.ma_configuracao where id='operacao';
 select p.dados->>'nome' into cidade from public.ma_prefeituras p where p.id=municipio and p.status='ativa';
 if cidade is null then return null;end if;
 select dados into d from public.ma_cadastros where municipio_id=municipio and colecao=colecao_alvo and id=registro and arquivado_em is null;
 if d is null then return null;end if;
 if colecao_alvo='alertas' then
  if d->>'status' not in ('Aprovado','Cancelado') or d->>'aprovado_em' is null then return null;end if;
  select dados into inc from public.ma_cadastros where municipio_id=municipio and colecao='incidentes' and id=d->>'incidente_id';
  if inc is null or coalesce(inc->>'visibilidade','')='restrita' then return null;end if;
  select dados into tipo from public.ma_cadastros where municipio_id=municipio and colecao='ocorrenciaTipos' and id=inc->>'tipo_id';
  return jsonb_build_object('colecao','alertas','cidade',cidade,'textos',cfg->'alertas','rodape',cfg->>'rodape',
   'titulo',coalesce(tipo->>'nome','Alerta'),'icone',tipo->>'icone','cor',tipo->>'cor','mensagem',d->>'mensagem','especie',inc->>'especie',
   'bairro',(select b.dados->>'nome' from public.ma_cadastros b where b.municipio_id=municipio and b.colecao='bairros' and b.id=inc->>'bairro_id'),
   'area',(select coalesce(jsonb_agg(z->>'nome'),'[]') from jsonb_array_elements(coalesce(d->'zonas','[]'::jsonb)) z),
   'publicado_em',d->>'aprovado_em',
   'encerrado',d->>'status'='Cancelado' or inc->>'status' in ('Resolvida','Arquivada'),
   'desfecho',case when inc->>'status'='Resolvida' then inc->>'desfecho' end,
   'foto',coalesce((d->>'mostrar_foto')::boolean,false) and exists(select 1 from public.ma_cadastros r where r.municipio_id=municipio
    and r.colecao='relatos' and r.id=inc->>'origem_relato' and coalesce(r.dados#>>'{foto,path}','')<>''));
 end if;
 if colecao_alvo='acoes' then
  return jsonb_build_object('colecao','acoes','cidade',cidade,'textos',cfg->'acoes','rodape',cfg->>'rodape',
   'titulo',d->>'nome','tipo',d->>'tipo','data',d->>'data','horario',d->>'horario','endereco',d->>'endereco','bairro',d->>'bairro',
   'descricao',d->>'descricao','situacao',d->>'status');
 end if;
 return null;
end;
$$;
create function public.ma_aviso_publico(municipio text,colecao_alvo text,registro text) returns jsonb
language sql stable security invoker set search_path='' as $$select wa.ma_wa_aviso_publico(municipio,colecao_alvo,registro)$$;
-- Foto do alerta: só com "mostrar foto" marcado na aprovação, alerta aprovado e caso ainda aberto.
create function wa.ma_wa_aviso_foto(municipio text,registro text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('path',r.dados#>>'{foto,path}','mime',r.dados#>>'{foto,mime}')
 from public.ma_cadastros a join public.ma_cadastros i on i.municipio_id=a.municipio_id and i.colecao='incidentes' and i.id=a.dados->>'incidente_id'
 join public.ma_cadastros r on r.municipio_id=a.municipio_id and r.colecao='relatos' and r.id=i.dados->>'origem_relato'
 where a.municipio_id=municipio and a.colecao='alertas' and a.id=registro and a.arquivado_em is null and a.dados->>'status'='Aprovado'
  and coalesce((a.dados->>'mostrar_foto')::boolean,false) and coalesce(i.dados->>'visibilidade','')<>'restrita' and i.dados->>'status'='Confirmada'
  and r.dados#>>'{foto,bucket}'='ma-whatsapp' and coalesce(r.dados#>>'{foto,path}','')<>'';
$$;
create function public.ma_aviso_foto(municipio text,registro text) returns jsonb
language sql stable security invoker set search_path='' as $$select wa.ma_wa_aviso_foto(municipio,registro)$$;

-- Privilégios: fronteiras privadas definer; a API exposta é invoker e só para quem precisa.
revoke all on function wa.ma_wa_enviar_inscritos(text,text,text),wa.ma_wa_envio_painel(text,text,text),wa.ma_wa_reservar_envio(),
 wa.ma_wa_resultado_envio(uuid,uuid,text,text,text),wa.ma_wa_envio_retorno(uuid,jsonb),wa.ma_wa_saida_alertas(),wa.ma_wa_envios_limpar(),
 wa.ma_wa_aviso_publico(text,text,text),wa.ma_wa_aviso_foto(text,text) from public,anon,authenticated,service_role;
revoke all on function public.ma_enviar_inscritos(text,text,text),public.ma_envio_painel(text,text,text),public.ma_alerta_aprovar(text,text,text,boolean),
 public.ma_wa_reservar_envio(),public.ma_wa_resultado_envio(uuid,uuid,text,text,text),
 public.ma_aviso_publico(text,text,text),public.ma_aviso_foto(text,text) from public,anon,authenticated,service_role;
grant execute on function wa.ma_wa_enviar_inscritos(text,text,text),wa.ma_wa_envio_painel(text,text,text) to authenticated;
grant execute on function public.ma_enviar_inscritos(text,text,text),public.ma_envio_painel(text,text,text),public.ma_alerta_aprovar(text,text,text,boolean) to authenticated;
grant execute on function wa.ma_wa_reservar_envio(),wa.ma_wa_resultado_envio(uuid,uuid,text,text,text),
 wa.ma_wa_aviso_publico(text,text,text),wa.ma_wa_aviso_foto(text,text) to service_role;
grant execute on function public.ma_wa_reservar_envio(),public.ma_wa_resultado_envio(uuid,uuid,text,text,text),
 public.ma_aviso_publico(text,text,text),public.ma_aviso_foto(text,text) to service_role;

-- Mapa: textos do envio na ficha, no perfil do banco.
update public.ma_configuracao set documento=jsonb_set(documento,'{monitoramento-animal,textos,envio}',$j${
 "titulo":"Alerta do bairro","tituloAcao":"Aviso aos inscritos","semCapacidade":"Sua conta pode consultar, mas não aprovar nem enviar alertas.",
 "mensagem":"Mensagem do alerta","mensagemDica":"Ex.: Cachorro caramelo de porte médio, coleira azul, fugiu na Rua X. Atende por Thor.",
 "mostrarFoto":"Mostrar a foto do relato na página do alerta","aprovarEnviar":"Aprovar e enviar","aprovar":"Aprovar alerta",
 "enviar":"Enviar aos inscritos","enviarNovos":"Enviar aos novos inscritos","publico":"{n} inscritos na área: {bairros}","semBairro":"Sem bairro cadastrado: não há área para envio.",
 "desligado":"O envio pelo WhatsApp ainda não está ligado. O alerta fica aprovado e a página pública já funciona.",
 "foraSituacao":"Fora da situação de envio.","aprovado":"Alerta aprovado em {data}.","verPagina":"Ver página do alerta",
 "entregas":"Na fila {pending} · enviados {sent} · entregues {delivered} · lidos {read} · falhas {failed}",
 "gravando":"Gravando…","feito":"{n} mensagens na fila.","erro":"Não foi possível concluir: {erro}","aprovadoFeito":"Alerta aprovado."}$j$::jsonb),
 versao=versao+1 where id='mapas' and documento ? 'monitoramento-animal';
commit;
