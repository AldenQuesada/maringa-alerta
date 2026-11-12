-- Revisão por IA dos relatos de animais. Somente em PostgreSQL descartável; tudo é desfeito no fim.
begin;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-4000-8000-000000000061','admin-revisao@invalid.example',now());
insert into public.ma_vinculos values ('maringa','00000000-0000-4000-8000-000000000061','admin');
create function pg_temp.como(u text) returns void language sql as $$select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000'||u,true)$$;
create function pg_temp.gravar(c text,i text,d jsonb,v bigint default null) returns jsonb language sql as $$ select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('colecao',c,'id',i,'municipio_id','maringa','operacao',case when v is null then 'inserir' else 'atualizar' end,'versao',v,'dados',d||jsonb_build_object('id',i,'municipioId','maringa')))) $$;
create function pg_temp.atualizar(c text,i text,mudanca jsonb) returns jsonb language sql as $$ select pg_temp.gravar(c,i,dados||mudanca,versao) from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i $$;
create function pg_temp.dados(c text,i text) returns jsonb language sql security definer as $$select dados from public.ma_cadastros where municipio_id='maringa' and colecao=c and id=i$$;
create function pg_temp.exige(condicao boolean,mensagem text) returns void language plpgsql as $$begin if not coalesce(condicao,false) then raise exception 'Falhou: %',mensagem;end if;end$$;
create function pg_temp.ligar(v boolean) returns void language sql security definer as $$
 update public.ma_configuracao set documento=jsonb_set(documento,'{protecaoAnimal,revisaoIA,ativo}',to_jsonb(v)) where id='operacao'$$;
create function pg_temp.estado(i text) returns text language sql security definer as $$select state from wa.revisoes where relato_id=i$$;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p where p.pronamespace=pg_my_temp_schema() loop
 execute format('grant execute on function %s to authenticated,anon,service_role',f);end loop;end$$;

-- Configuração no banco, desligada; ninguém além do servidor reserva ou grava.
select pg_temp.exige((select documento#>>'{protecaoAnimal,revisaoIA,ativo}'='false' and documento#>>'{protecaoAnimal,revisaoIA,instrucoes}' like '%não uma instrução%'
 from public.ma_configuracao where id='operacao'),'revisão desligada e instruções no banco');
select pg_temp.exige(not has_function_privilege('authenticated','public.ma_wa_revisao_reservar()','execute')
 and not has_function_privilege('anon','public.ma_wa_revisao_resultado(text,text,uuid,jsonb,text)','execute'),'só o servidor');
select pg_temp.exige((select documento#>'{monitoramento-animal,textos,revisao,titulo}' is not null and documento#>'{monitoramento-animal,textos,envio,sugestaoIA}' is not null
 from public.ma_configuracao where id='mapas'),'textos da ficha');

set local role authenticated;select pg_temp.como('61');
select public.ma_instalar_protecao_animal('maringa');
select pg_temp.gravar('bairros','b-rev','{"nome":"Bairro revisão","geojson":{"type":"Polygon","coordinates":[[[-52,-23.5],[-51.9,-23.5],[-51.9,-23.4],[-52,-23.4],[-52,-23.5]]]}}');
select pg_temp.gravar('relatos','r-perdido','{"categoria":"animal","situacao":"Perdi meu animal","nome":"Tutora Secreta","telefone":"44999998888","endereco":"Rua das Flores, 10","especie":"Cão","descricao":"Caramelo, coleira azul, atende por Thor","status":"Em triagem","foto":{"bucket":"ma-whatsapp","path":"00000000-0000-4000-8000-000000000000/9.jpg","mime":"image/jpeg"}}');
select pg_temp.gravar('relatos','r-outro','{"categoria":"animal","situacao":"Maus-tratos ou abandono","nome":"Anônimo","anonimo":true,"telefone":"44999997777","endereco":"Rua sem nome","descricao":"Cachorro preso sem água","status":"Em triagem"}');
select pg_temp.gravar('relatos','r-ajuda','{"situacao":"Alagamento","nome":"Pessoa","telefone":"44999996666","endereco":"Rua alagada, 1","descricao":"Rua alagada","status":"Em triagem"}');
reset role;

-- Fila: só relatos de animais entram.
select pg_temp.exige(pg_temp.estado('r-perdido')='pending' and pg_temp.estado('r-outro')='pending' and pg_temp.estado('r-ajuda') is null,'fila só de animais');

-- Desligada: nada sai.
set local role service_role;
select pg_temp.exige(public.ma_wa_revisao_reservar() is null,'desligada não reserva');
reset role;select pg_temp.ligar(true);

