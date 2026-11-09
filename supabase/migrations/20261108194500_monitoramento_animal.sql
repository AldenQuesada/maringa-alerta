begin;
-- Monitoramento animal. Somente acréscimos: duas coleções, permissões, capacidades, regras e guards.
-- Nenhum registro municipal é criado aqui; cada prefeitura instala o módulo por ma_instalar_protecao_animal.

-- Coleções novas. A lista anterior é preservada integralmente.
alter table public.ma_cadastros drop constraint ma_cadastros_colecao_check;
alter table public.ma_cadastros add constraint ma_cadastros_colecao_check check(colecao in ('importacoes','bairros','usuarios','zonas','bases','riscos','equipes','integrantes','voluntarios','instituicoes','veiculos','equipamentos','estoques','abrigos','pontos','ocorrenciaTipos','canais','eventos','regras','solicitacoes','relatos','mobilizacoes','apoios','incidentes','unidades','servicos','recursos','animais','alertas'));

-- Mesmas permissões de relatos, como em incidentes. A ampliação de papéis operacionais pertence à fase 2.
insert into private.ma_permissoes select papel,c,ler,gravar,excluir from private.ma_permissoes cross join unnest(array['animais','alertas']) c where colecao='relatos';

-- Capacidades operacionais: liberam ações específicas sem mudar o papel de acesso.
create table private.ma_capacidades_papel(
 papel text not null check(papel in ('admin','operador','leitor')),
 capacidade text not null check(capacidade ~ '^[a-z_]{3,40}$'),
 primary key(papel,capacidade)
);
alter table private.ma_capacidades_papel enable row level security;
revoke all on private.ma_capacidades_papel from public,anon,authenticated;
-- Só o administrador acessa operações hoje. Novas linhas aqui não ampliam acesso: ma_permitido continua exigido.
insert into private.ma_capacidades_papel values
 ('admin','triar_animais'),('admin','ver_restritos'),('admin','aprovar_alerta');

create function private.ma_capaz(municipio text,capacidade_alvo text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.ma_vinculos v
  join private.ma_capacidades_papel c on c.papel=v.papel
  join public.ma_prefeituras m on m.id=v.municipio_id
  where v.user_id=auth.uid() and v.municipio_id=municipio and c.capacidade=capacidade_alvo and m.dados->>'status'<>'suspensa');
$$;
revoke all on function private.ma_capaz(text,text) from public,anon;
grant execute on function private.ma_capaz(text,text) to authenticated,ma_escritor;

create function private.ma_capacidades_operacionais(municipio text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(distinct c.capacidade order by c.capacidade),'[]'::jsonb)
 from public.ma_vinculos v
 join private.ma_capacidades_papel c on c.papel=v.papel
 join public.ma_prefeituras m on m.id=v.municipio_id
 where auth.uid() is not null and v.user_id=auth.uid() and v.municipio_id=municipio and m.dados->>'status'<>'suspensa';
$$;
revoke all on function private.ma_capacidades_operacionais(text) from public,anon;
grant execute on function private.ma_capacidades_operacionais(text) to authenticated;
create function public.ma_capacidades_operacionais(municipio text) returns jsonb
language sql stable security invoker set search_path='' as $$select private.ma_capacidades_operacionais(municipio)$$;
revoke all on function public.ma_capacidades_operacionais(text) from public,anon;
grant execute on function public.ma_capacidades_operacionais(text) to authenticated;

-- Contratos, transições e relações: as regras genéricas existentes passam a cobrir as coleções novas.
update public.ma_configuracao set documento=documento||$j${
 "animais":{"required":["especie"],"enums":{"especie":["Cão","Gato","Cavalo, boi ou outro de grande porte","Ave","Outro"],"porte":["Pequeno","Médio","Grande"],"status":["Perdido","Encontrado","Em atendimento","Em abrigo","Reunido com o tutor","Adotado","Óbito"]}},
 "alertas":{"required":["incidente_id","mensagem"],"enums":{"status":["Rascunho","Aprovado","Cancelado"],"nivel":["Bairro","Ampliado"]}}
}$j$::jsonb,versao=versao+1 where id='contratos';

