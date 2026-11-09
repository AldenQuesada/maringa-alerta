-- Exclusivamente PostgreSQL descartável. Nenhuma fixture deve ir ao Supabase.
begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000021','operacoes@invalid.example',now()),('00000000-0000-4000-8000-000000000022','leitura@invalid.example',now());
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000021','admin'),('maringa','00000000-0000-4000-8000-000000000022','leitor');
create function pg_temp.gravar(c text,i text,d jsonb,v bigint default null) returns jsonb language sql as $$ select public.ma_aplicar_alteracoes(jsonb_build_array(jsonb_build_object('colecao',c,'id',i,'municipio_id','maringa','operacao',case when v is null then 'inserir' else 'atualizar' end,'versao',v,'dados',d||jsonb_build_object('id',i,'municipioId','maringa')))) $$;
grant execute on function pg_temp.gravar(text,text,jsonb,bigint) to authenticated,anon,service_role;
create function pg_temp.rejeita(comando text,codigo text default '23514') returns void language plpgsql as $$
declare rejeitado boolean:=false;
begin
 begin execute comando;exception when others then if sqlstate<>codigo then raise;end if;rejeitado:=true;end;
 if not rejeitado then raise exception 'Operação proibida foi aceita: %',comando;end if;
end$$;
grant execute on function pg_temp.rejeita(text,text) to authenticated,anon,service_role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',true);
do $$begin
 if public.ma_minhas_capacidades()#>>'{maringa,bases,gravar}'<>'true' then raise exception 'Capacidades admin incorretas';end if;
 if public.ma_minhas_capacidades()#>>'{maringa,prefeituras,gravar}'<>'false' then raise exception 'Admin municipal virou admin da plataforma';end if;
