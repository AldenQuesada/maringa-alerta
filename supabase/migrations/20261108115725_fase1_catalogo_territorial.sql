begin;
-- Cadastros continuam sendo a fonte de verdade e o único caminho de escrita.
-- Esta projeção relacional é reconstruível, privada e atualizada na mesma transação.
create schema gis;
create extension postgis with schema gis;
create schema territorio;
revoke all on schema territorio,gis from public,anon;
grant usage on schema territorio,gis to authenticated,ma_escritor;

create table territorio.categorias (
 id text primary key check(id ~ '^[a-z][a-z0-9_]{1,79}$'),
 nome text not null check(length(btrim(nome)) between 1 and 160),
 ativo boolean not null default true,
 versao bigint not null default 1,
 atualizado_em timestamptz not null default clock_timestamp()
);
create table territorio.tipos (
 id text primary key check(id ~ '^[a-z][a-z0-9_]{1,79}$'),
 categoria_id text not null references territorio.categorias(id),
 dominio text not null check(dominio in ('local','servico','recurso')),
 nome text not null check(length(btrim(nome)) between 1 and 160),
 pai_id text,
 ativo boolean not null default true,
 versao bigint not null default 1,
 atualizado_em timestamptz not null default clock_timestamp(),
 unique(id,dominio),
 foreign key(pai_id,dominio) references territorio.tipos(id,dominio),
 check(pai_id is distinct from id)
);
create index tipos_categoria on territorio.tipos(categoria_id);
create index tipos_pai on territorio.tipos(pai_id,dominio);

insert into territorio.categorias(id,nome) values
 ('saude','Saúde'),('emergencia','Emergência e segurança'),('alimentacao','Alimentação'),
 ('refrigeracao','Refrigeração'),('acolhimento','Acolhimento'),('agua_higiene','Água e higiene'),
 ('donativos','Donativos'),('construcao','Construção'),('logistica','Logística'),
 ('energia_comunicacao','Energia e comunicação'),('animais','Animais'),('comunidade','Comunidade');
