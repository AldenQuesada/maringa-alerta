begin;
-- Monitoramento animal, etapa D. Somente acréscimos ao módulo:
-- 1) textos e cores do mapa passam a morar no perfil do banco;
-- 2) ações de triagem configuradas em operacao.protecaoAnimal.triagem;
-- 3) uma única função de triagem, executada com a permissão de quem chama, gravando pelo caminho canônico;
-- 4) a trava do módulo passa a exigir a capacidade também para relatos e registra quem triou.

-- 1) Perfil do mapa: textos da tela e cores. A página não tem texto ou cor de reserva.
update public.ma_configuracao set documento=jsonb_set(documento,'{monitoramento-animal}',documento->'monitoramento-animal'||$j${
 "cores":{"contornoZona":"#e7b94c","destaqueRestrito":"#b48cff"},
 "textos":{
  "pagina":{
   "sistema":"Sistema Integrado de Gestão de Crise","voltarGestao":"Voltar à Gestão",
   "mapaRotulo":"Mapa de monitoramento animal","filtrosUnidades":"Filtros de unidades","minimizarFiltros":"Minimizar filtros","fecharFiltros":"Fechar filtros",
   "abrirPainel":"Abrir painel","recolherPainel":"Recolher painel","fecharFicha":"Fechar ficha","prefeitura":"Prefeitura",
   "indicadorTriagem":"Em triagem","indicadorAbertas":"Ocorrências abertas","indicadorSigilosas":"Sigilosas",
   "filtroCamada":"Camada","filtroZona":"Zona numerada","filtroSituacao":"Situação","filtroBusca":"Buscar","buscaDica":"Protocolo, espécie, bairro...",
   "mostrarEncerradas":"Mostrar resolvidas e arquivadas","listaTitulo":"Relatos e ocorrências","filtrosBotao":"Filtros","simularWhatsapp":"Simular WhatsApp","gestao":"Gestão",
   "tituloDocumento":"{titulo} | {cidade} · Sistema Integrado de Crise"},
  "filtros":{"todasCamadas":"Todas as camadas","todasZonas":"Todas as zonas","todasSituacoes":"Todas as situações","mostrarUnidades":"Mostrar {rotulo}"},
  "lista":{"relato":"Relato","ocorrencia":"Ocorrência","registro":"registro","registros":"registros","semPosicao":"{n} sem posição","localNaoInformado":"Local não informado",
   "vazioTitulo":"Nenhum registro neste filtro.","vazioDetalhe":"Os relatos chegam pelo WhatsApp e entram em triagem.","registroGenerico":"Registro"},
  "legenda":{"sigiloso":"sigiloso","triagem":"Contorno tracejado: relato em triagem, posição aproximada pelo bairro"},
  "mapa":{"aproximada":"localização aproximada do bairro {bairro}","enderecoNaoInformado":"Endereço não informado","unidadesIndisponiveis":"Unidades de atendimento indisponíveis: {erro}"},
  "ficha":{"relato":"RELATO","ocorrencia":"OCORRÊNCIA","protocolo":"Protocolo","especie":"Espécie","endereco":"Endereço","bairro":"Bairro","localizacao":"Localização",
   "aproximada":"Aproximada pelo bairro","coordenadas":"Coordenadas registradas","semPosicao":"Sem posição no mapa","descricao":"Descrição","origem":"Origem",
   "registradoEm":"Registrado em","sigilo":"Sigilo","sigiloRestrito":"Denúncia restrita","denunciante":"Denunciante","anonimo":"Anônimo","desfecho":"Desfecho",
   "motivo":"Motivo do arquivamento","triadoEm":"Triado em","ocorrenciaGerada":"Ocorrência gerada"},
  "triagem":{"titulo":"Triagem","semCapacidade":"Sua conta pode consultar, mas não fazer triagem.","semAcoes":"Nenhuma ação disponível nesta situação.",
   "bairro":"Bairro da ocorrência","escolherBairro":"Escolha o bairro","motivo":"Motivo","escolherMotivo":"Escolha o motivo","desfecho":"Desfecho","escolherDesfecho":"Escolha o desfecho",
   "confirmar":"Confirmar","cancelar":"Cancelar","gravando":"Gravando…","feito":"{acao}: registrado.","erro":"Não foi possível registrar: {erro}"}}}$j$::jsonb),
 versao=versao+1 where id='mapas';

