begin;
-- Fluxo "animal" do WhatsApp. Nova versão imutável copiada da versão publicada mais recente.
-- Preparação apenas: o canal continua na versão atual até a troca por wa.ma_wa_usar_versao.
-- O relato nasce "Em triagem" com categoria 'animal'; a visibilidade vem do tipo (guard da etapa A).
do $animal$
declare old_v uuid;new_v uuid;
begin
select id into strict old_v from wa.versions where published_at is not null order by published_at desc,created_at desc limit 1;
insert into wa.versions(name,config)
 select 'municipal-v3-animal',jsonb_set(config,'{texts,completed}',coalesce(config->'texts'->'completed','{}')||jsonb_build_object('animal',
  'Relato registrado e encaminhado para a equipe de proteção animal. Denúncias de maus-tratos ficam em sigilo. Em flagrante, ligue 190. Protocolo: {protocolo}'))
 from wa.versions where id=old_v returning id into new_v;
insert into wa.flows select new_v,key,position,title,button,intro,condition,outputs from wa.flows where version_id=old_v;
insert into wa.nodes select new_v,flow,key,position,definition from wa.nodes where version_id=old_v;
update wa.versions set config=jsonb_set(config,'{texts,simulated_completed,animal}',
 to_jsonb('Simulação concluída. Nenhum cadastro ou mensagem real foi criado.'||E'\n\n'||(config->'texts'->'completed'->>'animal')))
 where id=new_v and config->'texts' ? 'simulated_completed';
if exists(select 1 from wa.versions where id=new_v and config->'buttons' ? 'review_by_flow') then
 update wa.versions set config=jsonb_set(config,'{buttons,review_by_flow,animal}',config->'buttons'->'review_by_flow'->'relato') where id=new_v;
end if;

insert into wa.flows(version_id,key,position,title,button,intro,condition,outputs) values(new_v,'animal',
 (select coalesce(max(position),0)+1 from wa.flows where version_id=new_v),
 'Proteção animal','Proteção animal',
 'Vamos registrar o caso para a equipe de proteção animal. Em flagrante de maus-tratos, ligue 190.','{}'::jsonb,
 $o$[
 {"key":"relato_identificado","collection":"relatos","identity":"cycle","condition":{"field":"identificacao","eq":"Sim"},
  "fields":{"nome":{"answer":"nome"},"telefone":{"context":"contact"},"anonimo":{"constant":false},"categoria":{"constant":"animal"},
   "situacao":{"answer":"situacao"},"especie":{"answer":"especie"},"endereco":{"answer":"endereco"},"descricao":{"answer":"descricao"},
   "foto":{"answer":"foto"},"status":{"constant":"Em triagem"},"origem":{"constant":"WhatsApp"},"criado_em":{"context":"now"}}},
 {"key":"relato_anonimo","collection":"relatos","identity":"cycle","condition":{"field":"identificacao","eq":"Não, quero sigilo"},
  "fields":{"nome":{"constant":"Anônimo"},"telefone":{"context":"contact"},"anonimo":{"constant":true},"categoria":{"constant":"animal"},
   "situacao":{"answer":"situacao"},"especie":{"answer":"especie"},"endereco":{"answer":"endereco"},"descricao":{"answer":"descricao"},
   "foto":{"answer":"foto"},"status":{"constant":"Em triagem"},"origem":{"constant":"WhatsApp"},"criado_em":{"context":"now"}}}
 ]$o$::jsonb);
-- Os valores de "situacao" são os mesmos de ocorrenciaTipos.situacao_whatsapp do modelo protecao-animal.
insert into wa.nodes(version_id,flow,key,position,definition) values
 (new_v,'animal','situacao',1,$n${"label":"Situação","question":"O que aconteceu?","kind":"single","required":true,"max_length":2000,"options":[
  {"value":"Perdi meu animal","button":"Perdi meu animal","label":"Perdi meu animal"},
  {"value":"Encontrei um animal","button":"Encontrei um animal","label":"Encontrei um animal"},
  {"value":"Animal ferido ou em risco","button":"Animal ferido","label":"Animal ferido ou em risco"},
  {"value":"Maus-tratos ou abandono","button":"Maus-tratos","label":"Maus-tratos ou abandono"}]}$n$::jsonb),
 (new_v,'animal','especie',2,$n${"label":"Espécie","question":"Qual é o animal?","kind":"single","required":true,"max_length":2000,"options":[
  {"value":"Cão","button":"Cão","label":"Cão"},{"value":"Gato","button":"Gato","label":"Gato"},
  {"value":"Equino","button":"Cavalo ou similar","label":"Cavalo ou similar"},{"value":"Outro","button":"Outro","label":"Outro"}]}$n$::jsonb),
 (new_v,'animal','endereco',3,$n${"label":"Local","question":"Onde o animal está ou foi visto pela última vez? Informe rua, número ou referência e bairro.","kind":"text","required":true,"max_length":2000}$n$::jsonb),
 (new_v,'animal','descricao',4,$n${"label":"Descrição","question":"Descreva o animal e a situação: cor, porte, coleira, comportamento.","kind":"text","required":true,"max_length":2000}$n$::jsonb),
 (new_v,'animal','foto',5,$n${"label":"Foto","question":"Envie uma foto do animal, se for seguro. Você também pode pular.","kind":"photo","required":false,"max_length":2000}$n$::jsonb),
 (new_v,'animal','identificacao',6,$n${"label":"Identificação","question":"Quer se identificar? Em denúncias, você pode manter sigilo.","kind":"single","required":true,"max_length":2000,"options":[
  {"value":"Sim","button":"Sim","label":"Sim"},{"value":"Não, quero sigilo","button":"Não, quero sigilo","label":"Não, quero sigilo"}]}$n$::jsonb),
 (new_v,'animal','nome',7,$n${"label":"Nome","question":"Qual é seu nome?","kind":"text","required":true,"max_length":2000,"condition":{"field":"identificacao","eq":"Sim"}}$n$::jsonb);
perform wa.publish(new_v);
insert into wa.operations(action,target) values('animal_flow_prepared',new_v::text);
end $animal$;
commit;
