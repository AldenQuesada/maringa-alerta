-- Lugares e ações da proteção animal. Somente em PostgreSQL descartável; tudo é desfeito no fim.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000091','admin-acoes@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000093','leitor-acoes@invalid.example',now());
insert into public.ma_vinculos values
 ('maringa','00000000-0000-4000-8000-000000000091','admin'),
 ('maringa','00000000-0000-4000-8000-000000000093','leitor');
insert into public.ma_cadastros(municipio_id,colecao,id,dados) values
 ('maringa','bairros','b-acoes-alvorada','{"id":"b-acoes-alvorada","municipioId":"maringa","nome":"Jardim Alvorada Teste"}');
create function pg_temp.como(u text) returns void language sql as $$select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000'||u,true)$$;
create function pg_temp.gravar(c text,i text,d jsonb,v bigint default null) returns jsonb language sql as $$ select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('colecao',c,'id',i,'municipio_id','maringa','operacao',case when v is null then 'inserir' else 'atualizar' end,'versao',v,'dados',d||jsonb_build_object('id',i,'municipioId','maringa')))) $$;
create function pg_temp.dados(c text,i text) returns jsonb language sql as $$select dados from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i$$;
create function pg_temp.rejeita(comando text,codigo text default '23514') returns void language plpgsql as $$
declare rejeitado boolean:=false;
begin begin execute comando;exception when others then if sqlstate<>codigo then raise;end if;rejeitado:=true;end;if not rejeitado then raise exception 'Operação proibida aceita: %',comando;end if;end$$;
create function pg_temp.exige(condicao boolean,mensagem text) returns void language plpgsql as $$begin if not coalesce(condicao,false) then raise exception 'Falhou: %',mensagem;end if;end$$;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p where p.pronamespace=pg_my_temp_schema() loop
 execute format('grant execute on function %s to authenticated,anon,service_role',f);end loop;end$$;

-- Catálogo: os sete tipos novos, na categoria da proteção animal, e os anteriores intactos.
select pg_temp.exige((select count(*) from territorio.tipos where categoria_id='animais')=12,'cinco tipos anteriores e sete novos');
select pg_temp.exige((select dominio from territorio.tipos where id='feira_adocao')='servico' and (select dominio from territorio.tipos where id='castramovel')='recurso'
 and (select dominio from territorio.tipos where id='sede_protecao_animal')='local','domínios dos tipos novos');
-- Formulários: opções vindas do catálogo, separadas por domínio, e o grupo no menu.
select pg_temp.exige((select documento#>'{esquemas,acoes,fields}' @> '[{"key":"tipo","options":["Feira de adoção","Castramóvel"]}]' from public.ma_configuracao where id='interface'),'tipos de ação no formulário');
select pg_temp.exige((select not (documento#>'{esquemas,acoes,fields}' @> '[{"key":"tipo","options":["Centro de Bem-Estar Animal"]}]') from public.ma_configuracao where id='interface'),'lugar não é ação');
select pg_temp.exige((select documento->'grupos' @> '[{"label":"Proteção animal","items":["acoes","unidadesAnimais","inscritos"]}]' from public.ma_configuracao where id='interface'),'grupo no menu');
select pg_temp.exige((select count(*)=1 from public.ma_configuracao,jsonb_array_elements(documento#>'{monitoramento-animal,camadas}') c where id='mapas' and c->>'id'='acoes'),'camada de ações no perfil do mapa');
-- Permissões: as mesmas dos alertas, papel por papel.
select pg_temp.exige((select array_agg(row(papel,ler,gravar,excluir)::text order by papel) from private.ma_permissoes where colecao='acoes')
 =(select array_agg(row(papel,ler,gravar,excluir)::text order by papel) from private.ma_permissoes where colecao='alertas'),'permissões iguais às dos alertas');

set local role authenticated;
select pg_temp.como('91');

-- Ação: o servidor liga o nome ao tipo, liga o bairro e assume "Agendada".
select pg_temp.gravar('acoes','acao-feira','{"nome":"Feira de adoção da praça","tipo":"Feira de adoção","data":"2026-11-22","horario":"9h às 13h","bairro":"jd alvorada teste"}');
select pg_temp.exige(pg_temp.dados('acoes','acao-feira')->>'tipo_id'='feira_adocao','tipo ligado ao catálogo');
select pg_temp.exige(pg_temp.dados('acoes','acao-feira')->>'bairro_id'='b-acoes-alvorada','bairro ligado');
select pg_temp.exige(pg_temp.dados('acoes','acao-feira')->>'status'='Agendada','situação inicial');
-- Recusas: tipo desconhecido, lugar usado como ação, sem data, data inválida, situação fora da lista.
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-x','{"nome":"X","tipo":"Show de talentos","data":"2026-11-22"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-x','{"nome":"X","tipo":"Centro de Bem-Estar Animal","data":"2026-11-22"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-x','{"nome":"X","tipo":"Castramóvel"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-x','{"nome":"X","tipo":"Castramóvel","data":"22/11/2026"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-x','{"nome":"X","tipo":"Castramóvel","data":"2026-02-30"}')$q$,'22008');
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-x','{"nome":"X","tipo":"Castramóvel","data":"2026-11-22","status":"Talvez"}')$q$);
-- Não fica na projeção territorial: a ação é operação datada, não unidade.
select pg_temp.exige(not exists(select 1 from territorio.entidades where colecao='acoes'),'ação fora do catálogo territorial');

-- Lugar: tipo ligado e projetado no território; o mapa o lista pela categoria.
select pg_temp.gravar('unidades','lugar-teste','{"nome":"Abrigo teste","tipo":"Centro de Bem-Estar Animal","categoria":"Animais","lat":"-23.41","lng":"-51.92"}');
select pg_temp.exige(pg_temp.dados('unidades','lugar-teste')->>'tipo_id'='centro_bem_estar_animal','lugar ligado ao catálogo');
select pg_temp.exige(exists(select 1 from territorio.entidades where colecao='unidades' and id='lugar-teste' and tipo_id='centro_bem_estar_animal' and ponto is not null),'lugar projetado com ponto');
select pg_temp.exige(exists(select 1 from jsonb_array_elements(public.ma_territorio_listar('maringa',null,'centro_bem_estar_animal',10)) i where i#>>'{cadastro,id}'='lugar-teste'),'lugar listado pelo tipo');
select pg_temp.rejeita($q$select pg_temp.gravar('unidades','lugar-x','{"nome":"X","tipo":"Feira de adoção","categoria":"Animais"}')$q$);
-- Unidades de outras áreas seguem o caminho de antes: tipo_id direto, sem a regra da proteção animal.
select pg_temp.gravar('unidades','unidade-outra','{"nome":"Base qualquer","tipo_id":"base_logistica"}');
select pg_temp.exige(pg_temp.dados('unidades','unidade-outra')->>'tipo_id'='base_logistica','outras unidades intactas');

-- Como nos alertas, só a administração vê e grava ações.
select pg_temp.como('93');
select pg_temp.exige(pg_temp.dados('acoes','acao-feira') is null,'leitor não vê ações');
select pg_temp.rejeita($q$select pg_temp.gravar('acoes','acao-leitor','{"nome":"X","tipo":"Feira de adoção","data":"2026-11-22"}')$q$,'42501');
rollback;
