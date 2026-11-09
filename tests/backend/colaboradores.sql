-- Somente banco descartável. Todas as fixtures e alterações são revertidas.
begin;
select set_config('request.jwt.claims','{"amr":[{"method":"password"}]}',true);
insert into auth.users(id,email,email_confirmed_at,encrypted_password) values
 ('f2000000-0000-4000-8000-000000000001','fase2-admin@example.invalid',now(),'fixture-sql'),
 ('f2000000-0000-4000-8000-000000000002','fase2-pessoa@example.invalid',now(),'fixture-sql'),
 ('f2000000-0000-4000-8000-000000000003','fase2-outra@example.invalid',now(),'fixture-sql');
insert into public.ma_vinculos(municipio_id,user_id,papel) values('maringa','f2000000-0000-4000-8000-000000000001','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select public.ma_colaborador_salvar('maringa','teste-fase2',
 '{"nome":"Pessoa de teste","email":"fase2-pessoa@example.invalid","telefone":"44999999999","endereco":"Endereço de teste","bairro":"Bairro","cargo":"Atendimento","funcao":"operador","horarios":[{"dia":1,"inicio":"08:00","fim":"12:00"}]}',
 '{"papel":"leitor","colecoes":["eventos"],"situacao":"pendente"}',null);
do $$begin
 if not exists(select 1 from public.ma_cadastros where id='teste-fase2' and colecao='usuarios' and versao=1) then raise exception 'Ficha não foi salva no cadastro canônico';end if;
 begin perform public.ma_colaborador_salvar('maringa','teste-fase2','{}','{}',null);raise exception 'Versão antiga aceita';exception when serialization_failure then null;end;
 begin perform public.ma_colaborador_salvar('inexistente','x','{}','{}',null);raise exception 'Município externo permitido';exception when insufficient_privilege then null;end;
 begin perform public.ma_aplicar_alteracoes('[{"colecao":"usuarios","municipio_id":"maringa","id":"teste-fase2","operacao":"atualizar","versao":1,"dados":{"id":"teste-fase2","municipioId":"maringa","nome":"alterado","funcao":"operador"}}]');raise exception 'Edição genérica divergiu da ficha gerenciada';exception when insufficient_privilege then null;end;
end$$;
do $$begin begin perform public.ma_acesso_preparar('maringa','teste-fase2',1,'f2000000-0000-4000-8000-000000000010',repeat('a',64),auth.uid());raise exception 'Navegador escolheu token de ativação';exception when insufficient_privilege then null;end;end$$;
set local role service_role;
select public.ma_acesso_preparar('maringa','teste-fase2',1,'f2000000-0000-4000-8000-000000000010',repeat('a',64),'f2000000-0000-4000-8000-000000000001');
do $$declare primeira jsonb; segunda jsonb; begin
 primeira:=public.ma_acesso_reservar_envio('f2000000-0000-4000-8000-000000000010');
 segunda:=public.ma_acesso_reservar_envio('f2000000-0000-4000-8000-000000000010');
 if not (primeira->>'enviar')::boolean or (segunda->>'enviar')::boolean then raise exception 'Reserva duplicada de SMTP';end if;
 perform public.ma_acesso_finalizar_envio('f2000000-0000-4000-8000-000000000010',gen_random_uuid(),'enviado');
 if public.ma_acesso_reservar_envio('f2000000-0000-4000-8000-000000000010')->>'estado'<>'aguardando' then raise exception 'Conclusão de outra tentativa alterou envio';end if;
 perform public.ma_acesso_finalizar_envio('f2000000-0000-4000-8000-000000000010',(primeira->>'tentativa')::uuid,'incerto');
 if (public.ma_acesso_reservar_envio('f2000000-0000-4000-8000-000000000010')->>'enviar')::boolean then raise exception 'Resultado incerto perdeu reserva';end if;
 perform public.ma_acesso_finalizar_envio('f2000000-0000-4000-8000-000000000010',(primeira->>'tentativa')::uuid,'enviado');
 if public.ma_acesso_reservar_envio('f2000000-0000-4000-8000-000000000010')->>'estado'<>'enviado' then raise exception 'Retry perdeu sucesso já confirmado';end if;