-- Tipos podem ser acrescidos, renomeados ou desativados por RPC, sem mudar JavaScript.
insert into territorio.tipos(id,categoria_id,dominio,nome) values
 ('local_geral','comunidade','local','Unidade de apoio'),
 ('ubs','saude','local','UBS'),('upa','saude','local','UPA'),('hospital','saude','local','Hospital'),
 ('samu','saude','local','Base SAMU'),('farmacia','saude','local','Farmácia'),
 ('bombeiros','emergencia','local','Bombeiros'),('defesa_civil','emergencia','local','Defesa Civil'),
 ('policia','emergencia','local','Polícia'),('guarda_municipal','emergencia','local','Guarda Municipal'),
 ('base_operacoes','emergencia','local','Base de operações'),
 ('cozinha','alimentacao','servico','Cozinha comunitária'),('marmitas','alimentacao','servico','Produção de marmitas'),
 ('distribuicao_alimentos','alimentacao','servico','Distribuição de alimentos'),('refeitorio','alimentacao','servico','Refeitório'),
 ('atendimento_medico','saude','servico','Atendimento médico'),('primeiros_socorros','saude','servico','Primeiros socorros'),
 ('geladeira','refrigeracao','recurso','Geladeira'),('freezer','refrigeracao','recurso','Freezer'),
 ('camara_fria','refrigeracao','recurso','Câmara fria'),
 ('conservacao_alimentos','refrigeracao','servico','Conservação de alimentos'),
 ('conservacao_medicamentos','refrigeracao','servico','Conservação de medicamentos'),
 ('abrigo','acolhimento','local','Abrigo'),('dormitorio','acolhimento','servico','Dormitório'),
 ('alojamento','acolhimento','servico','Alojamento temporário'),('acolhimento_familias','acolhimento','servico','Acolhimento de famílias'),
 ('acolhimento_especial','acolhimento','servico','Acolhimento com cuidados especiais'),('colchao','acolhimento','recurso','Colchão'),
 ('agua_potavel','agua_higiene','servico','Água potável'),('banheiro','agua_higiene','servico','Banheiro'),
 ('chuveiro','agua_higiene','servico','Chuveiro'),('lavanderia','agua_higiene','servico','Lavanderia'),('higiene','agua_higiene','servico','Higiene pessoal'),
 ('coleta','donativos','servico','Coleta de donativos'),('deposito','donativos','local','Depósito'),
 ('armazenagem','donativos','servico','Armazenagem'),('separacao','donativos','servico','Separação de donativos'),
 ('distribuicao','donativos','servico','Distribuição de donativos'),('retirada','donativos','servico','Retirada de donativos'),
 ('lona','construcao','recurso','Lona'),('telha','construcao','recurso','Telha'),('madeira','construcao','recurso','Madeira'),
 ('ferramenta','construcao','recurso','Ferramenta'),('material_construcao','construcao','recurso','Material de construção'),
 ('base_logistica','logistica','local','Base logística'),('garagem','logistica','local','Garagem'),
 ('veiculo','logistica','recurso','Veículo'),('caminhao','logistica','recurso','Caminhão'),
 ('retirada_cargas','logistica','servico','Retirada de cargas'),('entrega','logistica','servico','Entrega'),('transbordo','logistica','servico','Transbordo'),
 ('gerador','energia_comunicacao','recurso','Gerador'),('starlink','energia_comunicacao','recurso','Starlink'),
 ('carregamento','energia_comunicacao','servico','Carregamento'),('internet','energia_comunicacao','servico','Internet'),
 ('base_comunicacao','energia_comunicacao','local','Base de comunicação'),
 ('resgate_animal','animais','servico','Resgate de animais'),('clinica_veterinaria','animais','local','Clínica veterinária'),
 ('abrigo_animal','animais','local','Abrigo de animais'),('alimentacao_animal','animais','servico','Alimentação de animais'),
 ('animais_encontrados','animais','servico','Acolhimento de animais encontrados'),
 ('escola','comunidade','local','Escola'),('igreja','comunidade','local','Igreja'),('associacao','comunidade','local','Associação'),
 ('empresa','comunidade','local','Empresa'),('sede_voluntarios','comunidade','local','Sede de voluntários'),
 ('encontro','comunidade','servico','Ponto de encontro'),('triagem','comunidade','servico','Triagem'),
 ('cras','comunidade','local','CRAS'),('recurso_geral','logistica','recurso','Recurso de apoio');

create table territorio.entidades (
 municipio_id text not null,
 colecao text not null,
 id text not null,
 dominio text not null check(dominio in ('local','servico','recurso','pessoa','operacao','area')),
 tipo_id text,
 unidade_colecao text,
 unidade_id text,
 unidade_dominio text generated always as ('local'::text) stored,
 responsavel_colecao text,
 responsavel_id text,
 responsavel_dominio text generated always as ('pessoa'::text) stored,
 ativo boolean not null,
 ponto gis.geography(Point,4326),
 area gis.geometry(MultiPolygon,4326),
 geo_fonte text,
 geo_precisao_m double precision check(geo_precisao_m between 0 and 10000000),
 geo_confirmada boolean not null default false,
 geo_confirmada_em timestamptz,
 capacidade numeric check(capacidade between 0 and 1000000000000),
 quantidade numeric check(quantidade between 0 and 1000000000000),
 unidade_medida text,
 periodo text,
 versao bigint not null,
 primary key(municipio_id,colecao,id),
 unique(municipio_id,colecao,id,dominio),
 foreign key(municipio_id,colecao,id) references public.ma_cadastros(municipio_id,colecao,id) on delete cascade,
 foreign key(tipo_id,dominio) references territorio.tipos(id,dominio),
 foreign key(municipio_id,unidade_colecao,unidade_id,unidade_dominio)
   references territorio.entidades(municipio_id,colecao,id,dominio) deferrable initially deferred,
 foreign key(municipio_id,responsavel_colecao,responsavel_id,responsavel_dominio)
   references territorio.entidades(municipio_id,colecao,id,dominio) deferrable initially deferred,
 check((unidade_colecao is null)=(unidade_id is null)),
 check((responsavel_colecao is null)=(responsavel_id is null)),
 check(dominio<>'servico' or unidade_id is not null),
 check(dominio in ('servico','recurso','operacao') or unidade_id is null),
 check(dominio in ('local','servico','recurso') or tipo_id is null),
 check(not geo_confirmada or (ponto is not null and geo_fonte is not null and geo_confirmada_em is not null))
);
create index entidades_tipo on territorio.entidades(tipo_id,dominio);
create index entidades_unidade on territorio.entidades(municipio_id,unidade_colecao,unidade_id,unidade_dominio);
create index entidades_responsavel on territorio.entidades(municipio_id,responsavel_colecao,responsavel_id,responsavel_dominio);
create index entidades_filtro on territorio.entidades(municipio_id,dominio,ativo,tipo_id);
create index entidades_ponto on territorio.entidades using gist(ponto);
create index entidades_area on territorio.entidades using gist(area);

