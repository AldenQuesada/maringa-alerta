-- Envio de alertas e ações aos inscritos, saída por SAIR e página pública. Somente em PostgreSQL descartável; tudo é desfeito no fim.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000071','admin-envio@invalid.example',now()),
 ('00000000-0000-4000-8000-000000000073','leitor-envio@invalid.example',now());
insert into public.ma_vinculos values
 ('maringa','00000000-0000-4000-8000-000000000071','admin'),
 ('maringa','00000000-0000-4000-8000-000000000073','leitor');
create function pg_temp.como(u text) returns void language sql as $$select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000'||u,true)$$;
create function pg_temp.gravar(c text,i text,d jsonb,v bigint default null) returns jsonb language sql as $$ select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('colecao',c,'id',i,'municipio_id','maringa','operacao',case when v is null then 'inserir' else 'atualizar' end,'versao',v,'dados',d||jsonb_build_object('id',i,'municipioId','maringa')))) $$;
create function pg_temp.atualizar(c text,i text,mudanca jsonb) returns jsonb language sql as $$ select pg_temp.gravar(c,i,dados||mudanca,versao) from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i $$;
create function pg_temp.dados(c text,i text) returns jsonb language sql as $$select dados from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i$$;
create function pg_temp.rejeita(comando text,codigo text default '23514') returns void language plpgsql as $$
declare rejeitado boolean:=false;
begin begin execute comando;exception when others then if sqlstate<>codigo then raise;end if;rejeitado:=true;end;if not rejeitado then raise exception 'Operação proibida aceita: %',comando;end if;end$$;
create function pg_temp.exige(condicao boolean,mensagem text) returns void language plpgsql as $$begin if not coalesce(condicao,false) then raise exception 'Falhou: %',mensagem;end if;end$$;
create function pg_temp.ligar(v boolean) returns void language sql security definer as $$
 update public.ma_configuracao set documento=jsonb_set(documento,'{protecaoAnimal,envio,ativo}',to_jsonb(v)) where id='operacao'$$;
create function pg_temp.estado(colecao text,registro text,contato text) returns text language sql security definer as $$
 select state from wa.envios where origem_colecao=$1 and origem_id=$2 and contato=$3$$;
create function pg_temp.inscrever(i text,telefone text,bairro text,ativo boolean default true) returns void language sql security definer as $$
 insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','inscritos',i,
  jsonb_build_object('id',i,'municipioId','maringa','nome','Pessoa '||i,'telefone',telefone,'bairro',bairro,'ativo',ativo,'origem','WhatsApp'))$$;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p where p.pronamespace=pg_my_temp_schema() loop
 execute format('grant execute on function %s to authenticated,anon,service_role',f);end loop;end$$;