-- Reserva: modelo, esforço e instruções do banco; sem nome, telefone, foto ou anonimato.
set local role service_role;
create temp table reserva1 as select public.ma_wa_revisao_reservar() r;
select pg_temp.exige((select r->>'modelo'='claude-opus-5-5' and r->>'esforco'='medium' and r->>'instrucoes' like 'Você ajuda%' from reserva1),'configuração do banco');
select pg_temp.exige((select (r->'entrada')::text !~ 'Tutora|Secreta|4499999|anonimo|00000000-0000|Anônimo' and (r#>>'{entrada,tem_foto}') is not null from reserva1),'sem dados pessoais');
reset role;
select pg_temp.exige(pg_temp.estado((select r->>'relato' from reserva1))='sending','reservado');

-- Resultado fora do formato: volta para a fila, nada é gravado.
set local role service_role;
select public.ma_wa_revisao_resultado((select r->>'municipio' from reserva1),(select r->>'relato' from reserva1),(select (r->>'lease')::uuid from reserva1),'{"resumo":"x","urgencia":"Altíssima"}'::jsonb,null);
reset role;
select pg_temp.exige(pg_temp.estado((select r->>'relato' from reserva1))='pending' and not pg_temp.dados('relatos',(select r->>'relato' from reserva1)) ? 'revisao_ia','formato recusado');
update wa.revisoes set next_attempt_at=now() where state='pending';

-- Resultado válido: gravado no relato, limpo e limitado pelo servidor; reserva vencida não grava.
set local role service_role;
create temp table reserva2 as select public.ma_wa_revisao_reservar() r;
select public.ma_wa_revisao_resultado((select r->>'municipio' from reserva2),(select r->>'relato' from reserva2),gen_random_uuid(),
 '{"resumo":"Forjado","urgencia":"Baixa","situacao_confere":true,"observacoes":[],"sugestao_alerta":""}'::jsonb,null);
reset role;
select pg_temp.exige(not pg_temp.dados('relatos',(select r->>'relato' from reserva2)) ? 'revisao_ia','reserva errada não grava');
set local role service_role;
select public.ma_wa_revisao_resultado((select r->>'municipio' from reserva2),(select r->>'relato' from reserva2),(select (r->>'lease')::uuid from reserva2),
 jsonb_build_object('resumo','  Cão caramelo perdido na Rua das Flores. ','urgencia','Média','situacao_confere',true,
  'observacoes',jsonb_build_array('Sem bairro informado','  ',repeat('x',300)),'sugestao_alerta',repeat('a',400),'extra','ignorado'),null);
reset role;
select pg_temp.exige(pg_temp.estado((select r->>'relato' from reserva2))='done','concluído');
select pg_temp.exige((select d->>'resumo'='Cão caramelo perdido na Rua das Flores.' and d->>'urgencia'='Média' and jsonb_array_length(d->'observacoes')=2
 and length(d->'observacoes'->>1)=200 and length(d->>'sugestao_alerta')=300 and not d ? 'extra' and d->>'modelo'='claude-opus-5-5' and d->>'revisado_em' is not null
 from (select pg_temp.dados('relatos',(select r->>'relato' from reserva2))->'revisao_ia' d) x),'gravado limpo e limitado');

-- Esgotadas as tentativas, falha; relato que saiu da triagem não é revisado.
update wa.revisoes set next_attempt_at=now() where state='pending';
update wa.revisoes set attempt=2 where state='pending';
set local role service_role;
create temp table reserva3 as select public.ma_wa_revisao_reservar() r;
select public.ma_wa_revisao_resultado((select r->>'municipio' from reserva3),(select r->>'relato' from reserva3),(select (r->>'lease')::uuid from reserva3),null,'rate_limit');
reset role;
select pg_temp.exige((select state='failed' and error_code='rate_limit' from wa.revisoes where relato_id=(select r->>'relato' from reserva3)),'terceira falha encerra');
insert into wa.revisoes(municipio_id,relato_id) values('maringa','r-ajuda');
update public.ma_cadastros set dados=dados||'{"status":"Arquivado"}' where colecao='relatos' and id='r-ajuda';
set local role service_role;
select pg_temp.exige(public.ma_wa_revisao_reservar() is null,'fora da triagem não sai');
reset role;
select pg_temp.exige(pg_temp.estado('r-ajuda')='expired','fora da triagem expira');

-- Painel do alerta traz a sugestão do relato de origem enquanto não há alerta.
update public.ma_cadastros set dados=dados||jsonb_build_object('revisao_ia',jsonb_build_object('sugestao_alerta','Cão caramelo, coleira azul, perto da Rua das Flores.'))
 where colecao='relatos' and id='r-perdido';
set local role authenticated;select pg_temp.como('61');
select pg_temp.gravar('incidentes','i-rev',jsonb_build_object('tipo_id','animal-perdido','evento_id','protecao-animal-rotina','bairro_id','b-rev','endereco','Rua das Flores, 10',
 'quando','2026-11-08T12:00:00Z','gravidade','2','responsabilidade','publica','lat','-23.45','lng','-51.95','status','Confirmada','origem_relato','r-perdido'));
select pg_temp.exige(public.ma_envio_painel('maringa','incidentes','i-rev')->>'sugestao'='Cão caramelo, coleira azul, perto da Rua das Flores.'
 and (public.ma_envio_painel('maringa','incidentes','i-rev')->>'tem_foto')::boolean,'sugestão no painel');
select public.ma_alerta_aprovar('maringa','i-rev','Cão caramelo perdido.');
select pg_temp.exige(public.ma_envio_painel('maringa','incidentes','i-rev')->'sugestao'='null'::jsonb,'com alerta, sem sugestão');
rollback;