create table territorio.vinculos_operacionais (
 municipio_id text not null,
 operacao_colecao text not null,
 operacao_id text not null,
 operacao_dominio text generated always as ('operacao'::text) stored,
 destino_colecao text not null,
 destino_id text not null,
 destino_dominio text not null check(destino_dominio in ('local','servico','recurso')),
 primary key(municipio_id,operacao_colecao,operacao_id,destino_colecao,destino_id),
 foreign key(municipio_id,operacao_colecao,operacao_id,operacao_dominio)
   references territorio.entidades(municipio_id,colecao,id,dominio) on delete cascade,
 foreign key(municipio_id,destino_colecao,destino_id,destino_dominio)
   references territorio.entidades(municipio_id,colecao,id,dominio) deferrable initially deferred
);
create index vinculos_territoriais_destino on territorio.vinculos_operacionais(municipio_id,destino_colecao,destino_id,destino_dominio);

alter table territorio.categorias enable row level security;
alter table territorio.tipos enable row level security;
alter table territorio.entidades enable row level security;
alter table territorio.vinculos_operacionais enable row level security;
revoke all on all tables in schema territorio from public,anon,authenticated,ma_escritor;
grant select on all tables in schema territorio to authenticated;
grant select,insert,update on territorio.categorias,territorio.tipos to ma_escritor;
create policy categorias_leitura on territorio.categorias for select to authenticated,ma_escritor using(private.ma_identidade() is not null);
create policy tipos_leitura on territorio.tipos for select to authenticated,ma_escritor using(private.ma_identidade() is not null);
create policy categorias_novas on territorio.categorias for insert to ma_escritor with check(private.ma_admin());
create policy categorias_edicao on territorio.categorias for update to ma_escritor using(private.ma_admin()) with check(private.ma_admin());
create policy tipos_novos on territorio.tipos for insert to ma_escritor with check(private.ma_admin());
create policy tipos_edicao on territorio.tipos for update to ma_escritor using(private.ma_admin()) with check(private.ma_admin());
create policy entidades_leitura on territorio.entidades for select to authenticated using(private.ma_permitido(municipio_id,colecao,'ler'));
create policy vinculos_leitura on territorio.vinculos_operacionais for select to authenticated using(
 private.ma_permitido(municipio_id,operacao_colecao,'ler') and private.ma_permitido(municipio_id,destino_colecao,'ler'));

alter table public.ma_cadastros drop constraint ma_cadastros_colecao_check;
alter table public.ma_cadastros add constraint ma_cadastros_colecao_check check(colecao in ('importacoes','bairros','usuarios','zonas','bases','riscos','equipes','integrantes','voluntarios','instituicoes','veiculos','equipamentos','estoques','abrigos','pontos','ocorrenciaTipos','canais','eventos','regras','solicitacoes','relatos','mobilizacoes','apoios','incidentes','unidades','servicos','recursos'));

-- Novas coleções usam exatamente o gravador, versões, auditoria e permissões existentes.
update public.ma_configuracao set documento=documento || '{
 "unidades":{"required":["nome","tipo_id"],"enums":{"estado_operacional":["a_confirmar","disponivel","limitado","indisponivel"]}},
 "servicos":{"required":["nome","tipo_id","unidade_colecao","unidade_id"],"enums":{"estado_operacional":["a_confirmar","disponivel","limitado","indisponivel"]}},
 "recursos":{"required":["nome","tipo_id"],"enums":{"estado_operacional":["a_confirmar","disponivel","limitado","indisponivel"]}}
}'::jsonb,versao=versao+1 where id='contratos';
insert into private.ma_permissoes(papel,colecao,ler,gravar,excluir)
 select p,c,true,p in ('admin','operador'),p='admin'
 from unnest(array['admin','operador','leitor']) p cross join unnest(array['unidades','servicos','recursos']) c;

