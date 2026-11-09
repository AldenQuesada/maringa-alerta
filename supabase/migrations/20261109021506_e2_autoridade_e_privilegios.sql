begin;
-- Revogar enquanto a autoridade do proprietário está ativa, sem depender de superuser.
grant ma_escritor to current_user;
set local role ma_escritor;
revoke all on function private.ma_salvar_catalogo_territorial(text,jsonb,bigint) from public,anon,service_role;
grant execute on function private.ma_salvar_catalogo_territorial(text,jsonb,bigint) to authenticated;
reset role;
revoke ma_escritor from current_user;

-- Privilégios futuros não podem reabrir escrita, TRUNCATE, TRIGGER ou EXECUTE público.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public,private,wa,territorio
 revoke all on functions from anon,authenticated,service_role;
alter default privileges for role postgres in schema public,private,wa,territorio
 revoke all on tables from public,anon,authenticated,service_role;
alter default privileges for role postgres in schema public,private,wa,territorio
 revoke all on sequences from public,anon,authenticated,service_role;
revoke create on schema public,private,wa,territorio from public,anon,authenticated,service_role;
do $$declare obj record;begin
 for obj in select c.oid::regclass as nome from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p','v') and (n.nspname in ('private','wa','territorio') or (n.nspname='public' and c.relname like 'ma_%')) loop
  execute format('revoke all on %s from public,anon,service_role',obj.nome);
  execute format('revoke insert,update,delete,truncate,references,trigger,maintain on %s from authenticated',obj.nome);
 end loop;
end$$;

-- A função de negócio não herda mais os poderes gerais do usuário de migração.
create role ma_gestor_acessos nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
grant ma_gestor_acessos to current_user;
grant usage on schema public,private to ma_gestor_acessos;
grant select on public.ma_prefeituras,public.ma_configuracao,private.ma_permissoes,private.ma_admins to ma_gestor_acessos;
grant select,insert,update on public.ma_cadastros,public.ma_vinculos,private.ma_colaboradores_acesso,private.ma_acessos_envios to ma_gestor_acessos;
create policy gestor_prefeituras on public.ma_prefeituras for select to ma_gestor_acessos using(true);
create policy gestor_configuracao on public.ma_configuracao for select to ma_gestor_acessos using(true);
create policy gestor_permissoes on private.ma_permissoes for select to ma_gestor_acessos using(true);
create policy gestor_admins on private.ma_admins for select to ma_gestor_acessos using(true);
create policy gestor_cadastros_leitura on public.ma_cadastros for select to ma_gestor_acessos using(true);
create policy gestor_pessoas_novas on public.ma_cadastros for insert to ma_gestor_acessos with check(colecao='usuarios');
create policy gestor_pessoas_edicao on public.ma_cadastros for update to ma_gestor_acessos using(colecao='usuarios') with check(colecao='usuarios');
create policy gestor_vinculos on public.ma_vinculos for all to ma_gestor_acessos using(true) with check(true);
create policy gestor_colaboradores on private.ma_colaboradores_acesso for all to ma_gestor_acessos using(true) with check(true);
create policy gestor_envios on private.ma_acessos_envios for all to ma_gestor_acessos using(true) with check(true);
-- Projeção privada deliberadamente executada como postgres: nunca expõe hashes de senha.
-- O projeto hospedado permite a postgres ler Auth, mas não conceder seus privilégios.
create view private.ma_contas_acesso with (security_barrier=true) as
 select id,email,email_confirmed_at,coalesce(encrypted_password,'')<>'' as tem_senha from auth.users;
revoke all on private.ma_contas_acesso from public,anon,authenticated,service_role,ma_escritor;
grant select on private.ma_contas_acesso to ma_gestor_acessos;
grant execute on function private.ma_identidade(),private.ma_admin(),private.ma_acesso(text,boolean),
 private.ma_gerencia_colaboradores(text),private.ma_exigir_admin(),private.ma_definir_vinculo_legado(text,text,text,text) to ma_gestor_acessos;

