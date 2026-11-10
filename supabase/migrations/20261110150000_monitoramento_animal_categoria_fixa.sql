begin;
-- Correção da revisão pré-fase 5: em UPDATE, um relato que já era de animal podia ter a categoria apagada ou trocada.
-- Isso o tirava da trava e permitia mudar a situação sem a capacidade de triagem e tornar pública uma denúncia restrita.
-- A função abaixo é igual à da etapa D, exceto pela condição de entrada dos relatos.
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
  -- A categoria de um relato de animal é imutável: apagá-la ou trocá-la não tira o registro da trava.
  if coalesce(antes->>'categoria','')<>'animal' and coalesce(new.dados->>'categoria','')<>'animal' then return new;end if;
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