create function private.ma_territorio_dominio(colecao text) returns text
language sql immutable security invoker set search_path='' as $$
 select case
 when colecao in ('unidades','bases','instituicoes','abrigos','pontos') then 'local'
 when colecao='servicos' then 'servico'
 when colecao in ('recursos','equipamentos','veiculos','estoques') then 'recurso'
 when colecao in ('usuarios','voluntarios','integrantes') then 'pessoa'
 when colecao in ('eventos','incidentes','solicitacoes','relatos','mobilizacoes','apoios') then 'operacao'
 when colecao in ('bairros','zonas','riscos') then 'area' end;
$$;
revoke all on function private.ma_territorio_dominio(text) from public,anon,authenticated,ma_escritor;

create function private.ma_projetar_territorio(c public.ma_cadastros) returns void
language plpgsql security invoker set search_path='' as $$
declare
 d text:=private.ma_territorio_dominio(c.colecao); j jsonb:=c.dados; tipo text;
 ponto gis.geography(Point,4326); area gis.geometry; geometria jsonb;
 fonte text:=nullif(btrim(j->>'geo_fonte'),''); confirmado boolean:=false; confirmado_em timestamptz;
 anterior territorio.entidades; vinculo jsonb;
begin
 if d is null then return; end if;
 select * into anterior from territorio.entidades where municipio_id=c.municipio_id and colecao=c.colecao and id=c.id;
 tipo:=case when d in ('local','servico','recurso') then nullif(j->>'tipo_id','') end;
 if tipo is null and d in ('local','recurso') then
  -- Classificação conservadora: nunca inventa serviços, quantidades ou confirmação.
  tipo:=case when d='recurso' then case when c.colecao='veiculos' then 'veiculo' else 'recurso_geral' end
    when c.colecao='abrigos' then 'abrigo'
    else case j->>'tipo' when 'UBS' then 'ubs' when 'UPA' then 'upa' when 'Hospital' then 'hospital'
      when 'Santa Casa' then 'hospital' when 'SAMU' then 'samu' when 'Farmácia' then 'farmacia'
      when 'Bombeiros' then 'bombeiros' when 'Defesa Civil' then 'defesa_civil'
      when 'Polícia Militar' then 'policia' when 'Polícia Civil' then 'policia'
      when 'Guarda Municipal' then 'guarda_municipal' when 'Base logística' then 'base_logistica'
      when 'Unidade de assistência social (CRAS)' then 'cras' when 'Empresa' then 'empresa' else 'local_geral' end end;
 end if;
 if tipo is not null and (anterior.tipo_id is distinct from tipo or anterior.id is null) and not exists(
  select 1 from territorio.tipos t join territorio.categorias cat on cat.id=t.categoria_id
  where t.id=tipo and t.dominio=d and t.ativo and cat.ativo
 ) then raise exception 'Tipo territorial ausente, inativo ou incompatível' using errcode='23514';end if;
 if nullif(j->>'lat','') is not null then
  if not ((j->>'lat')::double precision between -90 and 90 and (j->>'lng')::double precision between -180 and 180)
   then raise exception 'Coordenadas inválidas' using errcode='23514';end if;
  ponto:=gis.st_setsrid(gis.st_makepoint((j->>'lng')::double precision,(j->>'lat')::double precision),4326)::gis.geography;
 end if;
 if j ? 'geo_confirmada' and jsonb_typeof(j->'geo_confirmada')<>'boolean' then
  raise exception 'Confirmação de coordenadas deve ser booleana' using errcode='23514';end if;
 confirmado:=coalesce((j->>'geo_confirmada')::boolean,false);
 if confirmado then
  confirmado_em:=case when anterior.geo_confirmada and anterior.ponto is not distinct from ponto
    and anterior.geo_fonte is not distinct from fonte then anterior.geo_confirmada_em else clock_timestamp() end;
 end if;
 if j ? 'ativo' and jsonb_typeof(j->'ativo')<>'boolean' then raise exception 'Ativo deve ser booleano' using errcode='23514';end if;
 if nullif(j->>'geojson','') is not null then
  geometria:=case when jsonb_typeof(j->'geojson')='string' then (j->>'geojson')::jsonb else j->'geojson' end;
  if geometria->>'type'='Feature' then geometria:=geometria->'geometry';end if;
  if geometria->>'type' not in ('Polygon','MultiPolygon') then raise exception 'Área deve ser Polygon ou MultiPolygon' using errcode='23514';end if;
  area:=gis.st_multi(gis.st_geomfromgeojson(geometria));
  if gis.st_srid(area)<>4326 or gis.st_isempty(area) or not gis.st_isvalid(area)
    or not (gis.st_xmin(area::gis.box3d)>=-180 and gis.st_xmax(area::gis.box3d)<=180
        and gis.st_ymin(area::gis.box3d)>=-90 and gis.st_ymax(area::gis.box3d)<=90)
   then raise exception 'Área geográfica inválida' using errcode='23514';end if;
 end if;
 if d<>'operacao' and j ? 'vinculos_territoriais' then raise exception 'Vínculos territoriais pertencem a operações' using errcode='23514';end if;
 if nullif(j->>'capacidade_valor','') is not null and nullif(btrim(j->>'unidade_medida'),'') is null then
  raise exception 'Capacidade exige unidade de medida' using errcode='23514';end if;
 if nullif(j->>'quantidade_disponivel','') is not null and d<>'recurso' then
  raise exception 'Quantidade disponível pertence a recurso' using errcode='23514';end if;
 insert into territorio.entidades(municipio_id,colecao,id,dominio,tipo_id,unidade_colecao,unidade_id,
  responsavel_colecao,responsavel_id,ativo,ponto,area,geo_fonte,geo_precisao_m,geo_confirmada,geo_confirmada_em,
  capacidade,quantidade,unidade_medida,periodo,versao)
 values(c.municipio_id,c.colecao,c.id,d,tipo,nullif(j->>'unidade_colecao',''),nullif(j->>'unidade_id',''),
  nullif(j->>'responsavel_colecao',''),case when nullif(j->>'responsavel_colecao','') is not null then nullif(j->>'responsavel_id','') end,
  c.arquivado_em is null and coalesce((j->>'ativo')::boolean,true) and lower(coalesce(j->>'status',''))<>'inativo',
  ponto,area,fonte,nullif(j->>'geo_precisao_m','')::double precision,confirmado,confirmado_em,
  nullif(j->>'capacidade_valor','')::numeric,nullif(j->>'quantidade_disponivel','')::numeric,
  nullif(btrim(j->>'unidade_medida'),''),nullif(btrim(j->>'periodo'),''),c.versao)
 on conflict(municipio_id,colecao,id) do update set
  dominio=excluded.dominio,tipo_id=excluded.tipo_id,unidade_colecao=excluded.unidade_colecao,unidade_id=excluded.unidade_id,
  responsavel_colecao=excluded.responsavel_colecao,responsavel_id=excluded.responsavel_id,ativo=excluded.ativo,
  ponto=excluded.ponto,area=excluded.area,geo_fonte=excluded.geo_fonte,geo_precisao_m=excluded.geo_precisao_m,
  geo_confirmada=excluded.geo_confirmada,geo_confirmada_em=excluded.geo_confirmada_em,capacidade=excluded.capacidade,
  quantidade=excluded.quantidade,unidade_medida=excluded.unidade_medida,periodo=excluded.periodo,versao=excluded.versao;
 delete from territorio.vinculos_operacionais where municipio_id=c.municipio_id and operacao_colecao=c.colecao and operacao_id=c.id;
 if j ? 'vinculos_territoriais' then
  if jsonb_typeof(j->'vinculos_territoriais')<>'array' or jsonb_array_length(j->'vinculos_territoriais')>100 then
   raise exception 'Vínculos territoriais inválidos' using errcode='23514';end if;
  for vinculo in select value from jsonb_array_elements(j->'vinculos_territoriais') loop
   insert into territorio.vinculos_operacionais(municipio_id,operacao_colecao,operacao_id,destino_colecao,destino_id,destino_dominio)
   values(c.municipio_id,c.colecao,c.id,vinculo->>'colecao',vinculo->>'id',private.ma_territorio_dominio(vinculo->>'colecao'));
  end loop;
 end if;