-- Configuração: nasce desligada, com modelos, saída e textos no banco.
select pg_temp.exige((select documento#>>'{protecaoAnimal,envio,ativo}'='false' and documento#>'{protecaoAnimal,envio,modelos,alertas,nome}' is not null
 and documento#>'{protecaoAnimal,envio,saida,palavras}' ? 'sair' from public.ma_configuracao where id='operacao'),'envio desligado e configurado');
select pg_temp.exige((select documento#>'{monitoramento-animal,textos,envio,aprovarEnviar}' is not null from public.ma_configuracao where id='mapas'),'textos da ficha');
-- Nenhuma função nova é anônima.
select pg_temp.exige(not has_function_privilege('anon','public.ma_aviso_publico(text,text,text)','execute')
 and not has_function_privilege('anon','public.ma_enviar_inscritos(text,text,text)','execute')
 and not has_function_privilege('authenticated','public.ma_aviso_publico(text,text,text)','execute')
 and not has_function_privilege('authenticated','public.ma_wa_reservar_envio()','execute'),'fronteiras das funções novas');

update wa.channels set enabled=true,outbound_enabled=true;

set local role authenticated;
select pg_temp.como('71');
select public.ma_instalar_protecao_animal('maringa');
select pg_temp.gravar('bairros','b-centro','{"nome":"Centro de envio","geojson":{"type":"Polygon","coordinates":[[[-52,-23.5],[-51.9,-23.5],[-51.9,-23.4],[-52,-23.4],[-52,-23.5]]]}}');
select pg_temp.gravar('bairros','b-vizinho','{"nome":"Vizinho de envio","geojson":{"type":"Polygon","coordinates":[[[-51.9,-23.5],[-51.8,-23.5],[-51.8,-23.4],[-51.9,-23.4],[-51.9,-23.5]]]}}');
select pg_temp.gravar('bairros','b-longe','{"nome":"Distante de envio","geojson":{"type":"Polygon","coordinates":[[[-51.5,-23.5],[-51.4,-23.5],[-51.4,-23.4],[-51.5,-23.4],[-51.5,-23.5]]]}}');
-- Zona que cobre parte do Centro; outra que só encosta na divisa do Vizinho, do lado de fora.
select pg_temp.gravar('zonas','z-77','{"nome":"Zona 77","geojson":{"type":"Polygon","coordinates":[[[-51.98,-23.48],[-51.95,-23.48],[-51.95,-23.45],[-51.98,-23.45],[-51.98,-23.48]]]}}');
select pg_temp.gravar('zonas','z-88','{"nome":"Zona 88","geojson":{"type":"Polygon","coordinates":[[[-51.8,-23.5],[-51.7,-23.5],[-51.7,-23.4],[-51.8,-23.4],[-51.8,-23.5]]]}}');
reset role;
select pg_temp.inscrever('i-centro','554499990001','Centro de envio');
select pg_temp.inscrever('i-vizinho','554499990002','vizinho de envio');
select pg_temp.inscrever('i-longe','554499990003','Distante de envio');
select pg_temp.inscrever('i-zona','554499990004','zona 077');
select pg_temp.inscrever('i-encosta','554499990005','Zona 88');
select pg_temp.inscrever('i-saiu','554499990006','Centro de envio',false);
select pg_temp.inscrever('i-sem-bairro','554499990007','Bairro inexistente');
-- Inscrição por zona: "zona 077" liga à Zona 77; bairro único continua tendo preferência.
select pg_temp.exige(pg_temp.dados('inscritos','i-zona')->>'zona_id'='z-77' and pg_temp.dados('inscritos','i-zona')->>'bairro_id' is null,'zona digitada ligada');
select pg_temp.exige(pg_temp.dados('inscritos','i-centro')->>'bairro_id'='b-centro' and pg_temp.dados('inscritos','i-centro')->>'zona_id' is null,'bairro tem preferência');
select pg_temp.exige(pg_temp.dados('inscritos','i-sem-bairro')->>'zona_id' is null and pg_temp.dados('inscritos','i-sem-bairro')->>'bairro_id' is null,'sem correspondência fica vazio');

set local role authenticated;
select pg_temp.como('71');
select pg_temp.gravar('relatos','r-perdido','{"categoria":"animal","situacao":"Perdi meu animal","nome":"Tutora","telefone":"44999990001","endereco":"Rua pública, 2","status":"Em triagem","foto":{"bucket":"ma-whatsapp","path":"00000000-0000-4000-8000-000000000000/1.jpg","mime":"image/jpeg"}}');
select pg_temp.gravar('incidentes','i-perdido',jsonb_build_object('tipo_id','animal-perdido','evento_id','protecao-animal-rotina','bairro_id','b-centro','endereco','Rua de teste, 100',
 'quando','2026-11-08T12:00:00Z','gravidade','2','responsabilidade','publica','lat','-23.45','lng','-51.95','status','Confirmada','especie','Cão','origem_relato','r-perdido'));
select pg_temp.gravar('incidentes','i-denuncia',jsonb_build_object('tipo_id','animal-maus-tratos','evento_id','protecao-animal-rotina','bairro_id','b-centro','endereco','Rua restrita, 1',
 'quando','2026-11-08T12:00:00Z','gravidade','2','responsabilidade','publica','lat','-23.45','lng','-51.95','status','Confirmada'));

-- Painel da ocorrência antes do alerta: área = bairro + vizinho; inscritos do bairro, do vizinho e da zona que cobre o bairro.
select pg_temp.exige((public.ma_envio_painel('maringa','incidentes','i-perdido')->>'capaz')::boolean,'admin pode enviar');
select pg_temp.exige((public.ma_envio_painel('maringa','incidentes','i-perdido')->>'inscritos')::int=3,'inscritos da área: bairro, vizinho e zona; sem quem saiu, sem distante, sem zona só encostada');
select pg_temp.exige(public.ma_envio_painel('maringa','incidentes','i-perdido')->'bairros'='["Centro de envio","Vizinho de envio"]'::jsonb,'bairros da área');
select pg_temp.exige((public.ma_envio_painel('maringa','incidentes','i-perdido')->>'enviavel')::boolean and (public.ma_envio_painel('maringa','incidentes','i-perdido')->>'tem_foto')::boolean,'confirmada e com foto');
select pg_temp.exige(public.ma_envio_painel('maringa','incidentes','i-perdido')->'alerta'='null'::jsonb,'sem alerta ainda');

-- Aprovar pelo caminho canônico: um alerta por ocorrência, mensagem obrigatória, caso restrito recusado.
select pg_temp.rejeita($q$select public.ma_alerta_aprovar('maringa','i-perdido','   ')$q$);
select pg_temp.rejeita($q$select public.ma_alerta_aprovar('maringa','i-denuncia','Mensagem')$q$);
create temp table alerta_teste as select public.ma_alerta_aprovar('maringa','i-perdido',E'Cão caramelo, coleira azul.\nAtende por Thor.',true)->>'id' as id;
grant select on alerta_teste to authenticated,service_role;
select pg_temp.exige(pg_temp.dados('alertas',(select id from alerta_teste))->>'status'='Aprovado','alerta aprovado');
select pg_temp.exige(pg_temp.dados('alertas',(select id from alerta_teste))->>'aprovado_por'='00000000-0000-4000-8000-000000000071','aprovação registrada pelo servidor');
select pg_temp.rejeita($q$select public.ma_alerta_aprovar('maringa','i-perdido','Outra')$q$,'23505');

-- Página pública do alerta aberto: a foto do relato só com a escolha feita na aprovação.
set local role service_role;
select pg_temp.exige(public.ma_aviso_foto('maringa',(select id from alerta_teste))->>'path'='00000000-0000-4000-8000-000000000000/1.jpg','foto do relato liberada pela aprovação');
select pg_temp.exige(public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))->>'mensagem'='Cão caramelo, coleira azul.
Atende por Thor.' and (public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))->>'foto')::boolean
 and not (public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))->>'encerrado')::boolean
 and public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))->>'bairro'='Centro de envio','alerta aberto na página');
