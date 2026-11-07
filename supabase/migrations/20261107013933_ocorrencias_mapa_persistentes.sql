begin;
-- Somente regras e contratos. Nenhum registro operacional ou fixture.
alter table public.ma_cadastros drop constraint ma_cadastros_colecao_check;
alter table public.ma_cadastros add constraint ma_cadastros_colecao_check check(colecao in ('importacoes','bairros','usuarios','zonas','bases','riscos','equipes','integrantes','voluntarios','instituicoes','veiculos','equipamentos','estoques','abrigos','pontos','ocorrenciaTipos','canais','eventos','regras','solicitacoes','relatos','mobilizacoes','apoios','incidentes'));
update public.ma_configuracao set documento=jsonb_set(documento,'{esquemas,incidentes}',$schema${"editor":"mapa","label":"Ocorrências do mapa","singular":"Ocorrência","collection":"incidentes","summary":"Registros operacionais vinculados ao evento e ao bairro.","columns":["protocolo","nome","bairro","status"],"fields":[{"key":"nome","label":"Tipo da ocorrência","type":"text"},{"key":"tipo_id","label":"Tipo cadastrado","type":"hidden","required":true},{"key":"evento_id","label":"Evento cadastrado","type":"hidden","required":true},{"key":"bairro_id","label":"Bairro cadastrado","type":"hidden","required":true},{"key":"bairro","label":"Bairro","type":"text"},{"key":"endereco","label":"Endereço","type":"text","required":true},{"key":"descricao","label":"Descrição","type":"textarea"},{"key":"status","label":"Situação","type":"select","required":true,"options":["Em triagem","Confirmada","Resolvida","Arquivada"]},{"key":"gravidade","label":"Gravidade","type":"select","required":true,"options":["1","2","3"]},{"key":"responsabilidade","label":"Responsabilidade","type":"select","required":true,"options":["publica","privada","mista"]},{"key":"lat","label":"Latitude","type":"text","required":true},{"key":"lng","label":"Longitude","type":"text","required":true},{"key":"afetados","label":"Pessoas afetadas","type":"number"},{"key":"quando","label":"Data da ocorrência","type":"text","required":true},{"key":"acesso","label":"Acesso","type":"text"},{"key":"riscos","label":"Riscos","type":"text"},{"key":"origem","label":"Origem do relato","type":"text"},{"key":"comunicante","label":"Comunicante","type":"text"},{"key":"contato","label":"Contato","type":"tel"},{"key":"organizacoes","label":"Organizações selecionadas","type":"hidden"},{"key":"fotos","label":"Fotos privadas","type":"hidden"},{"key":"relatos","label":"Relatos vinculados","type":"hidden"},{"key":"protocolo","label":"Protocolo","type":"hidden"},{"key":"criado_em","label":"Registrado em","type":"hidden"},{"key":"atualizado_em","label":"Atualizado em","type":"hidden"}]}$schema$::jsonb),versao=versao+1 where id='interface';
update public.ma_configuracao set documento=jsonb_set(documento,'{grupos}',(documento->'grupos')||'{"label":"Operação","items":["incidentes"]}'::jsonb) where id='interface';
update public.ma_configuracao set documento=documento||jsonb_build_object('incidentes',$contract${"required":["tipo_id","evento_id","bairro_id","endereco","status","gravidade","responsabilidade","lat","lng","quando"],"enums":{"status":["Em triagem","Confirmada","Resolvida","Arquivada"],"gravidade":["1","2","3"],"responsabilidade":["publica","privada","mista"]}}$contract$::jsonb),versao=versao+1 where id='contratos';
insert into private.ma_permissoes select papel,'incidentes',ler,gravar,excluir from private.ma_permissoes where colecao='relatos';
update public.ma_configuracao set documento=documento||'{"incidentes":{"tipo_id":"ocorrenciaTipos","evento_id":"eventos","bairro_id":"bairros"}}',versao=versao+1 where id='relacoes';
update public.ma_configuracao set documento=jsonb_set(jsonb_set(jsonb_set(documento,
 '{transicoes,incidentes}','{"inicial":["Em triagem","Confirmada"],"estados":{"Em triagem":["Confirmada","Arquivada"],"Confirmada":["Resolvida","Arquivada"],"Resolvida":[],"Arquivada":[]}}'),
 '{numeros,incidentes}','{"afetados":{"min":0,"inteiro":true}}'),
 '{ocorrenciasMapa}','{"raioDuplicidadeMetros":150,"janelaDuplicidadeHoras":24,"fotosMaximas":4,"fotoBytesMaximos":750000,"relatosMaximos":100,"organizacoesMaximas":50}'),versao=versao+1 where id='operacao';