update public.ma_configuracao set documento=jsonb_set(jsonb_set(jsonb_set(documento,
 '{transicoes,animais}','{"inicial":["Perdido","Encontrado","Em atendimento","Em abrigo"],"estados":{"Perdido":["Encontrado","Em atendimento","Reunido com o tutor","Óbito"],"Encontrado":["Em atendimento","Em abrigo","Reunido com o tutor","Óbito"],"Em atendimento":["Em abrigo","Reunido com o tutor","Óbito"],"Em abrigo":["Em atendimento","Reunido com o tutor","Adotado","Óbito"],"Reunido com o tutor":["Perdido"],"Adotado":["Perdido"],"Óbito":[]}}'),
 '{transicoes,alertas}','{"inicial":["Rascunho"],"estados":{"Rascunho":["Aprovado","Cancelado"],"Aprovado":["Cancelado"],"Cancelado":[]}}'),
 '{protecaoAnimal}',$j${"categoriaTipos":"animais","colecoesRestritas":["relatos","incidentes"],"desfechos":["Reunido com o tutor","Acolhido em abrigo","Atendido por veterinário","Encaminhado à Secretaria ou Ouvidoria 156","Não localizado no endereço"],"capacidades":{"triagem":"triar_animais","restritos":"ver_restritos","aprovarAlerta":"aprovar_alerta"}}$j$::jsonb),
 versao=versao+1 where id='operacao';

update public.ma_configuracao set documento=documento
 ||jsonb_build_object('incidentes',coalesce(documento->'incidentes','{}'::jsonb)||'{"animal_id":"animais"}'::jsonb)
 ||'{"animais":{"unidade_id":"unidades"},"alertas":{"incidente_id":"incidentes"}}'::jsonb,
 versao=versao+1 where id='relacoes';

-- Esquemas para formulários gerados. Nenhum grupo novo é acrescentado à navegação da Gestão.
update public.ma_configuracao set documento=jsonb_set(jsonb_set(documento,'{esquemas,animais}',$j${"label":"Animais","singular":"Animal","collection":"animais","summary":"Animais acompanhados pela proteção animal, ligados às ocorrências.","columns":["nome","especie","status"],"fields":[
 {"key":"nome","label":"Nome ou identificação","type":"text"},
 {"key":"especie","label":"Espécie","type":"select","required":true,"options":["Cão","Gato","Cavalo, boi ou outro de grande porte","Ave","Outro"]},
 {"key":"porte","label":"Porte","type":"select","options":["Pequeno","Médio","Grande"]},
 {"key":"caracteristicas","label":"Características","type":"textarea"},
 {"key":"microchip","label":"Microchip","type":"text"},
 {"key":"status","label":"Situação","type":"select","required":true,"options":["Perdido","Encontrado","Em atendimento","Em abrigo","Reunido com o tutor","Adotado","Óbito"]},
 {"key":"unidade_id","label":"Abrigo ou unidade atual","type":"hidden"}]}$j$::jsonb),
 '{esquemas,alertas}',$j${"label":"Alertas de animais","singular":"Alerta","collection":"alertas","summary":"Rascunhos e aprovações de alertas por bairro. O envio real depende da fase de alertas.","columns":["mensagem","nivel","status"],"fields":[
 {"key":"incidente_id","label":"Ocorrência","type":"hidden","required":true},
 {"key":"nivel","label":"Abrangência","type":"select","options":["Bairro","Ampliado"]},
 {"key":"mensagem","label":"Mensagem","type":"textarea","required":true},
 {"key":"status","label":"Situação","type":"select","required":true,"options":["Rascunho","Aprovado","Cancelado"]}]}$j$::jsonb),
 versao=versao+1 where id='interface';