create or replace function private.ma_colaboradores_contexto(municipio text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 return jsonb_build_object('municipio',municipio,'papeis',jsonb_build_array('admin','operador','leitor'),
 'colecoes',(select jsonb_agg(colecao order by colecao) from private.ma_permissoes where papel='admin' and ler and colecao<>'prefeituras'),
 'colaboradores',(select coalesce(jsonb_agg(jsonb_build_object('dados',c.dados,'versao',c.versao,'acesso',case when a.id is not null then to_jsonb(a)-'user_id'-'colecao' else null end,
 'envio',(select jsonb_build_object('id',e.id,'estado',e.estado,'criado_em',e.criado_em,'expira_em',e.expira_em,'revogado',e.revogado_em is not null,'ativado',e.aceito_em is not null) from private.ma_acessos_envios e where e.municipio_id=c.municipio_id and e.colaborador_id=c.id order by e.criado_em desc limit 1)) order by c.dados->>'nome'),'[]')
 from public.ma_cadastros c left join private.ma_colaboradores_acesso a on a.municipio_id=c.municipio_id and a.id=c.id where c.municipio_id=municipio and c.colecao='usuarios' and c.arquivado_em is null),
 'equipes',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',dados->>'nome') order by dados->>'nome'),'[]') from public.ma_cadastros where municipio_id=municipio and colecao='equipes' and arquivado_em is null));
end;$$;

create or replace function private.ma_colaborador_salvar(municipio text,identificador text,ficha jsonb,acesso jsonb,versao_esperada bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare anterior public.ma_cadastros; salvo public.ma_cadastros; vinc private.ma_colaboradores_acesso; dados_novos jsonb;
 correio text; papel_novo text; situacao_nova text; permitidas text[]; campo text; horario jsonb;
begin
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(municipio));
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Acesso administrativo revogado' using errcode='42501';end if;
 if octet_length(coalesce(acesso::text,''))>10000 or octet_length(coalesce(ficha::text,''))>100000 or identificador is null or length(identificador) not between 1 and 100 or jsonb_typeof(ficha) is distinct from 'object' or jsonb_typeof(acesso) is distinct from 'object' then raise exception 'Ficha inválida' using errcode='22023';end if;
 select * into anterior from public.ma_cadastros where municipio_id=municipio and colecao='usuarios' and id=identificador for update;
 if anterior.versao is distinct from versao_esperada then raise exception 'Ficha alterada. Atualize antes de salvar.' using errcode='40001';end if;
 dados_novos:=private.ma_colaborador_validar_ficha(coalesce(anterior.dados,'{}')||ficha||jsonb_build_object('id',identificador,'municipioId',municipio),anterior.dados);
 for campo in select unnest(array['nome','email','telefone','endereco','bairro','cargo','funcao']) loop
  if jsonb_typeof(dados_novos->campo) is distinct from 'string' or length(btrim(dados_novos->>campo)) not between 1 and 500 then raise exception 'Preencha o campo %',campo using errcode='23514';end if;
 end loop;
 correio:=lower(btrim(dados_novos->>'email')); dados_novos:=jsonb_set(dados_novos,'{email}',to_jsonb(correio));
 if exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao='usuarios' and id<>identificador and lower(btrim(dados->>'email'))=correio) then raise exception 'Esta pessoa já tem cadastro. Edite a ficha existente.' using errcode='23514';end if;
 if length(correio)>254 or correio !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido' using errcode='23514';end if;
 if dados_novos->>'funcao' not in ('admin','responsavel','substituto','coordenador','operador') then raise exception 'Função inválida' using errcode='23514';end if;
 if jsonb_typeof(dados_novos->'horarios') is distinct from 'array' or jsonb_array_length(dados_novos->'horarios')>21 then raise exception 'Informe os horários de atuação' using errcode='23514';end if;
 for horario in select value from jsonb_array_elements(dados_novos->'horarios') loop
  if jsonb_typeof(horario) is distinct from 'object' or coalesce(horario->>'dia','') !~ '^[0-6]$' or coalesce(horario->>'inicio','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(horario->>'fim','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or horario->>'inicio'>=horario->>'fim' then raise exception 'Horário inválido; divida plantões que atravessam a meia-noite.' using errcode='23514';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(dados_novos->'horarios') with ordinality x(a,i),jsonb_array_elements(dados_novos->'horarios') with ordinality y(b,j) where i<j and a->>'dia'=b->>'dia' and a->>'inicio'<b->>'fim' and b->>'inicio'<a->>'fim') then raise exception 'Horários sobrepostos' using errcode='23514';end if;
 for campo in select unnest(array['equipe_id','responsavel_id','substituto_id']) loop
  if nullif(dados_novos->>campo,'') is not null then
   if campo<>'equipe_id' and dados_novos->>campo=identificador then raise exception 'Selecione outra pessoa como responsável ou substituto' using errcode='23514';end if;
   if not exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao=case when campo='equipe_id' then 'equipes' else 'usuarios' end and id=dados_novos->>campo and arquivado_em is null) then raise exception 'Referência fora deste município' using errcode='23514';end if;
  end if;
 end loop;
 if exists(with recursive chefia(id) as (
  select nullif(dados_novos->>'responsavel_id','')
  union
  select nullif(c.dados->>'responsavel_id','') from public.ma_cadastros c join chefia r on c.id=r.id
   where c.municipio_id=municipio and c.colecao='usuarios'
 ) select 1 from chefia where id=identificador) then raise exception 'A relação de responsáveis não pode formar um círculo.' using errcode='23514';end if;
 papel_novo:=acesso->>'papel'; situacao_nova:=acesso->>'situacao';
 if papel_novo is null or papel_novo not in ('admin','operador','leitor') or situacao_nova is null or situacao_nova not in ('pendente','ativo','suspenso') or jsonb_typeof(acesso->'colecoes') is distinct from 'array' then raise exception 'Permissões inválidas' using errcode='23514';end if;
 select coalesce(array_agg(distinct value),'{}') into permitidas from jsonb_array_elements_text(acesso->'colecoes');
 if exists(select 1 from unnest(permitidas) x where not exists(select 1 from private.ma_permissoes p where p.papel='admin' and p.colecao=x and p.ler and p.colecao<>'prefeituras')) then raise exception 'Cadastro não permitido para esse papel' using errcode='23514';end if;
 select * into vinc from private.ma_colaboradores_acesso where municipio_id=municipio and id=identificador for update;
 if vinc.user_id is not null and vinc.email<>correio then raise exception 'E-mail de conta já ativada não pode ser trocado pela ficha.' using errcode='23514';end if;
 if vinc.user_id=private.ma_identidade() and (papel_novo<>'admin' or situacao_nova<>'ativo') then raise exception 'Peça a outro administrador para alterar seu próprio acesso.' using errcode='23514';end if;
 if vinc.user_id is null and situacao_nova='ativo' then situacao_nova:='pendente';end if;
 dados_novos:=jsonb_set(dados_novos,'{status}',to_jsonb(case when situacao_nova='suspenso' then 'Inativo' else 'Ativo' end));
 if anterior.id is null then
  insert into public.ma_cadastros(municipio_id,colecao,id,dados) values(municipio,'usuarios',identificador,dados_novos) returning * into salvo;
 else
  update public.ma_cadastros set dados=dados_novos where municipio_id=municipio and colecao='usuarios' and id=identificador returning * into salvo;
 end if;
 insert into private.ma_colaboradores_acesso(municipio_id,id,email,papel,colecoes,situacao)
 values(municipio,identificador,correio,papel_novo,permitidas,situacao_nova)
 on conflict(municipio_id,id) do update set email=excluded.email,papel=excluded.papel,colecoes=excluded.colecoes,situacao=excluded.situacao;
 if vinc.user_id is not null then update public.ma_vinculos set papel=papel_novo where municipio_id=municipio and user_id=vinc.user_id;end if;
 -- Qualquer mudança na ficha exige novo envio; um link não autoriza versão antiga de permissões.
 update private.ma_acessos_envios set revogado_em=clock_timestamp() where municipio_id=municipio and colaborador_id=identificador and revogado_em is null and aceito_em is null;
 return jsonb_build_object('dados',salvo.dados,'versao',salvo.versao,'situacao',situacao_nova);