end$$;
set local role authenticated;
do $$begin
 begin perform public.ma_acesso_reservar_envio('f2000000-0000-4000-8000-000000000010');raise exception 'Navegador reservou envio';exception when insufficient_privilege then null;end;
 begin perform public.ma_acesso_finalizar_envio('f2000000-0000-4000-8000-000000000010',gen_random_uuid(),'enviado');raise exception 'Navegador confirmou envio';exception when insufficient_privilege then null;end;
end$$;
set local role service_role;
select public.ma_acesso_preparar('maringa','teste-fase2',1,'f2000000-0000-4000-8000-000000000010',repeat('a',64),'f2000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$begin
 begin perform public.ma_colaborador_salvar('maringa','teste-fase2','{"horarios":[{"dia":1,"inicio":"09:00","fim":"12:00"},{"dia":1,"inicio":"11:00","fim":"13:00"}]}','{"papel":"leitor","colecoes":["eventos"],"situacao":"pendente"}',1);raise exception 'Escalas sobrepostas aceitas';exception when check_violation then null;end;
 begin perform public.ma_colaborador_salvar('maringa','teste-fase2','{"equipe_id":"outra-equipe"}','{"papel":"leitor","colecoes":["eventos"],"situacao":"pendente"}',1);raise exception 'Equipe externa aceita';exception when check_violation then null;end;
end$$;
reset role;
update private.ma_acessos_envios set expira_em=clock_timestamp()-interval '1 second' where colaborador_id='teste-fase2';
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);
do $$begin begin perform public.ma_acesso_ativar(repeat('a',64));raise exception 'Token expirado aceito';exception when invalid_parameter_value then null;end;end$$;
reset role;
update private.ma_acessos_envios set expira_em=clock_timestamp()+interval '1 hour' where colaborador_id='teste-fase2';
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.ma_acesso_ativar(repeat('a',64));raise exception 'Outra conta ativou a ficha';exception when insufficient_privilege then null;end;
 begin perform public.ma_colaboradores_contexto('maringa');raise exception 'Externo leu equipe';exception when insufficient_privilege then null;end;
 begin perform public.ma_acesso_consultar(repeat('a',64));raise exception 'Cliente consultou endpoint reservado ao serviço';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);
reset role;
update auth.users set encrypted_password=null where id='f2000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$begin begin perform public.ma_acesso_ativar(repeat('a',64));raise exception 'Ativação sem senha aceita';exception when insufficient_privilege then null;end;end$$;
reset role;
update auth.users set encrypted_password='fixture-sql' where id='f2000000-0000-4000-8000-000000000002';
set local role authenticated;
select public.ma_acesso_ativar(repeat('a',64));
select public.ma_acesso_ativar(repeat('a',64));
do $$begin
 if not private.ma_permitido('maringa','eventos','ler') or private.ma_permitido('maringa','eventos','gravar') or private.ma_permitido('maringa','usuarios','ler') then raise exception 'Permissões incorretas';end if;
 if exists(select 1 from public.ma_cadastros where colecao<>'eventos') then raise exception 'RLS expôs coleção não permitida';end if;
 begin perform public.ma_colaborador_salvar('maringa','x','{}','{}',null);raise exception 'Leitor criou colaborador';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select public.ma_colaborador_salvar('maringa','teste-fase2','{}','{"papel":"leitor","colecoes":["eventos"],"situacao":"suspenso"}',1);
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);
do $$begin
 if private.ma_acesso('maringa') or private.ma_permitido('maringa','eventos','ler') then raise exception 'Sessão antiga manteve acesso suspenso';end if;
 begin perform public.ma_acesso_ativar(repeat('a',64));raise exception 'Suspenso reativou pelo link';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if (select count(*) from private.ma_acessos_envios where colaborador_id='teste-fase2')<>1 then raise exception 'Retry duplicou envio';end if;
 if (select count(*) from public.ma_cadastros where id='teste-fase2')<>1 then raise exception 'Ativação duplicou pessoa';end if;
end$$;
rollback;