select pg_temp.exige(public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))::text !~ '4499999|Tutora|telefone|-23\.45','sem dados pessoais nem coordenada');
select pg_temp.exige(public.ma_aviso_publico('maringa','alertas','inexistente') is null and public.ma_aviso_publico('outra','alertas',(select id from alerta_teste)) is null,'registro ou prefeitura inexistente');
reset role;
update public.ma_cadastros set dados=dados||'{"mostrar_foto":false}' where colecao='alertas' and id=(select id from alerta_teste);
set local role service_role;
select pg_temp.exige(public.ma_aviso_foto('maringa',(select id from alerta_teste)) is null,'sem escolha, sem foto');
reset role;
update public.ma_cadastros set dados=dados||'{"mostrar_foto":true}' where colecao='alertas' and id=(select id from alerta_teste);
set local role authenticated;select pg_temp.como('71');

-- Desligado: aprova, mas não enfileira.
select pg_temp.rejeita($q$select public.ma_enviar_inscritos('maringa','alertas',(select id from alerta_teste))$q$,'55000');
reset role;select pg_temp.ligar(true);set local role authenticated;select pg_temp.como('71');

-- Enviar: os três da área; repetir não duplica.
select pg_temp.exige((public.ma_enviar_inscritos('maringa','alertas',(select id from alerta_teste))->>'na_fila')::int=3,'três na fila');
select pg_temp.exige((public.ma_enviar_inscritos('maringa','alertas',(select id from alerta_teste))->>'na_fila')::int=0,'segundo clique não duplica');
select pg_temp.exige((public.ma_envio_painel('maringa','incidentes','i-perdido')->'entregas'->>'pending')::int=3,'painel mostra a fila');
select pg_temp.rejeita($q$select public.ma_enviar_inscritos('maringa','incidentes','i-perdido')$q$,'22023');

-- Leitor não envia nem vê o painel.
select pg_temp.como('73');
select pg_temp.rejeita($q$select public.ma_enviar_inscritos('maringa','alertas',(select id from alerta_teste))$q$,'42501');
select pg_temp.exige(public.ma_envio_painel('maringa','incidentes','i-perdido')='{"capaz":false}'::jsonb,'leitor sem painel');
select pg_temp.rejeita($q$select public.ma_alerta_aprovar('maringa','i-perdido','x')$q$,'42501');

-- Modelo: nome e idioma do banco, texto sem quebra de linha, link da página e botão de saída.
reset role;
select pg_temp.exige((select payload#>>'{template,name}'='alerta_animal_bairro' and payload#>>'{template,language,code}'='pt_BR'
 and payload#>>'{template,components,0,parameters,0,text}'='Cão caramelo, coleira azul. Atende por Thor.'
 and payload#>>'{template,components,1,sub_type}'='url' and payload#>>'{template,components,1,parameters,0,text}'='m=maringa&c=alertas&id='||(select id from alerta_teste)
 and payload#>>'{template,components,2,parameters,0,payload}'='alertas_sair'
 from wa.envios where contato='554499990001'),'modelo montado pelo banco');

