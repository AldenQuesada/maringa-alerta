begin;
insert into public.ma_configuracao(id,documento) values('operacao', '{"compatibilidade":{"Alimentação":["FORNECER ALIMENTAÇÃO"],"Telhas e cobertura":["PEDREIRO","CARPINTEIRO","MATERIAL DE CONSTRUÇÃO","CAMIONETE","CAMINHÃO BASCULANTE"],"Apoio financeiro":[],"Abrigo e moradia":[],"Roupas e cobertores":[],"Medicamentos e saúde":[],"Limpeza e remoção":["LIMPEZA","PÁ CARREGADEIRA","RETROESCAVADEIRA","BOBCAT","MOTOSSERRA COM OPERADOR"],"Material de construção":["MATERIAL DE CONSTRUÇÃO","PEDREIRO","CARPINTEIRO"],"Eletricidade e gerador":["ELETRICISTA","GERADOR"],"Água potável":[],"Transporte":["CAMIONETE","CAMINHÃO BASCULANTE","CAMINHÃO GARRA"],"Cuidados especiais":["CUIDADOR","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS"],"Laudos de prejuízos":["LAUDO","EMITIR LAUDOS DE PREJUÍZOS"],"Apoio a empreendedores":["ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO"],"Outro":[]},"gpsPrecisaoMaxima":100,"pesosCompatibilidade":{"mesmaZona":100,"outraZona":10,"disponivel":5},"transicoes":{"solicitacoes":{"inicial":["Aguardando","Encaminhada"],"estados":{"Aguardando":["Encaminhada","Cancelada"],"Encaminhada":["Cheguei","Cancelada"],"Cheguei":["Atendida","Cancelada"],"Atendida":[],"Cancelada":[]}},"eventos":{"inicial":["A confirmar","Em andamento"],"estados":{"A confirmar":["Em andamento","Encerrado"],"Em andamento":["Encerrado"],"Encerrado":[]}},"relatos":{"inicial":["Em triagem"],"estados":{"Em triagem":["Vinculado","Confirmado","Arquivado"],"Vinculado":["Confirmado","Arquivado"],"Confirmado":["Arquivado"],"Arquivado":[]}},"mobilizacoes":{"inicial":["Preparada"],"estados":{"Preparada":["Cancelada"],"Cancelada":[]}},"apoios":{"inicial":["Preparada"],"estados":{"Preparada":["Cancelada"],"Cancelada":[]}}},"numeros":{"equipamentos":{"quantidade":{"min":0,"inteiro":true}},"estoques":{"quantidade":{"min":0}},"abrigos":{"capacidade":{"min":0,"inteiro":true},"disponiveis":{"min":0,"inteiro":true}},"bases":{"capacidade":{"min":0,"inteiro":true}},"equipes":{"integrantes":{"min":0,"inteiro":true}},"importacoes":{"quantidade":{"min":0,"inteiro":true}}}}'::jsonb);
-- Campos de relação são seletores de registros existentes, configurados no banco.
update public.ma_configuracao set documento=jsonb_set(documento,'{esquemas,solicitacoes,fields}',(
 select jsonb_agg(case when f->>'key'='atribuido_a' then f||'{"type":"colaborador","label":"Colaborador acionado"}'::jsonb else f end order by ord)
 from jsonb_array_elements(documento#>'{esquemas,solicitacoes,fields}') with ordinality as x(f,ord)
)) where id='interface';
update public.ma_configuracao set documento=jsonb_set(documento,'{esquemas,apoios,fields}',(
 select jsonb_agg(case when f->>'key'='destino_id' then f||'{"type":"municipio","label":"Prefeitura destinatária","required":true}'::jsonb when f->>'key'='destino' then f||'{"type":"hidden","required":false}'::jsonb else f end order by ord)
 from jsonb_array_elements(documento#>'{esquemas,apoios,fields}') with ordinality as x(f,ord)
)) where id='interface';
update public.ma_configuracao set documento=jsonb_set(documento,'{apoios,required}','["nome"]') where id='contratos';
-- Capacidades calculadas das mesmas políticas que autorizam a escrita, nunca do JWT editável.
create function private.ma_capacidades() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(m.id, (
   select jsonb_object_agg(c.key,jsonb_build_object(
    'ler',case when c.key='prefeituras' then true else private.ma_permitido(m.id,c.key,'ler') end,
    'gravar',case when c.key='prefeituras' then private.ma_admin() else private.ma_permitido(m.id,c.key,'gravar') end,
    'excluir',case when c.key='prefeituras' then false else private.ma_permitido(m.id,c.key,'excluir') end))
   from jsonb_each((select documento from public.ma_configuracao where id='contratos')) c
 )), '{}'::jsonb)
 from public.ma_prefeituras m where auth.uid() is not null and (private.ma_admin() or private.ma_acesso(m.id));
$$;
revoke all on function private.ma_capacidades() from public,anon;
grant execute on function private.ma_capacidades() to authenticated;
create function public.ma_minhas_capacidades() returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_capacidades()$$;
revoke all on function public.ma_minhas_capacidades() from public,anon;
grant execute on function public.ma_minhas_capacidades() to authenticated;

-- Limites e formato do lote também são verificados no caminho privado.
-- Serializar por município ANTES de qualquer escrita protege regras entre registros.
alter function private.ma_aplicar_alteracoes(jsonb) rename to ma_gravar_lote;
create function private.ma_aplicar_alteracoes(alteracoes jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; municipio text; resultado jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória' using errcode='42501';end if;
 if alteracoes is null or jsonb_typeof(alteracoes)<>'array' then raise exception 'Lote deve ser uma lista' using errcode='23514';end if;
 if jsonb_array_length(alteracoes)>5000 or octet_length(alteracoes::text)>20000000 then raise exception 'Lote excede limite' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(alteracoes) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'operacao','') not in ('inserir','atualizar','excluir') or coalesce(item->>'id','')='' or coalesce(item->>'colecao','')='' then raise exception 'Operação inválida' using errcode='23514';end if;
  if item->>'operacao'<>'inserir' and coalesce(item->>'versao','') !~ '^[1-9][0-9]*$' then raise exception 'Versão obrigatória' using errcode='23514';end if;
  if item->>'colecao'='prefeituras' then
   if not private.ma_admin() then raise exception 'Administração geral obrigatória' using errcode='42501';end if;
  elsif not private.ma_permitido(item->>'municipio_id',item->>'colecao',case when item->>'operacao'='excluir' then 'excluir' else 'gravar' end) then raise exception 'Operação não autorizada' using errcode='42501';end if;
 end loop;
 for municipio in select distinct case when value->>'colecao'='prefeituras' then value->>'id' else value->>'municipio_id' end from jsonb_array_elements(alteracoes) order by 1 loop
  perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(municipio));
 end loop;
 perform private.ma_gravar_lote(alteracoes);
 select coalesce(jsonb_agg(jsonb_build_object('colecao',a->>'colecao','id',a->>'id','municipio_id',a->>'municipio_id','operacao',a->>'operacao','dados',case when a->>'colecao'='prefeituras' then m.dados else c.dados end,'versao',case when a->>'colecao'='prefeituras' then m.versao else c.versao end)),'[]') into resultado
 from jsonb_array_elements(alteracoes) a
 left join public.ma_cadastros c on c.municipio_id=a->>'municipio_id' and c.colecao=a->>'colecao' and c.id=a->>'id'
 left join public.ma_prefeituras m on a->>'colecao'='prefeituras' and m.id=a->>'id';
 return resultado;
