begin;
-- A pessoa permanece em ma_cadastros/usuarios; esta tabela guarda só sua autoridade de acesso.
create table private.ma_colaboradores_acesso (
 municipio_id text not null,
 colecao text not null default 'usuarios' check(colecao='usuarios'),
 id text not null,
 email text not null check(email=lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 user_id uuid references auth.users(id) on delete restrict,
 papel text not null check(papel in ('admin','operador','leitor')),
 colecoes text[] not null,
 situacao text not null check(situacao in ('pendente','ativo','suspenso')),
 primary key(municipio_id,id),
 unique(municipio_id,email), unique(municipio_id,user_id),
 foreign key(municipio_id,colecao,id) references public.ma_cadastros(municipio_id,colecao,id) on delete restrict
);
create index ma_colaboradores_usuario on private.ma_colaboradores_acesso(user_id,municipio_id);
alter table private.ma_colaboradores_acesso enable row level security;
revoke all on private.ma_colaboradores_acesso from public,anon,authenticated,ma_escritor;
create trigger ma_historico_colaborador after insert or update or delete on private.ma_colaboradores_acesso for each row execute function private.ma_registrar_historico();
create table private.ma_acessos_envios (
 id uuid primary key,
 municipio_id text not null,
 colaborador_id text not null,
 email text not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 versao bigint not null,
 criado_em timestamptz not null default clock_timestamp(),
 expira_em timestamptz not null default clock_timestamp()+interval '48 hours',
 revogado_em timestamptz,
 aceito_por uuid references auth.users(id) on delete restrict,
 aceito_em timestamptz,
 estado text not null default 'preparado' check(estado in ('preparado','enviado','falhou')),
 provedor_id text,
 solicitado_por uuid not null references auth.users(id) on delete restrict,
 foreign key(municipio_id,colaborador_id) references private.ma_colaboradores_acesso(municipio_id,id) on delete restrict
);
create index ma_acessos_colaborador on private.ma_acessos_envios(municipio_id,colaborador_id,criado_em desc);
create index ma_acessos_autor on private.ma_acessos_envios(solicitado_por);
create index ma_acessos_aceite on private.ma_acessos_envios(aceito_por);
alter table private.ma_acessos_envios enable row level security;
revoke all on private.ma_acessos_envios from public,anon,authenticated,ma_escritor;

create or replace function private.ma_acesso(municipio text,escrita boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.ma_vinculos v join public.ma_prefeituras m on m.id=v.municipio_id
  left join private.ma_colaboradores_acesso a on a.municipio_id=v.municipio_id and a.user_id=v.user_id
  where v.user_id=auth.uid() and v.municipio_id=municipio and m.dados->>'status'<>'suspensa'
    and (a.id is null or a.situacao='ativo') and (not escrita or v.papel in ('admin','operador')));
$$;
create or replace function private.ma_permitido(municipio text,colecao_alvo text,acao text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.ma_vinculos v join public.ma_prefeituras m on m.id=v.municipio_id
  left join private.ma_colaboradores_acesso a on a.municipio_id=v.municipio_id and a.user_id=v.user_id
  join private.ma_permissoes p on p.papel=case when a.id is null then v.papel else 'admin' end and p.colecao=colecao_alvo
  where v.user_id=auth.uid() and v.municipio_id=municipio and m.dados->>'status'<>'suspensa'
    and (a.id is null or (a.situacao='ativo' and (a.papel='admin' or colecao_alvo=any(a.colecoes))))
    and (a.id is null or acao='ler' or a.papel in ('admin','operador'))
    and case acao when 'ler' then p.ler when 'gravar' then p.gravar when 'excluir' then p.excluir else false end);
$$;
create function private.ma_gerencia_colaboradores(municipio text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ma_prefeituras where id=municipio and dados->>'status'<>'suspensa')
 and (private.ma_admin() or (private.ma_acesso(municipio) and exists(select 1 from public.ma_vinculos where municipio_id=municipio and user_id=auth.uid() and papel='admin')));
$$;
revoke all on function private.ma_gerencia_colaboradores(text) from public,anon;
grant execute on function private.ma_gerencia_colaboradores(text) to authenticated;

create function private.ma_colaboradores_contexto(municipio text) returns jsonb
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

create function private.ma_colaborador_salvar(municipio text,identificador text,ficha jsonb,acesso jsonb,versao_esperada bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare anterior public.ma_cadastros; salvo public.ma_cadastros; vinc private.ma_colaboradores_acesso; dados_novos jsonb;
 correio text; papel_novo text; situacao_nova text; permitidas text[]; campo text; horario jsonb;
begin
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(municipio));
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Acesso administrativo revogado' using errcode='42501';end if;
 if octet_length(coalesce(ficha::text,''))>100000 or identificador is null or length(identificador) not between 1 and 100 or jsonb_typeof(ficha) is distinct from 'object' or jsonb_typeof(acesso) is distinct from 'object' then raise exception 'Ficha inválida' using errcode='22023';end if;
 select * into anterior from public.ma_cadastros where municipio_id=municipio and colecao='usuarios' and id=identificador for update;
 if anterior.versao is distinct from versao_esperada then raise exception 'Ficha alterada. Atualize antes de salvar.' using errcode='40001';end if;
 dados_novos:=coalesce(anterior.dados,'{}')||ficha||jsonb_build_object('id',identificador,'municipioId',municipio);
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
 if vinc.user_id=auth.uid() and (papel_novo<>'admin' or situacao_nova<>'ativo') then raise exception 'Peça a outro administrador para alterar seu próprio acesso.' using errcode='23514';end if;
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

create function private.ma_colaborador_gerenciado(municipio text,pessoa text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.ma_colaboradores_acesso where municipio_id=municipio and id=pessoa);
$$;
revoke all on function private.ma_colaborador_gerenciado(text,text) from public,anon,authenticated;
grant execute on function private.ma_colaborador_gerenciado(text,text) to ma_escritor;
create function private.ma_colaborador_proteger_ficha() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='ma_escritor' and private.ma_colaborador_gerenciado(old.municipio_id,old.id) then raise exception 'Edite esta pessoa no cadastro completo de colaboradores.' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function private.ma_colaborador_proteger_ficha() from public,anon,authenticated,ma_escritor;
create trigger ma_proteger_colaborador before update on public.ma_cadastros for each row when (old.colecao='usuarios') execute function private.ma_colaborador_proteger_ficha();

create function private.ma_acesso_preparar(municipio text,colaborador text,versao_esperada bigint,comando uuid,hash_token text,ator uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.ma_colaboradores_acesso; c public.ma_cadastros; e private.ma_acessos_envios;
begin
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(municipio));
 if ator is null or not exists(select 1 from auth.users where id=ator and email_confirmed_at is not null)
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
  insert into private.ma_acessos_envios(id,municipio_id,colaborador_id,email,token_hash,versao,solicitado_por) values(comando,municipio,colaborador,a.email,hash_token,c.versao,ator) returning * into e;
 end if;
 return jsonb_build_object('id',e.id,'email',e.email,'nome',c.dados->>'nome','estado',e.estado,'expira_em',e.expira_em);
end;$$;

create function private.ma_acesso_consultar(hash_token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare e private.ma_acessos_envios; a private.ma_colaboradores_acesso; c public.ma_cadastros; conta uuid; confirmado boolean;
begin
 select * into e from private.ma_acessos_envios where token_hash=hash_token;
 if e.id is null or e.revogado_em is not null or e.expira_em<=clock_timestamp() then raise exception 'Link inválido ou expirado. Solicite novo envio ao administrador.' using errcode='22023';end if;
 select * into a from private.ma_colaboradores_acesso where municipio_id=e.municipio_id and id=e.colaborador_id;
 select * into c from public.ma_cadastros where municipio_id=e.municipio_id and colecao='usuarios' and id=e.colaborador_id;
 if a.situacao='suspenso' or a.email<>e.email or c.arquivado_em is not null or (e.aceito_em is null and c.versao<>e.versao) or not exists(select 1 from public.ma_prefeituras where id=e.municipio_id and dados->>'status'<>'suspensa') then raise exception 'Acesso indisponível. Consulte o administrador.' using errcode='42501';end if;
 select id,email_confirmed_at is not null into conta,confirmado from auth.users where lower(email)=e.email;
 return jsonb_build_object('email',e.email,'nome',c.dados->>'nome','conta_existente',conta is not null,'conta_id',conta,'email_confirmado',confirmado,'ativado',e.aceito_em is not null,'minimo_senha',12);
end;$$;

create function private.ma_acesso_entrega(comando uuid,estado_novo text,identificador_provedor text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if estado_novo not in ('enviado','falhou') or length(coalesce(identificador_provedor,''))>200 then raise exception 'Resultado inválido';end if;
 update private.ma_acessos_envios set estado=estado_novo,provedor_id=identificador_provedor where id=comando and estado<>'enviado';
end;$$;

create function private.ma_acesso_ativar(hash_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e private.ma_acessos_envios; a private.ma_colaboradores_acesso; correio text;
begin
 if auth.uid() is null then raise exception 'Entre com sua senha para ativar.' using errcode='42501';end if;
 select * into e from private.ma_acessos_envios where token_hash=hash_token;
 if e.id is null then raise exception 'Link inválido' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(e.municipio_id));
 select * into e from private.ma_acessos_envios where id=e.id for update;
 perform private.ma_acesso_consultar(hash_token);
 select lower(email) into correio from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if correio is distinct from e.email then raise exception 'Entre com a conta do e-mail cadastrado.' using errcode='42501';end if;
 if e.aceito_em is not null then
  if e.aceito_por<>auth.uid() then raise exception 'Link já utilizado' using errcode='42501';end if;
  return jsonb_build_object('municipio',e.municipio_id,'repetido',true);
 end if;
 select * into a from private.ma_colaboradores_acesso where municipio_id=e.municipio_id and id=e.colaborador_id for update;
 if a.user_id is not null and a.user_id<>auth.uid() then raise exception 'Ficha vinculada a outra conta' using errcode='42501';end if;
 if exists(select 1 from private.ma_colaboradores_acesso where municipio_id=e.municipio_id and user_id=auth.uid() and id<>e.colaborador_id) then raise exception 'Esta conta já pertence a outra ficha municipal' using errcode='23514';end if;
 -- Vínculo anterior compatível pode ser associado à ficha; jamais é promovido pelo token de outra identidade.
 insert into public.ma_vinculos(municipio_id,user_id,papel) values(e.municipio_id,auth.uid(),a.papel) on conflict(municipio_id,user_id) do update set papel=excluded.papel;
 update private.ma_colaboradores_acesso set user_id=auth.uid(),situacao='ativo' where municipio_id=e.municipio_id and id=e.colaborador_id;
 update private.ma_acessos_envios set aceito_por=auth.uid(),aceito_em=clock_timestamp() where id=e.id;
 return jsonb_build_object('municipio',e.municipio_id,'repetido',false);
end;$$;

-- Wrappers públicos invoker; toda autoridade fica em comandos privados com verificações explícitas.
create function public.ma_colaboradores_contexto(municipio text) returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_colaboradores_contexto(municipio)$$;
create function public.ma_colaborador_salvar(municipio text,identificador text,ficha jsonb,acesso jsonb,versao_esperada bigint default null) returns jsonb language sql security invoker set search_path='' as $$select private.ma_colaborador_salvar(municipio,identificador,ficha,acesso,versao_esperada)$$;
create function public.ma_acesso_preparar(municipio text,colaborador text,versao_esperada bigint,comando uuid,hash_token text,ator uuid) returns jsonb language sql security invoker set search_path='' as $$select private.ma_acesso_preparar(municipio,colaborador,versao_esperada,comando,hash_token,ator)$$;
create function public.ma_acesso_consultar(hash_token text) returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_acesso_consultar(hash_token)$$;
create function public.ma_acesso_entrega(comando uuid,estado_novo text,identificador_provedor text) returns void language sql security invoker set search_path='' as $$select private.ma_acesso_entrega(comando,estado_novo,identificador_provedor)$$;
create function public.ma_acesso_ativar(hash_token text) returns jsonb language sql security invoker set search_path='' as $$select private.ma_acesso_ativar(hash_token)$$;

do $$declare n text; assinatura text;begin
 for n,assinatura in select * from (values
 ('ma_colaboradores_contexto','text'),('ma_colaborador_salvar','text,text,jsonb,jsonb,bigint'),
 ('ma_acesso_ativar','text')) x(n,s) loop
  execute format('revoke all on function private.%I(%s),public.%I(%s) from public,anon,authenticated,service_role',n,assinatura,n,assinatura);
  execute format('grant execute on function private.%I(%s),public.%I(%s) to authenticated',n,assinatura,n,assinatura);
 end loop;
 for n,assinatura in select * from (values ('ma_acesso_preparar','text,text,bigint,uuid,text,uuid'),('ma_acesso_consultar','text'),('ma_acesso_entrega','uuid,text,text')) x(n,s) loop
  execute format('revoke all on function private.%I(%s),public.%I(%s) from public,anon,authenticated,service_role',n,assinatura,n,assinatura);
  execute format('grant execute on function private.%I(%s),public.%I(%s) to service_role',n,assinatura,n,assinatura);
 end loop;
end;$$;
grant usage on schema private to service_role;
-- Relações usam o catálogo existente e o mesmo controle de integridade municipal.
update public.ma_configuracao set documento=jsonb_set(documento,'{usuarios}',coalesce(documento->'usuarios','{}')||'{"equipe_id":"equipes","responsavel_id":"usuarios","substituto_id":"usuarios"}'::jsonb),versao=versao+1 where id='relacoes';
-- O gerenciador antigo permanece apenas para contas legadas, sem contornar a ficha nova.
alter function private.ma_definir_vinculo(text,text,text,text) rename to ma_definir_vinculo_legado;
revoke all on function private.ma_definir_vinculo_legado(text,text,text,text) from public,anon,authenticated;
create function private.ma_definir_vinculo(municipio text,email_usuario text,papel_novo text,papel_esperado text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.ma_exigir_admin();
 if exists(select 1 from private.ma_colaboradores_acesso where municipio_id=municipio and email=lower(btrim(email_usuario))) then raise exception 'Edite as permissões na ficha completa do colaborador.' using errcode='23514';end if;
 perform private.ma_definir_vinculo_legado(municipio,email_usuario,papel_novo,papel_esperado);
end;$$;
revoke all on function private.ma_definir_vinculo(text,text,text,text) from public,anon;
grant execute on function private.ma_definir_vinculo(text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