-- Trabalhador: reserva, resultado e retorno da Meta.
set local role service_role;
create temp table reserva_teste as select public.ma_wa_reservar_envio() r;
select pg_temp.exige((select r->>'to' from reserva_teste) ~ '^55449999000[124]$' and (select r#>>'{payload,template,name}' from reserva_teste)='alerta_animal_bairro','reserva entrega o modelo');
select public.ma_wa_resultado_envio((select (r->>'id')::uuid from reserva_teste),(select (r->>'lease')::uuid from reserva_teste),'sent','wamid.envio1',null);
reset role;
select pg_temp.exige((select state from wa.envios where provider_id='wamid.envio1')='sent','enviado');
select wa.ma_wa_receber((select phone_number_id from wa.channels limit 1),jsonb_build_array(
 jsonb_build_object('type','status','id','wamid.envio1','status','delivered','timestamp',extract(epoch from now())::bigint::text,'outbox_id',(select r->>'id' from reserva_teste))));
select pg_temp.exige((select state from wa.envios where provider_id='wamid.envio1')='delivered','entregue pelo retorno da Meta');
select wa.ma_wa_receber((select phone_number_id from wa.channels limit 1),jsonb_build_array(
 jsonb_build_object('type','status','id','wamid.envio1','status','read','timestamp',(extract(epoch from now())::bigint+1)::text)));
select pg_temp.exige((select state from wa.envios where provider_id='wamid.envio1')='read','lido');

-- Inscrito que saiu antes da vez dele não recebe.
update public.ma_cadastros set dados=dados||'{"ativo":false}' where colecao='inscritos' and id in ('i-centro','i-vizinho','i-zona') and dados->>'telefone' not in
 (select contato from wa.envios where provider_id='wamid.envio1');
set local role service_role;
select pg_temp.exige(public.ma_wa_reservar_envio() is null,'nada a enviar para quem saiu');
reset role;
select pg_temp.exige((select count(*) from wa.envios where state='cancelled' and error_code='origem_ou_inscricao')=2,'envios de quem saiu cancelados');

-- Desligar o envio para tudo, inclusive a fila.
update wa.envios set state='pending',error_code=null where state='cancelled';
update public.ma_cadastros set dados=dados||'{"ativo":true}' where colecao='inscritos' and id in ('i-centro','i-vizinho','i-zona');
select pg_temp.ligar(false);
set local role service_role;
select pg_temp.exige(public.ma_wa_reservar_envio() is null,'desligado não reserva');
reset role;select pg_temp.ligar(true);

-- Ocorrência resolvida: o alerta deixa de valer e a fila é cancelada, não enviada.
set local role authenticated;select pg_temp.como('71');
select pg_temp.atualizar('incidentes','i-perdido','{"status":"Resolvida","desfecho":"Reunido com o tutor"}');
set local role service_role;
select pg_temp.exige(public.ma_wa_reservar_envio() is null,'alerta encerrado não sai');
reset role;
select pg_temp.exige((select count(*) from wa.envios where state='pending')=0,'fila do alerta encerrado cancelada');

-- Página pública do alerta encerrado: mostra o desfecho e não libera foto.
set local role service_role;
select pg_temp.exige((public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))->>'encerrado')::boolean
 and public.ma_aviso_publico('maringa','alertas',(select id from alerta_teste))->>'desfecho'='Reunido com o tutor','alerta encerrado com desfecho');
select pg_temp.exige(public.ma_aviso_foto('maringa',(select id from alerta_teste)) is null,'caso encerrado sem foto');
reset role;

-- Ações: área pelo bairro da ação; passada ou sem bairro não sai.
set local role authenticated;select pg_temp.como('71');
select pg_temp.gravar('acoes','acao-feira',jsonb_build_object('nome','Feira de adoção da praça','tipo','Feira de adoção','data',to_char(current_date+3,'YYYY-MM-DD'),
 'horario','9h às 13h','endereco','Praça Central','bairro','Vizinho de envio'));