end;$$;

create or replace function private.ma_acesso_preparar(municipio text,colaborador text,versao_esperada bigint,comando uuid,hash_token text,ator uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.ma_colaboradores_acesso; c public.ma_cadastros; e private.ma_acessos_envios;
begin
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(municipio));
 if ator is null or not exists(select 1 from private.ma_contas_acesso where id=ator and email_confirmed_at is not null)
  or not exists(select 1 from public.ma_prefeituras where id=municipio and dados->>'status'<>'suspensa')
  or not (exists(select 1 from private.ma_admins where user_id=ator) or exists(
   select 1 from public.ma_vinculos v left join private.ma_colaboradores_acesso gestor on gestor.municipio_id=v.municipio_id and gestor.user_id=v.user_id
   where v.municipio_id=municipio and v.user_id=ator and v.papel='admin' and (gestor.id is null or gestor.situacao='ativo')
  )) then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 select * into a from private.ma_colaboradores_acesso where municipio_id=municipio and id=colaborador for update;
 select * into c from public.ma_cadastros where municipio_id=municipio and colecao='usuarios' and id=colaborador;
 if a.id is null or a.situacao='suspenso' or c.arquivado_em is not null or c.versao is distinct from versao_esperada or c.dados->>'email' is distinct from a.email then raise exception 'Salve e confira a ficha antes de enviar o acesso.' using errcode='23514';end if;
 select * into e from private.ma_acessos_envios where id=comando;
 if e.id is not null then
  if e.municipio_id<>municipio or e.colaborador_id<>colaborador or e.versao<>versao_esperada or e.token_hash<>hash_token or e.revogado_em is not null or e.expira_em<=clock_timestamp() or (e.estado<>'enviado' and e.criado_em<clock_timestamp()-interval '23 hours') then raise exception 'Comando de envio inválido. Prepare um novo envio.' using errcode='23514';end if;
 else
  if exists(select 1 from private.ma_acessos_envios where municipio_id=municipio and colaborador_id=colaborador and criado_em>clock_timestamp()-interval '60 seconds') then raise exception 'Aguarde um minuto antes de enviar um novo link.' using errcode='23514';end if;
  update private.ma_acessos_envios set revogado_em=clock_timestamp() where municipio_id=municipio and colaborador_id=colaborador and aceito_em is null and revogado_em is null;
  insert into private.ma_acessos_envios(id,municipio_id,colaborador_id,email,token_hash,versao,solicitado_por,senha_inicial) values(comando,municipio,colaborador,a.email,hash_token,c.versao,ator,
   not exists(select 1 from private.ma_contas_acesso where lower(email)=a.email and tem_senha)
   or exists(select 1 from private.ma_acessos_envios where email=a.email and senha_inicial)) returning * into e;
 end if;
 return jsonb_build_object('id',e.id,'email',e.email,'nome',c.dados->>'nome','estado',e.estado,'expira_em',e.expira_em);