-- Perfil do mapa: título, camadas, filtros e legenda vêm daqui, não do JavaScript.
insert into public.ma_configuracao(id,documento) values('mapas',$j${
 "monitoramento-animal":{
  "titulo":"Monitoramento animal","eyebrow":"PROTEÇÃO ANIMAL","subtitulo":"Relatos do WhatsApp, triagem e ocorrências por bairro.",
  "camera":"ajuda",
  "camadas":[
   {"id":"triagem","rotulo":"Triagem","colecao":"relatos","filtro":{"categoria":"animal","status":"Em triagem"}},
   {"id":"ocorrencias","rotulo":"Ocorrências","colecao":"incidentes","tipos":{"categoria":"animais"}},
   {"id":"unidades","rotulo":"Unidades de atendimento","catalogo":{"categoria":"animais"}}],
  "filtros":["camada","zona","situacao","busca","mostrar_resolvidas"],
  "situacao":{"fonte":"ocorrenciaTipos","categoria":"animais"},
  "legenda":{"fonte":"ocorrenciaTipos","campos":["cor","icone"]},
  "estadosEncerrados":["Resolvida","Arquivada"]}}$j$::jsonb);

-- Modelo de instalação por prefeitura. Editável sem deploy; nada é gravado até a instalação.
insert into public.ma_configuracao(id,documento) values('modelos',$j${
 "protecao-animal":{
  "evento":{"id":"protecao-animal-rotina","nome":"Rotina da proteção animal","tipo":"Permanente","status":"Em andamento"},
  "tipos":[
   {"id":"animal-perdido","nome":"Animal perdido","prioridade":"Baixa","categoria":"animais","situacao_whatsapp":"Perdi meu animal","cor":"#ff647a","icone":"🐾","gravidade_padrao":"1","visibilidade":"publica","exige_desfecho":true},
   {"id":"animal-encontrado","nome":"Animal encontrado","prioridade":"Baixa","categoria":"animais","situacao_whatsapp":"Encontrei um animal","cor":"#39a9fc","icone":"🐕","gravidade_padrao":"1","visibilidade":"publica","exige_desfecho":true},
   {"id":"animal-ferido","nome":"Animal ferido ou em risco","prioridade":"Alta","categoria":"animais","situacao_whatsapp":"Animal ferido ou em risco","cor":"#ffb020","icone":"🚑","gravidade_padrao":"3","visibilidade":"publica","exige_desfecho":true},
   {"id":"animal-maus-tratos","nome":"Maus-tratos ou abandono","prioridade":"Média","categoria":"animais","situacao_whatsapp":"Maus-tratos ou abandono","cor":"#b48cff","icone":"⚠","gravidade_padrao":"2","visibilidade":"restrita","exige_desfecho":true}]}}$j$::jsonb);

-- Área de alerta calculada no servidor: o bairro e os vizinhos que tocam sua geometria.
create function private.ma_area_alerta(municipio text,bairro text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.ma_permitido(municipio,'alertas','ler') then raise exception 'Operação não autorizada' using errcode='42501';end if;
 return (
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'nome',c.dados->>'nome','origem',b.id=bairro) order by b.id<>bairro,c.dados->>'nome'),'[]'::jsonb)
  from territorio.entidades a
  join territorio.entidades b on b.municipio_id=a.municipio_id and b.colecao='bairros' and b.area is not null and (b.id=a.id or gis.st_intersects(a.area,b.area))
  join public.ma_cadastros c on c.municipio_id=b.municipio_id and c.colecao='bairros' and c.id=b.id
  where a.municipio_id=municipio and a.colecao='bairros' and a.id=bairro and a.area is not null);
end;
$$;
revoke all on function private.ma_area_alerta(text,text) from public,anon;
grant execute on function private.ma_area_alerta(text,text) to authenticated,ma_escritor;
create function public.ma_area_alerta(municipio text,bairro text) returns jsonb
language sql stable security invoker set search_path='' as $$select private.ma_area_alerta(municipio,bairro)$$;
revoke all on function public.ma_area_alerta(text,text) from public,anon;
grant execute on function public.ma_area_alerta(text,text) to authenticated;