end;
$$;
revoke all on function private.ma_projetar_territorio(public.ma_cadastros) from public,anon,authenticated,ma_escritor;
create function private.ma_sincronizar_territorio() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform private.ma_projetar_territorio(new); return null;end;
$$;
revoke all on function private.ma_sincronizar_territorio() from public,anon,authenticated,ma_escritor;
create trigger ma_territorio_cadastro after insert or update on public.ma_cadastros
 for each row execute function private.ma_sincronizar_territorio();
-- Nenhum UPDATE de cadastros: IDs, versões, JSON, autoria e histórico ficam intactos.
do $$declare c public.ma_cadastros;begin
 for c in select * from public.ma_cadastros order by municipio_id,colecao,id loop perform private.ma_projetar_territorio(c);end loop;
end$$;

create function private.ma_salvar_catalogo_territorial(entidade text,item jsonb,versao_esperada bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare atual bigint; retorno jsonb;
begin
 perform private.ma_exigir_admin();
 if entidade is null or entidade not in ('categoria','tipo') or jsonb_typeof(item)<>'object' or item is null then
  raise exception 'Item de catálogo inválido' using errcode='22023';end if;
 -- Serializa alterações da hierarquia para impedir ciclos entre transações.
 perform pg_advisory_xact_lock(hashtext('ma_catalogo_territorial'));
 if entidade='categoria' then
  select versao into atual from territorio.categorias where id=item->>'id' for update;
 else select versao into atual from territorio.tipos where id=item->>'id' for update;end if;
 if (atual is null and versao_esperada is distinct from 0) or (atual is not null and atual is distinct from versao_esperada) then
  raise exception 'Catálogo alterado por outra sessão' using errcode='40001';end if;
 if entidade='categoria' then
  insert into territorio.categorias(id,nome,ativo) values(item->>'id',item->>'nome',coalesce((item->>'ativo')::boolean,true))
  on conflict(id) do update set nome=excluded.nome,ativo=excluded.ativo,versao=territorio.categorias.versao+1,atualizado_em=clock_timestamp()
  returning to_jsonb(categorias.*) into retorno;
 else
  if exists(select 1 from territorio.tipos where id=item->>'id' and dominio<>item->>'dominio') then
   raise exception 'O domínio de um tipo é imutável' using errcode='23514';end if;
  insert into territorio.tipos(id,categoria_id,dominio,nome,pai_id,ativo)
  values(item->>'id',item->>'categoria_id',item->>'dominio',item->>'nome',nullif(item->>'pai_id',''),coalesce((item->>'ativo')::boolean,true))
  on conflict(id) do update set categoria_id=excluded.categoria_id,nome=excluded.nome,pai_id=excluded.pai_id,
   ativo=excluded.ativo,versao=territorio.tipos.versao+1,atualizado_em=clock_timestamp()
  returning to_jsonb(tipos.*) into retorno;
  if exists(with recursive ascendentes(id) as (
   select pai_id from territorio.tipos where id=item->>'id'
   union select t.pai_id from territorio.tipos t join ascendentes a on a.id=t.id
  ) select 1 from ascendentes where id=item->>'id') then raise exception 'Subtipos não podem formar ciclos' using errcode='23514';end if;
 end if;
 return retorno;
end;
$$;
grant ma_escritor to current_user;
grant create on schema private to ma_escritor;
alter function private.ma_salvar_catalogo_territorial(text,jsonb,bigint) owner to ma_escritor;
revoke create on schema private from ma_escritor;
revoke ma_escritor from current_user;
revoke all on function private.ma_salvar_catalogo_territorial(text,jsonb,bigint) from public,anon;
grant execute on function private.ma_salvar_catalogo_territorial(text,jsonb,bigint) to authenticated;
create function public.ma_salvar_catalogo_territorial(entidade text,item jsonb,versao_esperada bigint) returns jsonb
language sql security invoker set search_path='' as $$select private.ma_salvar_catalogo_territorial(entidade,item,versao_esperada);$$;
create trigger ma_historico_categorias after insert or update or delete on territorio.categorias
 for each row execute function private.ma_registrar_historico();
create trigger ma_historico_tipos after insert or update or delete on territorio.tipos
 for each row execute function private.ma_registrar_historico();

create function public.ma_catalogo_territorial() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('categorias',coalesce((select jsonb_agg(to_jsonb(c) order by c.nome,c.id) from territorio.categorias c),'[]'),
  'tipos',coalesce((select jsonb_agg(to_jsonb(t) order by t.categoria_id,t.nome,t.id) from territorio.tipos t),'[]'));
$$;
-- Detalhes canônicos e projeção lado a lado, sem copiar telefones ou pessoas para outro cadastro.
create function public.ma_territorio_listar(municipio text,dominio_alvo text default null,tipo_alvo text default null,
 limite integer default 100,deslocamento integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if municipio is null or limite is null or limite not between 1 and 500 or deslocamento is null or deslocamento not between 0 and 100000 then
  raise exception 'Paginação inválida' using errcode='22023';end if;
 return coalesce((select jsonb_agg(item order by colecao,id) from (
  select e.colecao,e.id,jsonb_build_object('cadastro',to_jsonb(c),'territorio',to_jsonb(e)-'ponto'-'area'-'unidade_dominio'-'responsavel_dominio') item
  from territorio.entidades e join public.ma_cadastros c using(municipio_id,colecao,id)
  where e.municipio_id=municipio and (dominio_alvo is null or e.dominio=dominio_alvo) and (tipo_alvo is null or e.tipo_id=tipo_alvo)
  order by e.colecao,e.id limit limite offset deslocamento
 ) s),'[]');
end;
$$;
-- O predicado PostGIS não é LEAKPROOF. Sob RLS ele vira filtro posterior e perde
-- o índice. Este leitor privado verifica a mesma permissão municipal explicitamente,
-- retorna apenas pontos autorizados de locais/serviços/recursos e não permite escrita.
create function private.ma_pontos_no_raio(municipio text,latitude double precision,longitude double precision,raio_m double precision)
returns table(municipio_id text,colecao text,id text,ponto gis.geography,geo_fonte text,geo_precisao_m double precision,geo_confirmada boolean)
language plpgsql stable security definer set search_path='' as $$
declare origem gis.geography;
begin
 if private.ma_identidade() is null then raise exception 'Autenticação obrigatória' using errcode='42501';end if;
 if municipio is null or latitude is null or longitude is null or raio_m is null
   or not(latitude between -90 and 90 and longitude between -180 and 180 and raio_m between 0 and 100000) then
  raise exception 'Consulta por raio inválida' using errcode='22023';end if;
 origem:=gis.st_setsrid(gis.st_makepoint(longitude,latitude),4326)::gis.geography;
 return query select e.municipio_id,e.colecao,e.id,e.ponto,e.geo_fonte,e.geo_precisao_m,e.geo_confirmada
  from territorio.entidades e where e.municipio_id=municipio and e.ativo and e.dominio in ('local','servico','recurso')
  and e.ponto is not null and gis.st_dwithin(e.ponto,origem,raio_m) and private.ma_permitido(e.municipio_id,e.colecao,'ler');
end;
$$;
revoke all on function private.ma_pontos_no_raio(text,double precision,double precision,double precision) from public,anon,ma_escritor;
grant execute on function private.ma_pontos_no_raio(text,double precision,double precision,double precision) to authenticated;

create function public.ma_territorio_proximos(municipio text,latitude double precision,longitude double precision,
 raio_m double precision,dominio_alvo text default null,tipo_alvo text default null,limite integer default 100) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare origem gis.geography;
begin
 if municipio is null or latitude is null or longitude is null or raio_m is null or limite is null
   or not(latitude between -90 and 90 and longitude between -180 and 180 and raio_m between 0 and 100000 and limite between 1 and 500)
   or (dominio_alvo is not null and dominio_alvo not in ('local','servico','recurso')) then
  raise exception 'Consulta por raio inválida' using errcode='22023';end if;
 origem:=gis.st_setsrid(gis.st_makepoint(longitude,latitude),4326)::gis.geography;
 return (with pontos as materialized (
  select * from private.ma_pontos_no_raio(municipio,latitude,longitude,raio_m)
 ), candidatos as (
  select e.*,p.ponto ponto_consulta,p.geo_fonte fonte_consulta,p.geo_precisao_m precisao_consulta,p.geo_confirmada confirmada_consulta
  from pontos p join territorio.entidades e using(municipio_id,colecao,id)
  union all
  select e.*,p.ponto,p.geo_fonte,p.geo_precisao_m,p.geo_confirmada
  from pontos p join territorio.entidades e on e.municipio_id=p.municipio_id and e.unidade_colecao=p.colecao and e.unidade_id=p.id
  where e.ponto is null
 ) select coalesce(jsonb_agg(item order by distancia,colecao,id),'[]') from (
  select e.colecao,e.id,gis.st_distance(e.ponto_consulta,origem) distancia,
   jsonb_build_object('colecao',e.colecao,'id',e.id,'dominio',e.dominio,'tipo_id',e.tipo_id,
    'unidade_colecao',e.unidade_colecao,'unidade_id',e.unidade_id,'dados',c.dados,'versao',c.versao,
    'distancia_m',gis.st_distance(e.ponto_consulta,origem),'distancia_tipo','geodesica',
    'ponto_herdado',e.ponto is null,'geo_fonte',e.fonte_consulta,
    'geo_precisao_m',e.precisao_consulta,
    'geo_confirmada',e.confirmada_consulta) item
  from candidatos e join public.ma_cadastros c using(municipio_id,colecao,id)
  left join territorio.entidades u on u.municipio_id=e.municipio_id and u.colecao=e.unidade_colecao and u.id=e.unidade_id
  join territorio.tipos t on t.id=e.tipo_id join territorio.categorias cat on cat.id=t.categoria_id
  where e.municipio_id=municipio and e.dominio in ('local','servico','recurso') and e.ativo and t.ativo and cat.ativo
   and (e.unidade_id is null or u.ativo) and (dominio_alvo is null or e.dominio=dominio_alvo) and (tipo_alvo is null or e.tipo_id=tipo_alvo)
  order by distancia,e.colecao,e.id limit limite
 ) s);
end;
$$;
create function private.ma_territorio_areas(municipio text,latitude double precision,longitude double precision) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare ponto_consulta gis.geometry;
begin
 if private.ma_identidade() is null then raise exception 'Autenticação obrigatória' using errcode='42501';end if;
 if municipio is null or latitude is null or longitude is null or not(latitude between -90 and 90 and longitude between -180 and 180) then
  raise exception 'Coordenadas inválidas' using errcode='22023';end if;
 ponto_consulta:=gis.st_setsrid(gis.st_makepoint(longitude,latitude),4326);
 return coalesce((select jsonb_agg(jsonb_build_object('colecao',e.colecao,'id',e.id,'nome',c.dados->>'nome') order by e.colecao,e.id)
  from territorio.entidades e join public.ma_cadastros c using(municipio_id,colecao,id)
  where e.municipio_id=municipio and e.ativo and gis.st_covers(e.area,ponto_consulta) and private.ma_permitido(e.municipio_id,e.colecao,'ler')),'[]');
end;
$$;
revoke all on function private.ma_territorio_areas(text,double precision,double precision) from public,anon,ma_escritor;
grant execute on function private.ma_territorio_areas(text,double precision,double precision) to authenticated;
create function public.ma_territorio_areas(municipio text,latitude double precision,longitude double precision) returns jsonb
language sql stable security invoker set search_path='' as $$select private.ma_territorio_areas(municipio,latitude,longitude);$$;
revoke all on function public.ma_salvar_catalogo_territorial(text,jsonb,bigint),public.ma_catalogo_territorial(),
 public.ma_territorio_listar(text,text,text,integer,integer),public.ma_territorio_proximos(text,double precision,double precision,double precision,text,text,integer),
 public.ma_territorio_areas(text,double precision,double precision) from public,anon;
grant execute on function public.ma_salvar_catalogo_territorial(text,jsonb,bigint),public.ma_catalogo_territorial(),
 public.ma_territorio_listar(text,text,text,integer,integer),public.ma_territorio_proximos(text,double precision,double precision,double precision,text,text,integer),
 public.ma_territorio_areas(text,double precision,double precision) to authenticated;
notify pgrst,'reload schema';
commit;
