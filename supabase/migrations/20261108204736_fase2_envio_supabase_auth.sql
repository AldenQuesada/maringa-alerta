begin;
-- Auth controla entrega SMTP e confirmação; a ficha e sua autoridade permanecem canônicas.
alter table private.ma_acessos_envios add column tentativa uuid, add column reservado_ate timestamptz, add column senha_inicial boolean not null default false;
create index ma_acessos_senha_pendente on private.ma_acessos_envios(email) where senha_inicial;

create or replace function private.ma_acesso_preparar(municipio text,colaborador text,versao_esperada bigint,comando uuid,hash_token text,ator uuid) returns jsonb
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
  insert into private.ma_acessos_envios(id,municipio_id,colaborador_id,email,token_hash,versao,solicitado_por,senha_inicial) values(comando,municipio,colaborador,a.email,hash_token,c.versao,ator,
   not exists(select 1 from auth.users where lower(email)=a.email and coalesce(encrypted_password,'')<>'')
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
 select id,email_confirmed_at is not null,coalesce(encrypted_password,'')<>'' into conta,confirmado,tem_senha from auth.users where lower(email)=e.email;
 return jsonb_build_object('email',e.email,'nome',c.dados->>'nome','conta_existente',conta is not null,'conta_id',conta,'senha_definida',coalesce(tem_senha,false) and not e.senha_inicial,'email_confirmado',confirmado,'ativado',e.aceito_em is not null,'minimo_senha',12);
end;$$;

create or replace function private.ma_acesso_ativar(hash_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e private.ma_acessos_envios; a private.ma_colaboradores_acesso; correio text;
begin
 if auth.uid() is null then raise exception 'Entre com sua senha para ativar.' using errcode='42501';end if;
 select * into e from private.ma_acessos_envios where token_hash=hash_token;
 if e.id is null then raise exception 'Link inválido' using errcode='22023';end if;
 -- A senha é da conta: serializar ativações entre municípios antes dos bloqueios locais.
 perform pg_advisory_xact_lock(hashtext('ma_primeira_senha'),hashtext(e.email));
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(e.municipio_id));
 select * into e from private.ma_acessos_envios where id=e.id for update;
 perform private.ma_acesso_consultar(hash_token);
 select lower(email) into correio from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if correio is distinct from e.email then raise exception 'Entre com a conta do e-mail cadastrado.' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and coalesce(encrypted_password,'')<>'') then raise exception 'Defina sua senha antes de ativar o acesso.' using errcode='42501';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->'amr','[]'::jsonb)) metodo where metodo->>'method'='password') then raise exception 'Entre com sua senha para ativar o acesso.' using errcode='42501';end if;
 update private.ma_acessos_envios set senha_inicial=false where email=e.email and senha_inicial;
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

-- O Auth não oferece chave de idempotência para SMTP. Reservar a tentativa antes da chamada
-- impede disparos concorrentes; resultado desconhecido conserva a reserva por 90 segundos.
create function private.ma_acesso_reservar_envio(comando uuid) returns jsonb
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
create function private.ma_acesso_finalizar_envio(comando uuid,tentativa_atual uuid,resultado text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if resultado is null or resultado not in ('enviado','falhou','incerto') then raise exception 'Resultado inválido';end if;
 update private.ma_acessos_envios set estado=case when resultado='enviado' then 'enviado' else 'falhou' end,
  provedor_id=case when resultado='enviado' then 'supabase-auth:'||tentativa_atual::text else null end,
  reservado_ate=case when resultado='incerto' then reservado_ate else null end
 where id=comando and tentativa=tentativa_atual and estado<>'enviado';
end;$$;
create function public.ma_acesso_reservar_envio(comando uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.ma_acesso_reservar_envio(comando)$$;
create function public.ma_acesso_finalizar_envio(comando uuid,tentativa_atual uuid,resultado text) returns void
language sql security invoker set search_path='' as $$select private.ma_acesso_finalizar_envio(comando,tentativa_atual,resultado)$$;
revoke all on function private.ma_acesso_reservar_envio(uuid),public.ma_acesso_reservar_envio(uuid),
 private.ma_acesso_finalizar_envio(uuid,uuid,text),public.ma_acesso_finalizar_envio(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.ma_acesso_reservar_envio(uuid),public.ma_acesso_reservar_envio(uuid),
 private.ma_acesso_finalizar_envio(uuid,uuid,text),public.ma_acesso_finalizar_envio(uuid,uuid,text) to service_role;
-- Encerrar o caminho antigo sem reserva; o novo serviço usa finalizar_envio.
revoke execute on function private.ma_acesso_entrega(uuid,text,text),public.ma_acesso_entrega(uuid,text,text) from service_role;
commit;

