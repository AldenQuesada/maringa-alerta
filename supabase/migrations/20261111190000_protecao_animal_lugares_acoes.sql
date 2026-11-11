begin;
-- Proteção animal: lugares fixos e ações nos bairros. Somente acréscimos.
-- Lugares: tipos novos no catálogo territorial (categoria animais) e cadastro "unidades" já existente.
-- Ações: coleção nova "acoes" (feira de adoção, castramóvel, unidade móvel), com data e local, mostrada no mapa
-- enquanto agendada. O envio de alertas das ações chega nas etapas E3 e E4.

-- Tipos do catálogo. O mapa lê o catálogo pela categoria; nenhum nome fica no código.
insert into territorio.tipos(id,categoria_id,dominio,nome) values
 ('sede_protecao_animal','animais','local','Secretaria de Proteção e Bem-Estar Animal'),
 ('centro_bem_estar_animal','animais','local','Centro de Bem-Estar Animal'),
 ('centro_zoonoses','animais','local','Centro de Controle de Zoonoses'),
 ('feira_adocao','animais','servico','Feira de adoção'),
 ('castracao','animais','servico','Castração gratuita'),
 ('castramovel','animais','recurso','Castramóvel'),
 ('unidade_movel_animal','animais','recurso','Unidade móvel nos bairros');