end$$;
select pg_temp.rejeita('select public.ma_aplicar_alteracoes(null)');
select pg_temp.rejeita('select private.ma_gravar_lote(''[]'')','42501');
select pg_temp.rejeita($q$select pg_temp.gravar('estoques','negativo','{"nome":"Local","quantidade":-1}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('equipamentos','fracao','{"nome":"Local","quantidade":1.5}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('estoques','nan','{"nome":"Local","quantidade":"NaN"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('abrigos','vagas','{"nome":"Local","capacidade":10,"disponiveis":11}')$q$);
select pg_temp.gravar('estoques','saldo','{"nome":"Local","quantidade":2.5}');
select pg_temp.gravar('voluntarios','v1','{"nome":"Fixture local","tipo_pessoa":"FÍSICA","endereco":"Endereço de teste local","telefone":"44999990001","bairro":"Bairro local","zona":"Zona local","ajudas":["FORNECER ALIMENTAÇÃO"],"disponibilidade":"Disponível"}');
select pg_temp.rejeita($q$select pg_temp.gravar('solicitacoes','critico','{"nome":"Local","telefone":"44999990002","endereco":"Local","necessidade":"Alimentação","urgencia":"Crítica","status":"Encaminhada","atribuido_a":"v1"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('solicitacoes','incompativel','{"nome":"Local","telefone":"44999990002","endereco":"Local","necessidade":"Transporte","status":"Encaminhada","atribuido_a":"v1"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('solicitacoes','mesma-pessoa','{"nome":"Local","telefone":"44999990001","endereco":"Local","necessidade":"Alimentação","status":"Encaminhada","atribuido_a":"v1"}')$q$);
select pg_temp.rejeita($q$select pg_temp.gravar('solicitacoes','final','{"nome":"Local","telefone":"44999990002","endereco":"Local","necessidade":"Alimentação","status":"Atendida","atribuido_a":"v1"}')$q$);
select pg_temp.gravar('solicitacoes','p1','{"nome":"Local","telefone":"44999990002","endereco":"Local","necessidade":"Alimentação","status":"Encaminhada","atribuido_a":"v1"}');
select pg_temp.rejeita(format('select pg_temp.gravar(''solicitacoes'',''p1'',%L::jsonb,1)',dados||'{"status":"Atendida"}')) from public.ma_cadastros where id='p1';
select pg_temp.gravar('solicitacoes','p1',dados||'{"status":"Cheguei"}',versao) from public.ma_cadastros where id='p1';
select pg_temp.gravar('solicitacoes','p1',dados||'{"status":"Atendida"}',versao) from public.ma_cadastros where id='p1';
select pg_temp.rejeita(format('select pg_temp.gravar(''solicitacoes'',''p1'',%L::jsonb,3)',dados||'{"status":"Aguardando"}')) from public.ma_cadastros where id='p1';
select pg_temp.gravar('bairros','bairro-local','{"nome":"Bairro local","verificacao":"Validado","geojson":{"type":"Polygon","coordinates":[[[0,0],[0,2],[2,2],[2,0],[0,0]]]}}');
select pg_temp.rejeita(format('select pg_temp.gravar(''voluntarios'',''v1'',%L::jsonb,1)',dados||'{"checkin_status":"presente","checkin_bairro":"Bairro local","checkin_lat":20,"checkin_lng":20,"checkin_precisao":10}')) from public.ma_cadastros where id='v1';
select pg_temp.rejeita(format('select pg_temp.gravar(''voluntarios'',''v1'',%L::jsonb,1)',dados||'{"checkin_status":"presente","checkin_bairro":"Bairro local","checkin_lat":1,"checkin_lng":1,"checkin_precisao":101}')) from public.ma_cadastros where id='v1';
select pg_temp.gravar('voluntarios','v1',dados||'{"checkin_status":"presente","checkin_bairro":"Bairro local","checkin_lat":1,"checkin_lng":1,"checkin_precisao":10,"checkin_em":"1900-01-01"}',versao) from public.ma_cadastros where id='v1';
do $$begin if exists(select 1 from public.ma_cadastros where id='v1' and ((dados->>'checkin_em')::timestamptz<now()-interval '1 minute' or dados->>'checkin_tipo'<>'autodeclarado_validado_servidor')) then raise exception 'Servidor aceitou horário ou tipo inventado';end if;end$$;
select pg_temp.gravar('voluntarios','v1',dados||'{"checkin_status":"finalizado"}',versao) from public.ma_cadastros where id='v1';
select pg_temp.rejeita($q$select pg_temp.gravar('mobilizacoes','sem-zona','{"nome":"Local","zona":"Ausente","status":"Preparada"}')$q$);
select pg_temp.gravar('zonas','zona-local','{"nome":"Zona local"}');
select pg_temp.gravar('mobilizacoes','mobilizacao','{"nome":"Local","zona":"Zona local","status":"Preparada","destinatarios":"[{\"nome\":\"INVENTADO\"}]"}');
do $$begin if (select (dados->>'destinatarios')::jsonb->0->>'id' from public.ma_cadastros where id='mobilizacao') is distinct from 'v1' then raise exception 'Destinatário não calculado pelo banco';end if;end$$;
select pg_temp.rejeita($q$select pg_temp.gravar('apoios','apoio','{"nome":"Local","destino":"Eu mesmo","destino_id":"maringa","recurso":"Água","status":"Preparada"}')$q$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000022',true);
do $$begin
 if public.ma_minhas_capacidades()#>>'{maringa,bases,gravar}'<>'false' or public.ma_minhas_capacidades()#>>'{maringa,bases,ler}'<>'true' then raise exception 'Capacidades leitor incorretas';end if;
end$$;
select pg_temp.rejeita($q$select pg_temp.gravar('bases','b','{"nome":"Local"}')$q$,'42501');
reset role;
delete from public.ma_vinculos where user_id='00000000-0000-4000-8000-000000000021';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',true);
do $$begin if public.ma_minhas_capacidades()<>'{}' then raise exception 'Capacidades sobreviveram à revogação';end if;end$$;
select pg_temp.rejeita($q$select pg_temp.gravar('bases','b','{"nome":"Local"}')$q$,'42501');
rollback;
