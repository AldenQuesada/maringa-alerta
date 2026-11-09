-- Somente banco descartável. As fixtures e alterações de catálogo são revertidas.
begin;
create function pg_temp.exigir(ok boolean,mensagem text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',mensagem;end if;end$$;
grant execute on function pg_temp.exigir(boolean,text) to authenticated,anon,service_role;
create function pg_temp.rejeitar(comando text,codigo text) returns void language plpgsql as $$
declare obtido text;
begin
 begin execute comando;exception when others then get stacked diagnostics obtido=returned_sqlstate;end;
 if obtido is distinct from codigo then raise exception 'Esperado %, recebido %: %',codigo,obtido,comando;end if;
end$$;
grant execute on function pg_temp.rejeitar(text,text) to authenticated,anon,service_role;
create function pg_temp.gravar(colecao text,id text,dados jsonb,municipio text default 'maringa',operacao text default 'inserir',versao bigint default 1)
returns jsonb language sql as $$
 select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('operacao',operacao,'colecao',colecao,'id',id,'municipio_id',municipio,'versao',versao,
 'dados',dados||jsonb_build_object('id',id,'municipioId',municipio))));
$$;
grant execute on function pg_temp.gravar(text,text,jsonb,text,text,bigint) to authenticated,anon,service_role;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000081','territorio-admin@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000082','territorio-operador@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000083','territorio-leitor@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000084','territorio-externo@invalid.example',now());
insert into private.ma_admins values('00000000-0000-4000-8000-000000000081');
insert into public.ma_vinculos values
 ('maringa','00000000-0000-4000-8000-000000000081','admin'),
 ('maringa','00000000-0000-4000-8000-000000000082','operador'),
 ('maringa','00000000-0000-4000-8000-000000000083','leitor');