-- Coleção nova, somada à lista vigente sem reescrevê-la.
do $colecao$
declare d text;
begin
 select pg_get_constraintdef(oid) into strict d from pg_constraint where conname='ma_cadastros_colecao_check';
 if position('''inscritos''::text' in d)=0 then raise exception 'Lista de coleções inesperada';end if;
 alter table public.ma_cadastros drop constraint ma_cadastros_colecao_check;
 execute 'alter table public.ma_cadastros add constraint ma_cadastros_colecao_check '||replace(d,'''inscritos''::text','''inscritos''::text, ''acoes''::text');
end $colecao$;

-- Ações geram alertas: mesmas permissões dos alertas, papel por papel.
insert into private.ma_permissoes select papel,'acoes',ler,gravar,excluir from private.ma_permissoes where colecao='alertas';

update public.ma_configuracao set documento=documento||$j${"acoes":{"required":["nome","tipo","data"],"enums":{"status":["Agendada","Realizada","Cancelada"]}}}$j$::jsonb,
 versao=versao+1 where id='contratos';

-- Formulários gerados da Gestão e um grupo no menu. "Tipo" mostra os nomes do catálogo; o servidor liga o nome ao tipo.
update public.ma_configuracao set documento=jsonb_set(jsonb_set(jsonb_set(documento,
 '{esquemas,acoes}',jsonb_build_object('label','Ações nos bairros','singular','Ação','collection','acoes',
  'summary','Feiras de adoção, castramóvel e unidade móvel: data e local. Aparecem no mapa enquanto agendadas.',
  'columns',jsonb_build_array('nome','data','status'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','nome','label','Nome','type','text','required',true),
   jsonb_build_object('key','tipo','label','Tipo de ação','type','select','required',true,'options',
    (select jsonb_agg(nome order by nome) from territorio.tipos where categoria_id='animais' and dominio in ('servico','recurso') and ativo)),
   jsonb_build_object('key','data','label','Data','type','date','required',true),
   jsonb_build_object('key','horario','label','Horário','type','text'),
   jsonb_build_object('key','endereco','label','Endereço','type','text'),
   jsonb_build_object('key','bairro','label','Bairro','type','text'),
   jsonb_build_object('key','lat','label','Latitude','type','text'),
   jsonb_build_object('key','lng','label','Longitude','type','text'),
   jsonb_build_object('key','descricao','label','Descrição','type','textarea'),
   jsonb_build_object('key','status','label','Situação','type','select','options',jsonb_build_array('Agendada','Realizada','Cancelada')),
   jsonb_build_object('key','bairro_id','label','Bairro cadastrado','type','hidden'),
   jsonb_build_object('key','tipo_id','label','Tipo no catálogo','type','hidden')))),
 '{esquemas,unidadesAnimais}',jsonb_build_object('label','Lugares da proteção animal','singular','Lugar','collection','unidades','category','Animais',
  'summary','Secretaria, centros, abrigos e clínicas. Com latitude e longitude, aparecem no mapa do Monitoramento animal.',
  'columns',jsonb_build_array('nome','tipo','verificacao'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','nome','label','Nome','type','text','required',true),
   jsonb_build_object('key','tipo','label','Tipo','type','select','required',true,'options',
    (select jsonb_agg(nome order by nome) from territorio.tipos where categoria_id='animais' and dominio='local' and ativo)),
   jsonb_build_object('key','endereco','label','Endereço','type','text'),
   jsonb_build_object('key','bairro','label','Bairro','type','text'),
   jsonb_build_object('key','lat','label','Latitude','type','text'),
   jsonb_build_object('key','lng','label','Longitude','type','text'),
   jsonb_build_object('key','telefone','label','Telefone','type','tel'),
   jsonb_build_object('key','horario','label','Horário de atendimento','type','text'),
   jsonb_build_object('key','fonte','label','Fonte','type','text'),
   jsonb_build_object('key','url_fonte','label','Link da fonte','type','text'),
   jsonb_build_object('key','verificacao','label','Verificação','type','select','options',jsonb_build_array('Pendente','Em conferência','Validado','Rejeitado')),
   jsonb_build_object('key','categoria','label','Categoria','type','hidden'),
   jsonb_build_object('key','tipo_id','label','Tipo no catálogo','type','hidden')))),
 '{grupos}',documento->'grupos'||jsonb_build_array(jsonb_build_object('label','Proteção animal','items',jsonb_build_array('acoes','unidadesAnimais','inscritos')))),
 versao=versao+1 where id='interface';

-- O servidor liga o nome do tipo ao catálogo da categoria configurada em operacao.protecaoAnimal.categoriaTipos.
-- Tipo desconhecido é recusado. Nas ações, liga também o bairro e assume "Agendada" quando a situação vem vazia.
create function private.ma_protecao_animal_catalogo() returns trigger language plpgsql security definer set search_path='' as $$
declare cat text;dominios text[];achado text;achados text[];
begin
 if not (new.colecao='acoes' or (new.colecao='unidades' and coalesce(new.dados->>'categoria','')='Animais')) then return new;end if;
 select documento#>>'{protecaoAnimal,categoriaTipos}' into cat from public.ma_configuracao where id='operacao';
 if cat is null then raise exception 'Categoria da proteção animal ausente em operacao' using errcode='23514';end if;
 dominios:=case new.colecao when 'acoes' then array['servico','recurso'] else array['local'] end;
 select t.id into achado from territorio.tipos t where t.categoria_id=cat and t.ativo and t.dominio=any(dominios) and t.nome=new.dados->>'tipo';
 if achado is null then raise exception 'Tipo da proteção animal desconhecido: %',coalesce(new.dados->>'tipo','vazio') using errcode='23514';end if;
 new.dados:=new.dados||jsonb_build_object('tipo_id',achado);
 if new.colecao='acoes' then
  if coalesce(new.dados->>'data','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Data da ação inválida' using errcode='23514';end if;
  perform (new.dados->>'data')::date;
  new.dados:=new.dados||jsonb_build_object('status',coalesce(nullif(new.dados->>'status',''),'Agendada'));
  select array_agg(c.id) into achados from public.ma_cadastros c
   where c.municipio_id=new.municipio_id and c.colecao='bairros' and c.arquivado_em is null
    and private.ma_nome_bairro(c.dados->>'nome')=private.ma_nome_bairro(new.dados->>'bairro');
  new.dados:=new.dados||jsonb_build_object('bairro_id',case when cardinality(achados)=1 then to_jsonb(achados[1]) else 'null'::jsonb end);
 end if;
 return new;
end;
$$;
revoke all on function private.ma_protecao_animal_catalogo() from public,anon,authenticated;
-- Antes do contrato (ma_contrato_cadastro), que exige tipo_id nas unidades.
create trigger ma_b_protecao_animal_catalogo before insert or update on public.ma_cadastros for each row execute function private.ma_protecao_animal_catalogo();

-- Mapa: camada das ações e os textos dela, no perfil do banco.
update public.ma_configuracao set documento=jsonb_set(jsonb_set(documento,
 '{monitoramento-animal,camadas}',documento#>'{monitoramento-animal,camadas}'||
  $j$[{"id":"acoes","rotulo":"Ações nos bairros","colecao":"acoes","icone":"📅","estados":["Agendada"]}]$j$::jsonb),
 '{monitoramento-animal,textos,acao}',$j${"lista":"Ação","ficha":"AÇÃO","data":"Data","horario":"Horário","tipo":"Tipo"}$j$::jsonb),
 versao=versao+1 where id='mapas' and documento ? 'monitoramento-animal';
commit;