end;$$;

create or replace function private.ma_acesso_consultar(hash_token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare e private.ma_acessos_envios; a private.ma_colaboradores_acesso; c public.ma_cadastros; conta uuid; confirmado boolean; tem_senha boolean;
begin
 select * into e from private.ma_acessos_envios where token_hash=hash_token;
 if e.id is null or e.revogado_em is not null or e.expira_em<=clock_timestamp() then raise exception 'Link inválido ou expirado. Solicite novo envio ao administrador.' using errcode='22023';end if;
 select * into a from private.ma_colaboradores_acesso where municipio_id=e.municipio_id and id=e.colaborador_id;
 select * into c from public.ma_cadastros where municipio_id=e.municipio_id and colecao='usuarios' and id=e.colaborador_id;
 if a.situacao='suspenso' or a.email<>e.email or c.arquivado_em is not null or (e.aceito_em is null and c.versao<>e.versao) or not exists(select 1 from public.ma_prefeituras where id=e.municipio_id and dados->>'status'<>'suspensa') then raise exception 'Acesso indisponível. Consulte o administrador.' using errcode='42501';end if;
 select u.id,u.email_confirmed_at is not null,u.tem_senha into conta,confirmado,tem_senha from private.ma_contas_acesso u where lower(u.email)=e.email;
 return jsonb_build_object('email',e.email,'nome',c.dados->>'nome','conta_existente',conta is not null,'conta_id',conta,'senha_definida',coalesce(tem_senha,false) and not e.senha_inicial,'email_confirmado',confirmado,'ativado',e.aceito_em is not null,'minimo_senha',12);
end;$$;

create or replace function private.ma_acesso_ativar(hash_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e private.ma_acessos_envios; a private.ma_colaboradores_acesso; correio text;
begin
 if private.ma_identidade() is null then raise exception 'Entre com sua senha para ativar.' using errcode='42501';end if;
 select * into e from private.ma_acessos_envios where token_hash=hash_token;
 if e.id is null then raise exception 'Link inválido' using errcode='22023';end if;
 -- A senha é da conta: serializar ativações entre municípios antes dos bloqueios locais.
 perform pg_advisory_xact_lock(hashtext('ma_primeira_senha'),hashtext(e.email));
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(e.municipio_id));
 select * into e from private.ma_acessos_envios where id=e.id for update;
 perform private.ma_acesso_consultar(hash_token);
 select lower(email) into correio from private.ma_contas_acesso where id=private.ma_identidade() and email_confirmed_at is not null;
 if correio is distinct from e.email then raise exception 'Entre com a conta do e-mail cadastrado.' using errcode='42501';end if;
 if not exists(select 1 from private.ma_contas_acesso where id=private.ma_identidade() and tem_senha) then raise exception 'Defina sua senha antes de ativar o acesso.' using errcode='42501';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->'amr','[]'::jsonb)) metodo where metodo->>'method'='password') then raise exception 'Entre com sua senha para ativar o acesso.' using errcode='42501';end if;
 update private.ma_acessos_envios set senha_inicial=false where email=e.email and senha_inicial;
 if e.aceito_em is not null then
  if e.aceito_por<>private.ma_identidade() then raise exception 'Link já utilizado' using errcode='42501';end if;
  return jsonb_build_object('municipio',e.municipio_id,'repetido',true);
 end if;
 select * into a from private.ma_colaboradores_acesso where municipio_id=e.municipio_id and id=e.colaborador_id for update;
 if a.user_id is not null and a.user_id<>private.ma_identidade() then raise exception 'Ficha vinculada a outra conta' using errcode='42501';end if;
 if exists(select 1 from private.ma_colaboradores_acesso where municipio_id=e.municipio_id and user_id=private.ma_identidade() and id<>e.colaborador_id) then raise exception 'Esta conta já pertence a outra ficha municipal' using errcode='23514';end if;
 -- Vínculo anterior compatível pode ser associado à ficha; jamais é promovido pelo token de outra identidade.
 insert into public.ma_vinculos(municipio_id,user_id,papel) values(e.municipio_id,private.ma_identidade(),a.papel) on conflict(municipio_id,user_id) do update set papel=excluded.papel;
 update private.ma_colaboradores_acesso set user_id=private.ma_identidade(),situacao='ativo' where municipio_id=e.municipio_id and id=e.colaborador_id;
 update private.ma_acessos_envios set aceito_por=private.ma_identidade(),aceito_em=clock_timestamp() where id=e.id;
 return jsonb_build_object('municipio',e.municipio_id,'repetido',false);