insert into public.ma_prefeituras(id,dados) values('territorio-outro','{"id":"territorio-outro","nome":"Londrina","codigo_ibge":"4113700","uf":"PR","codigo_uf":"41","paisId":"BR","status":"ativa"}');
insert into public.ma_cadastros(municipio_id,colecao,id,dados) values
 ('territorio-outro','unidades','somente-externa','{"id":"somente-externa","municipioId":"territorio-outro","nome":"Externa","tipo_id":"igreja","lat":-23.42,"lng":-51.93}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
select pg_temp.exigir(jsonb_array_length(public.ma_catalogo_territorial()->'categorias')=12,'12 categorias configuráveis');
select pg_temp.exigir(public.ma_minhas_capacidades()#>>'{maringa,servicos,gravar}'='true','Capacidades do domínio novo');
select pg_temp.rejeitar($q$select public.ma_salvar_catalogo_territorial(null,'{"id":"sem_entidade","nome":"Inválido"}',0)$q$,'22023');
select public.ma_salvar_catalogo_territorial('categoria','{"id":"nova_categoria","nome":"Categoria configurada"}',0);
select public.ma_salvar_catalogo_territorial('tipo','{"id":"novo_servico","categoria_id":"nova_categoria","dominio":"servico","nome":"Serviço sem alteração de JavaScript"}',0);
select public.ma_salvar_catalogo_territorial('tipo','{"id":"novo_subtipo","categoria_id":"nova_categoria","dominio":"servico","pai_id":"novo_servico","nome":"Subtipo configurado"}',0);
select pg_temp.rejeitar($q$select public.ma_salvar_catalogo_territorial('tipo','{"id":"novo_servico","categoria_id":"nova_categoria","dominio":"servico","pai_id":"novo_subtipo","nome":"Ciclo"}',1)$q$,'23514');
select pg_temp.rejeitar($q$select public.ma_salvar_catalogo_territorial('tipo','{"id":"novo_servico","categoria_id":"nova_categoria","dominio":"servico","nome":"Versão antiga"}',0)$q$,'40001');
select pg_temp.rejeitar($q$select public.ma_salvar_catalogo_territorial('tipo','{"id":"novo_servico","categoria_id":"nova_categoria","dominio":"recurso","nome":"Outro domínio"}',1)$q$,'23514');
select public.ma_colaborador_salvar('maringa','pessoa-territorio','{"nome":"Pessoa existente","funcao":"operador","telefone":"44999990000","email":"territorio-pessoa@example.invalid","endereco":"Rua","bairro":"Centro","cargo":"Apoio","horarios":[]}','{"papel":"leitor","colecoes":[],"situacao":"pendente"}',null);
select pg_temp.gravar('unidades','local-territorio','{"nome":"Igreja com múltiplos serviços","tipo_id":"igreja","lat":-23.42,"lng":-51.93,"geo_fonte":"GPS informado","geo_precisao_m":8,"geo_confirmada":true,"responsavel_colecao":"usuarios","responsavel_id":"pessoa-territorio"}');
select pg_temp.gravar('servicos','cozinha-territorio','{"nome":"Cozinha","tipo_id":"cozinha","unidade_colecao":"unidades","unidade_id":"local-territorio","capacidade_valor":250,"unidade_medida":"refeicoes","periodo":"dia"}');
select pg_temp.gravar('servicos','servico-territorio','{"nome":"Outro serviço","tipo_id":"novo_subtipo","unidade_colecao":"unidades","unidade_id":"local-territorio"}');
select pg_temp.gravar('recursos','freezer-territorio','{"nome":"Freezers","tipo_id":"freezer","unidade_colecao":"unidades","unidade_id":"local-territorio","quantidade_disponivel":2,"unidade_medida":"unidade"}');
select pg_temp.gravar('eventos','operacao-territorio','{"nome":"Operação local","tipo":"Apoio","vinculos_territoriais":[{"colecao":"servicos","id":"cozinha-territorio"},{"colecao":"recursos","id":"freezer-territorio"}]}');
set constraints all immediate;
select pg_temp.exigir((select count(*)=2 from territorio.entidades where unidade_id='local-territorio' and dominio='servico'),'Múltiplos serviços no mesmo local');
select pg_temp.exigir((select quantidade=2 and capacidade is null from territorio.entidades where id='freezer-territorio'),'Recurso com identidade e quantidade próprias');
select pg_temp.exigir((select capacidade=250 and periodo='dia' from territorio.entidades where id='cozinha-territorio'),'Capacidade do serviço preservada');
select pg_temp.exigir((select count(*)=2 from territorio.vinculos_operacionais where operacao_id='operacao-territorio'),'Operação vinculada sem cadastro paralelo');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_proximos('maringa',-23.42,-51.93,10))=4,'Raio inclui ponto próprio e serviços/recursos no local');
select pg_temp.exigir(public.ma_territorio_proximos('maringa',-23.42,-51.93,10,'recurso','freezer')->0->>'ponto_herdado'='true','Recurso herda localização sem duplicar coordenadas');
select pg_temp.exigir(public.ma_territorio_proximos('maringa',-23.42,-51.93,10,'servico','cozinha')->0->>'geo_confirmada'='true','Qualidade da coordenada herdada');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_proximos('maringa',-23.50,-51.93,100))=0,'Ponto fora do raio excluído');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_proximos('territorio-outro',-23.42,-51.93,100))=0,'Admin geral não ganha leitura municipal implícita');
select pg_temp.rejeitar($q$select pg_temp.gravar('servicos','sem-local','{"nome":"Sem local","tipo_id":"cozinha"}')$q$,'23514');
select pg_temp.rejeitar($q$select pg_temp.gravar('servicos','local-errado','{"nome":"Local errado","tipo_id":"cozinha","unidade_colecao":"recursos","unidade_id":"freezer-territorio"}')$q$,'23503');
select pg_temp.rejeitar($q$select pg_temp.gravar('servicos','local-cruzado','{"nome":"Outro município","tipo_id":"cozinha","unidade_colecao":"unidades","unidade_id":"somente-externa"}')$q$,'23503');
select pg_temp.rejeitar($q$select pg_temp.gravar('recursos','tipo-errado','{"nome":"Não é serviço","tipo_id":"cozinha"}')$q$,'23514');
select pg_temp.rejeitar($q$select pg_temp.gravar('unidades','local-territorio','{}','maringa','excluir',1)$q$,'23503');
select pg_temp.rejeitar($q$select pg_temp.gravar('usuarios','pessoa-territorio','{}','maringa','excluir',1)$q$,'42501');
reset role;
select pg_temp.rejeitar($q$delete from public.ma_cadastros where municipio_id='maringa' and colecao='usuarios' and id='pessoa-territorio'$q$,'23503');
set local role authenticated;
select pg_temp.rejeitar($q$select pg_temp.gravar('servicos','cozinha-territorio','{}','maringa','excluir',1)$q$,'23503');
select pg_temp.rejeitar($q$select pg_temp.gravar('recursos','freezer-territorio','{"nome":"Concorrência","tipo_id":"freezer"}','maringa','atualizar',999)$q$,'40001');
select pg_temp.rejeitar($q$insert into territorio.entidades(municipio_id,colecao,id,dominio,ativo,versao) values('maringa','unidades','direto','local',true,1)$q$,'42501');
select pg_temp.rejeitar($q$update territorio.tipos set nome='Direto' where id='freezer'$q$,'42501');
select pg_temp.rejeitar($q$select private.ma_projetar_territorio(c) from public.ma_cadastros c limit 1$q$,'42501');
select pg_temp.rejeitar($q$select pg_temp.gravar('unidades','geo-invalida','{"nome":"Inválida","tipo_id":"igreja","lat":91,"lng":0}')$q$,'23514');
select pg_temp.rejeitar($q$select pg_temp.gravar('unidades','geo-nan','{"nome":"Inválida","tipo_id":"igreja","lat":"NaN","lng":0}')$q$,'23514');
select pg_temp.rejeitar($q$select pg_temp.gravar('unidades','geo-sem-ponto','{"nome":"Inválida","tipo_id":"igreja","geo_confirmada":true,"geo_fonte":"GPS"}')$q$,'23514');
select pg_temp.rejeitar($q$select pg_temp.gravar('unidades','geo-precisao','{"nome":"Inválida","tipo_id":"igreja","geo_precisao_m":-1}')$q$,'23514');
select pg_temp.rejeitar($q$select pg_temp.gravar('recursos','quantidade-negativa','{"nome":"Inválida","tipo_id":"freezer","quantidade_disponivel":-1}')$q$,'23514');
select pg_temp.rejeitar($q$select public.ma_territorio_proximos('maringa','NaN',0,100)$q$,'22023');
select pg_temp.rejeitar($q$select public.ma_territorio_proximos('maringa',0,0,'Infinity')$q$,'22023');
select pg_temp.rejeitar($q$select public.ma_territorio_proximos('maringa',0,0,-1)$q$,'22023');
select pg_temp.rejeitar($q$select public.ma_territorio_proximos('maringa',0,0,100,null,null,501)$q$,'22023');
select pg_temp.gravar('zonas','area-territorio','{"nome":"Área com limite","geojson":{"type":"Polygon","coordinates":[[[-52,-24],[-51,-24],[-51,-23],[-52,-23],[-52,-24]]]}}');
select pg_temp.exigir(public.ma_territorio_areas('maringa',-24,-52)->0->>'id'='area-territorio','ST_Covers inclui a borda');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_areas('maringa',-25,-53))=0,'Fora do polígono');
select pg_temp.rejeitar($q$select pg_temp.gravar('zonas','area-cruzada','{"nome":"Inválida","geojson":{"type":"Polygon","coordinates":[[[0,0],[1,1],[1,0],[0,1],[0,0]]]}}')$q$,'23514');
-- Compatibilidade: atualizar um cadastro legado mantém sua identidade e projeta sua nova posição.
select pg_temp.gravar('bases','legado-territorio','{"nome":"Base legada","tipo":"Ponto de água potável","lat":-23.42,"lng":-51.93,"geo_status":"Validado","verificacao":"Validado"}');
select pg_temp.exigir((select not geo_confirmada and tipo_id='local_geral' from territorio.entidades where id='legado-territorio'),'Não inventar serviço ou confirmação GPS pelo rótulo antigo');
select pg_temp.gravar('bases','legado-territorio','{"nome":"Base legada","tipo":"Ponto de água potável","lat":-23.52,"lng":-51.93}','maringa','atualizar',1);
select pg_temp.exigir((select versao=2 from territorio.entidades where id='legado-territorio'),'Projeção acompanha versão canônica');
select pg_temp.gravar('bases','legado-territorio','{}','maringa','excluir',2);
select pg_temp.exigir(not exists(select 1 from territorio.entidades where id='legado-territorio'),'Exclusão sem dependências limpa projeção');
-- Desativação remove da busca, sem apagar histórico; edição de um tipo já vinculado continua possível.
select public.ma_salvar_catalogo_territorial('tipo','{"id":"novo_subtipo","categoria_id":"nova_categoria","dominio":"servico","pai_id":"novo_servico","nome":"Subtipo configurado","ativo":false}',1);
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_proximos('maringa',-23.42,-51.93,10,'servico','novo_subtipo'))=0,'Tipo inativo não oferece serviço');
select pg_temp.gravar('servicos','servico-territorio','{"nome":"Nome corrigido","tipo_id":"novo_subtipo","unidade_colecao":"unidades","unidade_id":"local-territorio"}','maringa','atualizar',1);
select pg_temp.rejeitar($q$select pg_temp.gravar('servicos','novo-inativo','{"nome":"Inválido","tipo_id":"novo_subtipo","unidade_colecao":"unidades","unidade_id":"local-territorio"}')$q$,'23514');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select pg_temp.gravar('recursos','recurso-operador','{"nome":"Operador pode criar","tipo_id":"freezer"}');
select pg_temp.rejeitar($q$select pg_temp.gravar('recursos','recurso-operador','{}','maringa','excluir',1)$q$,'42501');
select pg_temp.rejeitar($q$select public.ma_salvar_catalogo_territorial('categoria','{"id":"sem_permissao","nome":"Negado"}',0)$q$,'42501');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_listar('territorio-outro'))=0,'Operador não lista outro município');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000083',true);
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_listar('maringa','servico'))=2,'Leitor consulta novos domínios');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_listar('maringa','pessoa'))=0,'Leitura territorial não amplia acesso a pessoas');
select pg_temp.rejeitar($q$select pg_temp.gravar('recursos','leitor-escrita','{"nome":"Negado","tipo_id":"freezer"}')$q$,'42501');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000084',true);
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_listar('maringa'))=0,'Usuário sem vínculo não lê projeção');
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_proximos('maringa',-23.42,-51.93,100000))=0,'Raio sem vínculo não vaza dados');
select pg_temp.exigir(not exists(select 1 from private.ma_pontos_no_raio('maringa',-23.42,-51.93,100000)),'Leitor espacial privado também exige vínculo');
select pg_temp.exigir(public.ma_territorio_areas('maringa',-23.42,-51.93)='[]'::jsonb,'Área sem vínculo não vaza dados');
reset role;
select pg_temp.exigir((select count(*)=1 from private.ma_historico where tabela='tipos' and registro_id='novo_servico' and ator='00000000-0000-4000-8000-000000000081'),'Auditoria de catálogo, ciclo rejeitado sem gravação');
select pg_temp.exigir(exists(select 1 from private.ma_historico where tabela='ma_cadastros' and registro_id='freezer-territorio' and posterior#>>'{dados,quantidade_disponivel}'='2'),'Auditoria com dados de recurso');
update public.ma_prefeituras set dados=jsonb_set(dados,'{status}','"suspensa"') where id='maringa';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
select pg_temp.exigir(jsonb_array_length(public.ma_territorio_listar('maringa'))=0,'Suspensão bloqueia leitura');
select pg_temp.rejeitar($q$select pg_temp.gravar('recursos','suspenso','{"nome":"Negado","tipo_id":"freezer"}')$q$,'42501');
set local role anon;
select pg_temp.rejeitar($q$select public.ma_catalogo_territorial()$q$,'42501');
select pg_temp.rejeitar($q$select public.ma_territorio_proximos('maringa',0,0,100)$q$,'42501');
reset role;
select pg_temp.exigir(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='territorio' and c.relkind='r' and not c.relrowsecurity),'RLS em todas as tabelas territoriais');
rollback;