select pg_temp.gravar('acoes','acao-passada',jsonb_build_object('nome','Feira antiga','tipo','Feira de adoção','data',to_char(current_date-1,'YYYY-MM-DD'),'bairro','Vizinho de envio'));
select pg_temp.gravar('acoes','acao-sem-bairro',jsonb_build_object('nome','Castramóvel','tipo','Castramóvel','data',to_char(current_date+1,'YYYY-MM-DD'),'bairro','Lugar nenhum'));
select pg_temp.exige((public.ma_envio_painel('maringa','acoes','acao-feira')->>'inscritos')::int=3,'ação: vizinho, centro e zona do centro');
select pg_temp.exige((public.ma_enviar_inscritos('maringa','acoes','acao-feira')->>'na_fila')::int=3,'ação na fila');
select pg_temp.rejeita($q$select public.ma_enviar_inscritos('maringa','acoes','acao-passada')$q$);
select pg_temp.rejeita($q$select public.ma_enviar_inscritos('maringa','acoes','acao-sem-bairro')$q$);
reset role;
select pg_temp.exige((select payload#>>'{template,name}'='acao_animal_bairro' and payload#>'{template,components,0,parameters}'=jsonb_build_array(
 jsonb_build_object('type','text','text','Feira de adoção da praça'),jsonb_build_object('type','text','text',to_char(current_date+3,'DD/MM/YYYY')||', 9h às 13h'),
 jsonb_build_object('type','text','text','Praça Central, Vizinho de envio')) from wa.envios where origem_id='acao-feira' and contato='554499990002'),'modelo da ação');
set local role service_role;
select pg_temp.exige(public.ma_aviso_publico('maringa','acoes','acao-feira')->>'titulo'='Feira de adoção da praça','ação na página');
reset role;

-- SAIR: quem está inscrito sai na hora, recebe a resposta do banco e a fila dele é cancelada.
select wa.ma_wa_receber((select phone_number_id from wa.channels limit 1),jsonb_build_array(
 jsonb_build_object('type','message','id','wamid.sair1','from','554499990002','timestamp',extract(epoch from now())::bigint::text,'text',' Sair ')));
select pg_temp.exige((pg_temp.dados('inscritos','i-vizinho')->>'ativo')::boolean=false and pg_temp.dados('inscritos','i-vizinho')->>'saiu_em' is not null,'SAIR desativa a inscrição');
select pg_temp.exige((select processed_at is not null from wa.inbox where provider_id='wamid.sair1'),'mensagem tratada');
select pg_temp.exige((select o.payload->>'text' from wa.outbox o join wa.inbox i on i.id=o.inbox_id where i.provider_id='wamid.sair1')
 =(select documento#>>'{protecaoAnimal,envio,saida,resposta}' from public.ma_configuracao where id='operacao'),'resposta do banco');
select pg_temp.exige(pg_temp.estado('acoes','acao-feira','554499990002')='cancelled','fila de quem saiu cancelada');
-- Botão "Parar alertas" do modelo faz o mesmo.
select wa.ma_wa_receber((select phone_number_id from wa.channels limit 1),jsonb_build_array(
 jsonb_build_object('type','message','id','wamid.sair2','from','554499990004','timestamp',extract(epoch from now())::bigint::text,'text','Parar alertas','button','alertas_sair')));
select pg_temp.exige((pg_temp.dados('inscritos','i-zona')->>'ativo')::boolean=false,'botão do modelo desativa');
-- Quem não está inscrito segue o fluxo normal.
select wa.ma_wa_receber((select phone_number_id from wa.channels limit 1),jsonb_build_array(
 jsonb_build_object('type','message','id','wamid.sair3','from','554499990099','timestamp',extract(epoch from now())::bigint::text,'text','sair')));
select pg_temp.exige((select processed_at is null from wa.inbox where provider_id='wamid.sair3'),'não inscrito vai para o fluxo');
-- Outras mensagens não são tocadas.
select wa.ma_wa_receber((select phone_number_id from wa.channels limit 1),jsonb_build_array(
 jsonb_build_object('type','message','id','wamid.oi','from','554499990001','timestamp',extract(epoch from now())::bigint::text,'text','Quero sair de casa')));
select pg_temp.exige((select processed_at is null from wa.inbox where provider_id='wamid.oi') and (pg_temp.dados('inscritos','i-centro')->>'ativo')::boolean,'frase com sair não desinscreve');

-- Exclusão do contato leva os envios dele.
delete from wa.outbox where session_id in (select id from wa.sessions where contact='554499990002');
delete from wa.sessions where contact='554499990002';
select pg_temp.exige(not exists(select 1 from wa.envios where contato='554499990002'),'envios saem com o contato');
rollback;