create function private.ma_validar_incidente() returns trigger language plpgsql security definer set search_path='' as $$
declare tipo jsonb; evento jsonb; bairro jsonb; geo jsonb; limites jsonb; item jsonb; registros jsonb; lista jsonb; foto jsonb; org jsonb; colecao_alvo text; id_alvo text; canonicas jsonb:='[]'; momento timestamptz;
begin
 if new.colecao<>'incidentes' then return new;end if;
 select documento->'ocorrenciasMapa' into limites from public.ma_configuracao where id='operacao';
 if limites is null then raise exception 'Regras de ocorrências ausentes' using errcode='23514';end if;
 select dados into tipo from public.ma_cadastros where municipio_id=new.municipio_id and colecao='ocorrenciaTipos' and id=new.dados->>'tipo_id';
 select dados into evento from public.ma_cadastros where municipio_id=new.municipio_id and colecao='eventos' and id=new.dados->>'evento_id';
 select dados into bairro from public.ma_cadastros where municipio_id=new.municipio_id and colecao='bairros' and id=new.dados->>'bairro_id';
 if tipo is null or evento is null or bairro is null then raise exception 'Tipo, evento e bairro devem pertencer à prefeitura' using errcode='23514';end if;
 if TG_OP='INSERT' and evento->>'status'='Encerrado' then raise exception 'Evento encerrado' using errcode='23514';end if;
 begin geo:=case when jsonb_typeof(bairro->'geojson')='object' then bairro->'geojson' else (bairro->>'geojson')::jsonb end;exception when others then raise exception 'Bairro sem geometria válida' using errcode='23514';end;
 if geo->>'type'='Feature' then geo:=geo->'geometry';end if;
 if not private.ma_dentro_poligono(geo,(new.dados->>'lng')::numeric,(new.dados->>'lat')::numeric) then raise exception 'Local fora do bairro cadastrado' using errcode='23514';end if;
 begin momento:=(new.dados->>'quando')::timestamptz;exception when others then raise exception 'Data da ocorrência inválida' using errcode='23514';end;
 if not isfinite(momento) or momento>clock_timestamp()+interval '5 minutes' then raise exception 'Data da ocorrência inválida' using errcode='23514';end if;
 if TG_OP='UPDATE' and (new.dados->>'tipo_id' is distinct from old.dados->>'tipo_id' or new.dados->>'evento_id' is distinct from old.dados->>'evento_id' or new.dados->>'bairro_id' is distinct from old.dados->>'bairro_id') then raise exception 'Vínculos de ocorrência são imutáveis' using errcode='23514';end if;
 lista:=case when new.dados->'organizacoes' is null or new.dados->'organizacoes'='""' then '[]'::jsonb else new.dados->'organizacoes' end;
 if jsonb_typeof(lista)<>'array' then raise exception 'Organizações inválidas' using errcode='23514';end if;
 if jsonb_array_length(lista)>(limites->>'organizacoesMaximas')::int then raise exception 'Organizações excedem limite' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(lista) loop
  colecao_alvo:=item->>'colecao';id_alvo:=item->>'id';
  if colecao_alvo not in ('equipes','instituicoes') or id_alvo is null then raise exception 'Organização inválida' using errcode='23514';end if;
  select dados into org from public.ma_cadastros where municipio_id=new.municipio_id and colecao=colecao_alvo and id=id_alvo;
  if org is null then raise exception 'Organização de outra prefeitura ou inexistente' using errcode='23514';end if;
  canonicas:=canonicas||jsonb_build_array(jsonb_build_object('colecao',colecao_alvo,'id',id_alvo,'nome',org->>'nome'));
 end loop;
 -- Fotos e relatos privados, com limites do banco. Não são publicadas automaticamente.
 registros:=jsonb_build_array(jsonb_build_object('fotos',case when new.dados->'fotos' is null or new.dados->'fotos'='""' then '[]'::jsonb else new.dados->'fotos' end));
 lista:=case when new.dados->'relatos' is null or new.dados->'relatos'='""' then '[]'::jsonb else new.dados->'relatos' end;
 if jsonb_typeof(lista)<>'array' then raise exception 'Relatos inválidos' using errcode='23514';end if;
 if jsonb_array_length(lista)>(limites->>'relatosMaximos')::int then raise exception 'Relatos excedem limite' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(registros||lista) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'fotos') is distinct from 'array' then raise exception 'Formato de relato ou fotos inválido' using errcode='23514';end if;
  if jsonb_array_length(item->'fotos')>(limites->>'fotosMaximas')::int then raise exception 'Fotos excedem limite' using errcode='23514';end if;
  for foto in select value from jsonb_array_elements(item->'fotos') loop
   if jsonb_typeof(foto)<>'object' or coalesce(foto->>'dados','') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'Imagem inválida' using errcode='23514';end if;
   begin if octet_length(decode(split_part(foto->>'dados',',',2),'base64'))>(limites->>'fotoBytesMaximos')::int then raise exception 'Foto excede limite' using errcode='23514';end if;exception when invalid_parameter_value then raise exception 'Imagem inválida' using errcode='23514';end;
  end loop;
 end loop;
 new.dados:=new.dados||jsonb_build_object('nome',tipo->>'nome','bairro',bairro->>'nome','organizacoes',canonicas,'relatos',lista,'fotos',registros->0->'fotos','atualizado_em',clock_timestamp(),'criado_em',case when TG_OP='INSERT' then to_jsonb(clock_timestamp()) else old.dados->'criado_em' end,'protocolo',case when TG_OP='INSERT' then to_jsonb('OC-'||new.id) else old.dados->'protocolo' end);
 return new;
end;
$$;
revoke all on function private.ma_validar_incidente() from public,anon,authenticated;
create trigger ma_incidente_contrato before insert or update on public.ma_cadastros for each row execute function private.ma_validar_incidente();
create function private.ma_referencias_incidente() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; indice int:=0;
begin
 if new.colecao='incidentes' then
  for item in select value from jsonb_array_elements(new.dados->'organizacoes') loop
   insert into private.ma_referencias values(new.municipio_id,new.colecao,new.id,'organizacao:'||indice,item->>'colecao',item->>'id');indice:=indice+1;
  end loop;
 end if;return null;
end;
$$;
revoke all on function private.ma_referencias_incidente() from public,anon,authenticated;
-- Depois de ma_relacoes_cadastro, que reconstrói os vínculos simples.
create trigger ma_z_incidente_referencias after insert or update on public.ma_cadastros for each row execute function private.ma_referencias_incidente();
commit;