-- 2) Ações de triagem: estado de origem, destino, o que cada uma exige e o que cria.
-- Os destinos respeitam as transições já configuradas para relatos e incidentes.
update public.ma_configuracao set documento=jsonb_set(documento,'{protecaoAnimal,triagem}',$j${
 "eventoPadrao":"protecao-animal-rotina","responsabilidadePadrao":"publica",
 "motivosArquivamento":["Relato duplicado","Fora do município","Sem informação suficiente","Informação falsa ou trote"],
 "acoes":{
  "relatos":[
   {"id":"confirmar","rotulo":"Confirmar e abrir ocorrência","de":["Em triagem"],"para":"Confirmado","cria":"incidentes","exige":["bairro_id"]},
   {"id":"arquivar","rotulo":"Arquivar relato","de":["Em triagem"],"para":"Arquivado","exige":["motivo"]}],
  "incidentes":[
   {"id":"resolver","rotulo":"Registrar desfecho","de":["Confirmada"],"para":"Resolvida","exige":["desfecho"]},
   {"id":"arquivar","rotulo":"Arquivar ocorrência","de":["Em triagem","Confirmada"],"para":"Arquivada","exige":["motivo"]}]}}$j$::jsonb),
 versao=versao+1 where id='operacao';

-- 3) Triagem: invoker, sem privilégio próprio. A permissão de escrita, a capacidade, os contratos,
-- as transições e o histórico continuam sendo aplicados por ma_aplicar_alteracoes e pelas travas.
create function public.ma_triar_animal(municipio text,colecao_alvo text,registro text,acao text,status_esperado text,detalhe jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg jsonb; regra jsonb; atual record; novo jsonb; tipo jsonb; pos record; lote jsonb:='[]'::jsonb; inc_id text; valor text;
begin
 select documento->'protecaoAnimal' into cfg from public.ma_configuracao where id='operacao';
 if cfg->'triagem' is null then raise exception 'Triagem da proteção animal não configurada' using errcode='23514';end if;
 if not private.ma_capaz(municipio,cfg#>>'{capacidades,triagem}') then raise exception 'Triagem de animais exige capacidade específica' using errcode='42501';end if;
 if colecao_alvo not in ('relatos','incidentes') then raise exception 'Coleção sem triagem' using errcode='22023';end if;
 select value into regra from jsonb_array_elements(coalesce(cfg#>array['triagem','acoes',colecao_alvo],'[]'::jsonb)) where value->>'id'=acao;
 if regra is null then raise exception 'Ação de triagem desconhecida' using errcode='22023';end if;
 detalhe:=coalesce(detalhe,'{}'::jsonb);

 select c.dados,c.versao into atual from public.ma_cadastros c where c.municipio_id=municipio and c.colecao=colecao_alvo and c.id=registro;
 if not found then raise exception 'Registro inexistente ou sem acesso' using errcode='P0002';end if;
 if (colecao_alvo='relatos' and coalesce(atual.dados->>'categoria','')<>'animal')
  or (colecao_alvo='incidentes' and coalesce(atual.dados->>'categoria','')<>cfg->>'categoriaTipos') then
  raise exception 'Registro fora da proteção animal' using errcode='22023';end if;
 if atual.dados->>'status' is distinct from status_esperado then raise exception 'O registro mudou desde que foi aberto. Atualize a página.' using errcode='40001';end if;
 if not coalesce(regra->'de','[]'::jsonb) ? coalesce(atual.dados->>'status','') then raise exception 'Ação indisponível nesta situação' using errcode='23514';end if;

 novo:=atual.dados||jsonb_build_object('status',regra->>'para');
 if coalesce(regra->'exige','[]'::jsonb) ? 'motivo' then
  valor:=detalhe->>'motivo';
  if not coalesce(cfg#>'{triagem,motivosArquivamento}','[]'::jsonb) ? coalesce(valor,'') then raise exception 'Motivo obrigatório e da lista configurada' using errcode='23514';end if;
  novo:=novo||jsonb_build_object('motivo_arquivamento',valor);
 end if;
 if coalesce(regra->'exige','[]'::jsonb) ? 'desfecho' then
  valor:=detalhe->>'desfecho';
  if not coalesce(cfg->'desfechos','[]'::jsonb) ? coalesce(valor,'') then raise exception 'Desfecho obrigatório e da lista configurada' using errcode='23514';end if;
  novo:=novo||jsonb_build_object('desfecho',valor);
 end if;

 if regra->>'cria'='incidentes' then
  select c.dados into tipo from public.ma_cadastros c where c.municipio_id=municipio and c.colecao='ocorrenciaTipos'
   and c.dados->>'categoria'=cfg->>'categoriaTipos' and c.dados->>'situacao_whatsapp'=atual.dados->>'situacao' order by c.id limit 1;
  if tipo is null then raise exception 'A situação do relato não tem tipo de ocorrência configurado' using errcode='23514';end if;
  -- Posição oficial: ponto interno da geometria do bairro escolhido. O cliente não envia coordenadas.
  select gis.st_y(gis.st_pointonsurface(e.area)) as lat,gis.st_x(gis.st_pointonsurface(e.area)) as lng into pos
   from territorio.entidades e where e.municipio_id=municipio and e.colecao='bairros' and e.id=detalhe->>'bairro_id' and e.area is not null;
  if not found then raise exception 'Bairro inexistente ou sem geometria oficial' using errcode='23514';end if;
  inc_id:='animal-'||replace(gen_random_uuid()::text,'-','');
  lote:=lote||jsonb_build_array(jsonb_build_object('operacao','inserir','colecao','incidentes','id',inc_id,'municipio_id',municipio,'dados',jsonb_strip_nulls(jsonb_build_object(
   'id',inc_id,'municipioId',municipio,'tipo_id',tipo->>'id','evento_id',cfg#>>'{triagem,eventoPadrao}','bairro_id',detalhe->>'bairro_id',
   'endereco',atual.dados->>'endereco','quando',coalesce(atual.dados->>'criado_em',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')),
   'gravidade',coalesce(tipo->>'gravidade_padrao','1'),'responsabilidade',cfg#>>'{triagem,responsabilidadePadrao}',
   'lat',pos.lat::text,'lng',pos.lng::text,'status','Confirmada','especie',atual.dados->>'especie','descricao',atual.dados->>'descricao',
   -- Fotos e dados do denunciante ficam no relato de origem, que mantém a própria visibilidade.
   'origem_relato',registro))));
  novo:=novo||jsonb_build_object('incidente_id',inc_id);
 end if;

 lote:=lote||jsonb_build_array(jsonb_build_object('operacao','atualizar','colecao',colecao_alvo,'id',registro,'municipio_id',municipio,'versao',atual.versao,'dados',novo));
 perform public.ma_aplicar_alteracoes(lote);
 return jsonb_strip_nulls(jsonb_build_object('colecao',colecao_alvo,'id',registro,'status',regra->>'para','incidente_id',inc_id));
end;
$$;
revoke all on function public.ma_triar_animal(text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.ma_triar_animal(text,text,text,text,text,jsonb) to authenticated;

-- 4) Trava do módulo: igual à etapa A, mais duas regras. Mudança de situação de relato de animal exige a capacidade,
-- e toda mudança de situação de relato ou ocorrência de animal registra quem triou e quando, pelo servidor.
create or replace function private.ma_protecao_animal() returns trigger language plpgsql security definer set search_path='' as $$
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
  status_novo:=new.dados->>'status';status_antes:=antes->>'status';
  if TG_OP='UPDATE' and status_novo is distinct from status_antes then
   if auth.uid() is not null and not private.ma_capaz(new.municipio_id,cfg#>>'{capacidades,triagem}') then
    raise exception 'Triagem de animais exige capacidade específica' using errcode='42501';end if;
   new.dados:=new.dados||jsonb_build_object('triado_por',auth.uid(),'triado_em',clock_timestamp());
  end if;
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
  if status_novo is distinct from status_antes then new.dados:=new.dados||jsonb_build_object('triado_por',auth.uid(),'triado_em',clock_timestamp());end if;
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
commit;