end;
$$;
-- O executor anterior deixa de ser chamável diretamente pela aplicação.
revoke all on function private.ma_gravar_lote(jsonb) from public,anon,authenticated;
-- A nova porta privada usa o papel sem bypass de RLS.
grant create on schema private to ma_escritor;
alter function private.ma_aplicar_alteracoes(jsonb) owner to ma_escritor;
revoke create on schema private from ma_escritor;
alter function private.ma_aplicar_alteracoes(jsonb) security definer;
revoke all on function private.ma_aplicar_alteracoes(jsonb) from public,anon;
grant execute on function private.ma_aplicar_alteracoes(jsonb) to authenticated;
-- Recriar o corpo é necessário: dependências SQL podem preservar o OID renomeado.
drop function public.ma_aplicar_alteracoes(jsonb);
create function public.ma_aplicar_alteracoes(alteracoes jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.ma_aplicar_alteracoes(alteracoes)$$;
revoke all on function public.ma_aplicar_alteracoes(jsonb) from public,anon;
grant execute on function public.ma_aplicar_alteracoes(jsonb) to authenticated;

-- Polígono oficial armazenado no banco; nunca aceitar geometria enviada no check-in.
create function private.ma_dentro_poligono(geo jsonb, x numeric, y numeric) returns boolean language plpgsql immutable set search_path='' as $$
declare poligono jsonb; anel jsonb; pontos text; dentro boolean; externo boolean;
begin
 if geo->>'type' not in ('Polygon','MultiPolygon') or geo is null then return false;end if;
 for poligono in select value from jsonb_array_elements(case when geo->>'type'='Polygon' then jsonb_build_array(geo->'coordinates') else geo->'coordinates' end) loop
  externo:=true;dentro:=false;
  for anel in select value from jsonb_array_elements(poligono) loop
   if jsonb_array_length(anel)<4 or anel->0 is distinct from anel->(jsonb_array_length(anel)-1) then return false;end if;
   select '('||string_agg('('||(p->>0)||','||(p->>1)||')',',')||')' into pontos from jsonb_array_elements(anel) p;
   if externo then dentro:=point(x::float8,y::float8) <@ pontos::polygon;externo:=false;
   elsif point(x::float8,y::float8) <@ pontos::polygon then dentro:=false;end if;
  end loop;
  if dentro then return true;end if;
 end loop;
 return false;
exception when others then return false;
end;
$$;
revoke all on function private.ma_dentro_poligono(jsonb,numeric,numeric) from public,anon,authenticated;

create function private.ma_validar_operacao() returns trigger language plpgsql security definer set search_path='' as $$
declare regras jsonb; regra jsonb; campo text; limite jsonb; valor numeric; anterior jsonb:='{}'; estado text; previo text; pessoa jsonb; geo jsonb; bairro text; lista jsonb;
begin
 select documento into regras from public.ma_configuracao where id='operacao';
 if regras is null then raise exception 'Regras operacionais indisponíveis' using errcode='23514';end if;
 if TG_OP='UPDATE' then anterior:=old.dados;end if;
 for campo,limite in select key,value from jsonb_each(coalesce(regras->'numeros'->new.colecao,'{}')) loop
  if nullif(new.dados->>campo,'') is not null then
   begin valor:=(new.dados->>campo)::numeric;exception when others then raise exception 'Número inválido: %',campo using errcode='23514';end;
   if valor::text in ('NaN','Infinity','-Infinity') or valor<(limite->>'min')::numeric or (coalesce((limite->>'inteiro')::boolean,false) and valor<>trunc(valor)) then raise exception 'Quantidade inválida: %',campo using errcode='23514';end if;
  end if;
 end loop;
 if new.colecao='abrigos' and nullif(new.dados->>'disponiveis','') is not null then
  if nullif(new.dados->>'capacidade','') is null or (new.dados->>'disponiveis')::numeric>(new.dados->>'capacidade')::numeric then raise exception 'Vagas livres excedem capacidade' using errcode='23514';end if;
 end if;
 regra:=regras->'transicoes'->new.colecao;
 estado:=coalesce(nullif(new.dados->>'status',''),regra->'inicial'->>0);
 previo:=coalesce(nullif(anterior->>'status',''),regra->'inicial'->>0);
 if regra is not null then
  if (TG_OP='INSERT' and not regra->'inicial' ? estado) or (TG_OP='UPDATE' and estado<>previo and not coalesce(regra->'estados'->previo,'[]') ? estado) then raise exception 'Transição de estado não permitida' using errcode='23514';end if;
 end if;
 if new.colecao in ('voluntarios','solicitacoes') and length(regexp_replace(coalesce(new.dados->>'telefone',''),'[^0-9]','','g')) not between 10 and 13 then raise exception 'Telefone inválido' using errcode='23514';end if;
 if new.colecao='solicitacoes' then
  if estado in ('Encaminhada','Cheguei','Atendida') and nullif(new.dados->>'atribuido_a','') is null then raise exception 'Pedido exige colaborador' using errcode='23514';end if;
  if estado='Aguardando' and nullif(new.dados->>'atribuido_a','') is not null then raise exception 'Pedido aguardando não admite atribuição' using errcode='23514';end if;
  if TG_OP='UPDATE' and previo in ('Cheguei','Atendida','Cancelada') and (new.dados->>'atribuido_a' is distinct from anterior->>'atribuido_a' or new.dados->>'necessidade' is distinct from anterior->>'necessidade') then raise exception 'Atribuição em andamento ou encerrada não pode ser trocada' using errcode='23514';end if;
  if nullif(new.dados->>'atribuido_a','') is not null and (TG_OP='INSERT' or new.dados->>'atribuido_a' is distinct from anterior->>'atribuido_a' or new.dados->>'necessidade' is distinct from anterior->>'necessidade' or new.dados->>'urgencia' is distinct from anterior->>'urgencia') then
   select dados into pessoa from public.ma_cadastros where municipio_id=new.municipio_id and colecao='voluntarios' and id=new.dados->>'atribuido_a';
   if pessoa is null then raise exception 'Colaborador não encontrado no município' using errcode='23503';end if;
   if new.dados->>'urgencia'='Crítica' or pessoa->>'disponibilidade'='Indisponível' or right(regexp_replace(pessoa->>'telefone','[^0-9]','','g'),11)=right(regexp_replace(new.dados->>'telefone','[^0-9]','','g'),11) then raise exception 'Encaminhamento não permitido' using errcode='23514';end if;
   lista:=coalesce(pessoa->'ajudas','[]')||coalesce(pessoa->'maquinas','[]')||coalesce(pessoa->'materiais','[]')||coalesce(pessoa->'empreendedores','[]');
   if not exists(select 1 from jsonb_array_elements_text(coalesce(regras->'compatibilidade'->(new.dados->>'necessidade'),'[]')) c join jsonb_array_elements_text(lista) r on lower(btrim(c))=lower(btrim(r))) then raise exception 'Colaborador incompatível com a necessidade' using errcode='23514';end if;
  end if;
 end if;
 if new.colecao='voluntarios' then
  estado:=coalesce(new.dados->>'checkin_status','');previo:=coalesce(anterior->>'checkin_status','');
  if estado not in ('','presente','finalizado') or (estado='finalizado' and previo<>'presente' and estado<>previo) or (estado='' and previo<>'') then raise exception 'Transição de presença inválida' using errcode='23514';end if;
  if TG_OP='UPDATE' and previo<>'' and (estado=previo or estado='finalizado') and (
   (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(new.dados) where key like 'checkin_%' and key<>'checkin_status' or key='checkout_em') is distinct from
   (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(anterior) where key like 'checkin_%' and key<>'checkin_status' or key='checkout_em')
  ) then raise exception 'Metadados de presença não podem ser reescritos' using errcode='23514';end if;
  if estado='presente' and (previo<>estado or (new.dados-'nome'-'telefone'-'email'-'endereco') is distinct from (anterior-'nome'-'telefone'-'email'-'endereco')) then
   bairro:=new.dados->>'bairro';
   if nullif(btrim(bairro),'') is null or new.dados->>'checkin_bairro' is distinct from bairro then raise exception 'Bairro de presença diferente do cadastro' using errcode='23514';end if;
   select case when jsonb_typeof(dados->'geojson')='string' then (dados->>'geojson')::jsonb else dados->'geojson' end into geo from public.ma_cadastros where municipio_id=new.municipio_id and colecao='bairros' and dados->>'nome'=bairro and dados->>'verificacao'='Validado';
   if geo is null or nullif(new.dados->>'checkin_precisao','') is null or not ((new.dados->>'checkin_precisao')::numeric between 0 and (regras->>'gpsPrecisaoMaxima')::numeric) or not coalesce(private.ma_dentro_poligono(geo,(new.dados->>'checkin_lng')::numeric,(new.dados->>'checkin_lat')::numeric),false) then raise exception 'Presença fora do bairro validado ou GPS insuficiente' using errcode='23514';end if;
   if previo<>estado then new.dados:=new.dados||jsonb_build_object('checkin_em',clock_timestamp(),'checkout_em',null,'checkin_tipo','autodeclarado_validado_servidor','checkin_fonte','Cadastro territorial municipal');end if;
  end if;
  if estado='finalizado' and previo<>estado then new.dados:=new.dados||jsonb_build_object('checkout_em',clock_timestamp());end if;
 end if;
 if new.colecao='apoios' and (nullif(new.dados->>'recurso','') is null or new.dados->>'destino_id'=new.municipio_id or not exists(select 1 from public.ma_prefeituras where id=new.dados->>'destino_id' and dados->>'status'='ativa')) then raise exception 'Destino ou recurso de apoio inválido' using errcode='23514';end if;
 if new.colecao='apoios' then
  select dados into pessoa from public.ma_prefeituras where id=new.dados->>'destino_id';
  new.dados:=new.dados||jsonb_build_object('destino',(pessoa->>'nome')||' / '||(pessoa->>'uf'));
 end if;
 if new.colecao='mobilizacoes' and not exists(select 1 from public.ma_cadastros where municipio_id=new.municipio_id and colecao='zonas' and dados->>'nome'=new.dados->>'zona') then raise exception 'Zona não cadastrada' using errcode='23514';end if;
 if new.colecao='mobilizacoes' then
  select coalesce(jsonb_agg(r),'[]') into lista from (
   select distinct on (coalesce(nullif(regexp_replace(dados->>'telefone','[^0-9]','','g'),''),id)) id,dados->>'nome' as nome,dados->>'telefone' as telefone,case when colecao='voluntarios' then 'colaborador' else 'equipe' end as tipo
   from public.ma_cadastros where municipio_id=new.municipio_id and colecao in ('voluntarios','equipes') and dados->>'zona'=new.dados->>'zona' and coalesce(dados->>'disponibilidade',dados->>'status','')<>'Indisponível'
   order by coalesce(nullif(regexp_replace(dados->>'telefone','[^0-9]','','g'),''),id),id
  ) r;
  new.dados:=new.dados||jsonb_build_object('destinatarios',lista::text);
 end if;
 return new;
end;
$$;
revoke all on function private.ma_validar_operacao() from public,anon,authenticated,ma_escritor;
create trigger ma_operacao_cadastro before insert or update on public.ma_cadastros for each row execute function private.ma_validar_operacao();
commit;