end;$$;

create or replace function private.ma_acesso_reservar_envio(comando uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e private.ma_acessos_envios; chave uuid;
begin
 select * into e from private.ma_acessos_envios where id=comando for update;
 if e.id is null then raise exception 'Envio inexistente';end if;
 perform private.ma_acesso_consultar(e.token_hash);
 if e.estado='enviado' then return jsonb_build_object('enviar',false,'estado','enviado');end if;
 if e.reservado_ate>clock_timestamp() then return jsonb_build_object('enviar',false,'estado','aguardando');end if;
 chave:=gen_random_uuid();
 update private.ma_acessos_envios set tentativa=chave,reservado_ate=clock_timestamp()+interval '90 seconds' where id=comando;
 return jsonb_build_object('enviar',true,'tentativa',chave);
end;$$;

create or replace function private.ma_acesso_finalizar_envio(comando uuid,tentativa_atual uuid,resultado text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if resultado is null or resultado not in ('enviado','falhou','incerto') then raise exception 'Resultado inválido';end if;
 update private.ma_acessos_envios set estado=case when resultado='enviado' then 'enviado' else 'falhou' end,
  provedor_id=case when resultado='enviado' then 'supabase-auth:'||tentativa_atual::text else null end,
  reservado_ate=case when resultado='incerto' then reservado_ate else null end
 where id=comando and tentativa=tentativa_atual and estado<>'enviado';
end;$$;

create or replace function private.ma_colaborador_validar_ficha(ficha jsonb,anterior jsonb default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare contrato jsonb;campo text;regra jsonb;valor jsonb;texto text;resultado jsonb:=ficha;nascimento date;
begin
 select documento into contrato from public.ma_configuracao where id='colaboradores';
 if contrato is null or jsonb_typeof(ficha) is distinct from 'object' or octet_length(ficha::text)>100000 then
  raise exception 'Ficha inválida ou muito grande.' using errcode='23514';end if;
 for campo,valor in select key,value from jsonb_each(ficha) loop
  -- Extensões legadas são preservadas, mas não podem ser criadas ou alteradas por este comando.
  if not (contrato->'campos' ? campo) and (anterior is null or not anterior ? campo or anterior->campo is distinct from valor) then
   raise exception 'Campo não permitido no cadastro: %',campo using errcode='23514';end if;
 end loop;
 for campo,regra in select key,value from jsonb_each(contrato->'campos') loop
  valor:=ficha->campo;
  if not ficha ? campo then
   if (regra->>'obrigatorio')::boolean then raise exception 'Preencha o campo %',campo using errcode='23514';end if;
   continue;
  end if;
  if regra->>'tipo'='texto' then
   if jsonb_typeof(valor) is distinct from 'string' then raise exception 'Formato inválido no campo %',campo using errcode='23514';end if;
   texto:=btrim(ficha->>campo);
   if length(texto)>(regra->>'maximo')::integer or ((regra->>'obrigatorio')::boolean and texto='') then
    raise exception 'Preencha corretamente o campo %',campo using errcode='23514';end if;
   resultado:=jsonb_set(resultado,array[campo],to_jsonb(texto));
  else
   if jsonb_typeof(valor) is distinct from 'array' or jsonb_array_length(valor)>(regra->>'maximo')::integer then
    raise exception 'Lista inválida no campo %',campo using errcode='23514';end if;
   if regra->>'tipo'='funcoes' and exists(select 1 from jsonb_array_elements(valor) x where jsonb_typeof(x)<>'string' or not contrato->'funcoes' @> jsonb_build_array(x)) then
    raise exception 'Funções de atuação inválidas.' using errcode='23514';end if;
  end if;
 end loop;
 texto:=lower(resultado->>'email');
 if texto !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido.' using errcode='23514';end if;
 resultado:=jsonb_set(resultado,'{email}',to_jsonb(texto));
 texto:=resultado->>'telefone';
 if texto !~ '^\+?[0-9 ()-]+$' or length(regexp_replace(texto,'[^0-9]','','g')) not between 10 and 15 then
  raise exception 'Informe um telefone válido, com DDD.' using errcode='23514';end if;
 resultado:=jsonb_set(resultado,'{telefone}',to_jsonb(regexp_replace(texto,'[^0-9]','','g')));
 texto:=coalesce(resultado->>'cep','');
 if texto<>'' then
  if texto !~ '^[0-9]{5}-?[0-9]{3}$' then raise exception 'CEP inválido.' using errcode='23514';end if;
  resultado:=jsonb_set(resultado,'{cep}',to_jsonb(replace(texto,'-','')));
 end if;
 texto:=coalesce(resultado->>'nascimento','');
 if texto<>'' then
  begin
   if texto !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format;end if;
   nascimento:=texto::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Data de nascimento inválida.' using errcode='23514';end;
  if nascimento>current_date then raise exception 'Nascimento não pode estar no futuro.' using errcode='23514';end if;
 end if;
 if not contrato->'funcoes' @> jsonb_build_array(resultado->'funcao') then raise exception 'Função inválida.' using errcode='23514';end if;
 return resultado;
end;$$;

create or replace function private.ma_definir_vinculo(municipio text,email_usuario text,papel_novo text,papel_esperado text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.ma_exigir_admin();
 if exists(select 1 from private.ma_colaboradores_acesso where municipio_id=municipio and email=lower(btrim(email_usuario))) then raise exception 'Edite as permissões na ficha completa do colaborador.' using errcode='23514';end if;
 perform private.ma_definir_vinculo_legado(municipio,email_usuario,papel_novo,papel_esperado);
end;$$;

grant create on schema private to ma_gestor_acessos;
do $$declare f record;begin
 for f in select p.oid::regprocedure as nome from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proname=any(array['ma_colaboradores_contexto','ma_colaborador_salvar','ma_acesso_preparar','ma_acesso_consultar','ma_acesso_ativar','ma_acesso_reservar_envio','ma_acesso_finalizar_envio','ma_colaborador_validar_ficha','ma_definir_vinculo']) loop
  execute format('alter function %s owner to ma_gestor_acessos',f.nome);
 end loop;
end$$;
alter default privileges for role ma_gestor_acessos revoke execute on functions from public;
revoke create on schema private from ma_gestor_acessos;
revoke ma_gestor_acessos from current_user;
-- Asserções efetivas abortam a migração se um REVOKE tiver produzido apenas WARNING.
do $$begin
 if has_function_privilege('anon','private.ma_salvar_catalogo_territorial(text,jsonb,bigint)','execute')
 or has_function_privilege('service_role','private.ma_salvar_catalogo_territorial(text,jsonb,bigint)','execute')
 or not has_function_privilege('authenticated','private.ma_salvar_catalogo_territorial(text,jsonb,bigint)','execute') then
  raise exception 'ACL do catálogo territorial divergente';end if;
 if exists(select 1 from pg_roles where rolname='ma_gestor_acessos' and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) then
  raise exception 'Executor de acesso com privilégio excessivo';end if;
 if pg_has_role('authenticated','ma_gestor_acessos','MEMBER') or pg_has_role('service_role','ma_gestor_acessos','MEMBER')
 or exists(select 1 from pg_auth_members where member='postgres'::regrole and roleid in ('ma_gestor_acessos'::regrole,'ma_escritor'::regrole) and (set_option or inherit_option)) then
  raise exception 'Associação temporária ou indevida permaneceu ativa';end if;
end$$;
notify pgrst,'reload schema';
commit;