-- Guards do módulo. Executa depois dos contratos e normalizações existentes (ordem alfabética dos triggers).
create function private.ma_protecao_animal() returns trigger language plpgsql security definer set search_path='' as $$
declare cfg jsonb; tipo jsonb; vis text; inc jsonb; antes jsonb:='{}'; status_novo text; status_antes text;
begin
 if new.colecao not in ('ocorrenciaTipos','relatos','incidentes','alertas') then return new;end if;
 select documento->'protecaoAnimal' into cfg from public.ma_configuracao where id='operacao';
 if TG_OP='UPDATE' then antes:=old.dados;end if;

 if new.colecao='ocorrenciaTipos' then
  vis:=coalesce(nullif(new.dados->>'visibilidade',''),'publica');
  if vis not in ('publica','restrita') then raise exception 'Visibilidade inválida' using errcode='23514';end if;
  if antes->>'visibilidade'='restrita' and vis<>'restrita' and auth.uid() is not null and not private.ma_capaz(new.municipio_id,cfg#>>'{capacidades,restritos}') then
   raise exception 'Tornar público um tipo restrito exige capacidade específica' using errcode='42501';end if;
  return new;
 end if;

 if new.colecao='relatos' then
  if coalesce(new.dados->>'categoria',antes->>'categoria','')<>'animal' then return new;end if;
  select dados into tipo from public.ma_cadastros
   where municipio_id=new.municipio_id and colecao='ocorrenciaTipos' and dados->>'categoria'=cfg->>'categoriaTipos' and dados->>'situacao_whatsapp'=new.dados->>'situacao'
   order by id limit 1;
  vis:=case when antes->>'visibilidade'='restrita' then 'restrita' else coalesce(tipo->>'visibilidade','restrita') end;
  new.dados:=new.dados||jsonb_build_object('categoria','animal','visibilidade',vis);
  return new;
 end if;

 if new.colecao='incidentes' then
  select dados into tipo from public.ma_cadastros where municipio_id=new.municipio_id and colecao='ocorrenciaTipos' and id=new.dados->>'tipo_id';
  if coalesce(tipo->>'categoria','')<>cfg->>'categoriaTipos' then return new;end if;
  vis:=case when antes->>'visibilidade'='restrita' then 'restrita' else coalesce(tipo->>'visibilidade','restrita') end;
  new.dados:=new.dados||jsonb_build_object('categoria',cfg->>'categoriaTipos','visibilidade',vis);
  status_novo:=new.dados->>'status';status_antes:=antes->>'status';
  if auth.uid() is not null and status_novo is distinct from status_antes and not private.ma_capaz(new.municipio_id,cfg#>>'{capacidades,triagem}') then
   raise exception 'Triagem de animais exige capacidade específica' using errcode='42501';end if;
  if status_novo='Resolvida' and coalesce((tipo->>'exige_desfecho')::boolean,false) and not coalesce(cfg->'desfechos','[]'::jsonb) ? coalesce(new.dados->>'desfecho','') then
   raise exception 'Desfecho obrigatório e da lista configurada' using errcode='23514';end if;
  return new;
 end if;

 -- alertas
 if TG_OP='UPDATE' and new.dados->>'incidente_id' is distinct from antes->>'incidente_id' then raise exception 'Ocorrência do alerta é imutável' using errcode='23514';end if;
 select dados into inc from public.ma_cadastros where municipio_id=new.municipio_id and colecao='incidentes' and id=new.dados->>'incidente_id';
 if inc is null then raise exception 'Ocorrência inexistente nesta prefeitura' using errcode='23503';end if;
 if inc->>'visibilidade'='restrita' then raise exception 'Ocorrência restrita não admite alerta' using errcode='23514';end if;
 status_novo:=coalesce(nullif(new.dados->>'status',''),'Rascunho');status_antes:=antes->>'status';
 if TG_OP='INSERT' then
  if inc->>'status'<>'Confirmada' then raise exception 'Alerta exige ocorrência confirmada' using errcode='23514';end if;
  new.dados:=new.dados||jsonb_build_object('status',status_novo,'criado_por',auth.uid(),'criado_em',clock_timestamp(),
   'zonas',coalesce(private.ma_area_alerta(new.municipio_id,inc->>'bairro_id'),'[]'::jsonb),'aprovado_por',null,'aprovado_em',null);
  return new;
 end if;
 if status_antes='Aprovado' and new.dados->>'mensagem' is distinct from antes->>'mensagem' then raise exception 'Alerta aprovado não pode ser editado' using errcode='23514';end if;
 new.dados:=new.dados||jsonb_build_object('criado_por',antes->'criado_por','criado_em',antes->'criado_em','zonas',antes->'zonas','aprovado_por',antes->'aprovado_por','aprovado_em',antes->'aprovado_em');
 if status_novo='Aprovado' and status_antes is distinct from 'Aprovado' then
  if not private.ma_capaz(new.municipio_id,cfg#>>'{capacidades,aprovarAlerta}') then raise exception 'Aprovação exige capacidade específica' using errcode='42501';end if;
  if auth.uid()::text=antes->>'criado_por' then raise exception 'Quem cria o alerta não pode aprová-lo' using errcode='42501';end if;
  new.dados:=new.dados||jsonb_build_object('aprovado_por',auth.uid(),'aprovado_em',clock_timestamp());
 end if;
 return new;
end;
$$;
revoke all on function private.ma_protecao_animal() from public,anon,authenticated,ma_escritor;
create trigger ma_zz_protecao_animal before insert or update on public.ma_cadastros for each row execute function private.ma_protecao_animal();

-- Registros restritos só são lidos ou gravados por quem tem a capacidade. Política restritiva: soma-se às existentes.
-- Vale somente para as coleções operacionais configuradas; a definição do tipo continua legível.
create function private.ma_visivel(municipio text,colecao_alvo text,dados jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(dados->>'visibilidade','')<>'restrita'
  or not exists(select 1 from public.ma_configuracao where id='operacao' and documento#>'{protecaoAnimal,colecoesRestritas}' ? colecao_alvo)
  or private.ma_capaz(municipio,(select documento#>>'{protecaoAnimal,capacidades,restritos}' from public.ma_configuracao where id='operacao'));
$$;
revoke all on function private.ma_visivel(text,text,jsonb) from public,anon;
grant execute on function private.ma_visivel(text,text,jsonb) to authenticated,ma_escritor;
create policy protecao_animal_restrito on public.ma_cadastros as restrictive for all to authenticated,ma_escritor
 using(private.ma_visivel(municipio_id,colecao,dados)) with check(private.ma_visivel(municipio_id,colecao,dados));
-- A projeção territorial acompanha a visibilidade do cadastro.
create policy protecao_animal_restrito_projecao on territorio.entidades as restrictive for select to authenticated
 using(exists(select 1 from public.ma_cadastros c where c.municipio_id=entidades.municipio_id and c.colecao=entidades.colecao and c.id=entidades.id));

-- Instalação por prefeitura: cria os tipos e o evento permanente a partir do modelo, pelo caminho canônico.
create function public.ma_instalar_protecao_animal(municipio text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare modelo jsonb; t jsonb; ev jsonb; lote jsonb:='[]'::jsonb;
begin
 if not private.ma_permitido(municipio,'ocorrenciaTipos','excluir') then raise exception 'Instalação exige administrador municipal' using errcode='42501';end if;
 select documento->'protecao-animal' into modelo from public.ma_configuracao where id='modelos';
 if modelo is null then raise exception 'Modelo da proteção animal ausente' using errcode='23514';end if;
 for t in select value from jsonb_array_elements(modelo->'tipos') loop
  if not exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao='ocorrenciaTipos' and id=t->>'id') then
   lote:=lote||jsonb_build_array(jsonb_build_object('operacao','inserir','colecao','ocorrenciaTipos','id',t->>'id','municipio_id',municipio,
    'dados',(t-'id')||jsonb_build_object('id',t->>'id','municipioId',municipio)));
  end if;
 end loop;
 ev:=modelo->'evento';
 if not exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao='eventos' and id=ev->>'id') then
  lote:=lote||jsonb_build_array(jsonb_build_object('operacao','inserir','colecao','eventos','id',ev->>'id','municipio_id',municipio,
   'dados',(ev-'id')||jsonb_build_object('id',ev->>'id','municipioId',municipio)));
 end if;
 if jsonb_array_length(lote)>0 then perform public.ma_aplicar_alteracoes(lote);end if;
 return jsonb_build_object('criados',jsonb_array_length(lote));
end;
$$;
revoke all on function public.ma_instalar_protecao_animal(text) from public,anon;
grant execute on function public.ma_instalar_protecao_animal(text) to authenticated;
commit;
