begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000041','painel-a@invalid.example',now()),('00000000-0000-4000-8000-000000000042','painel-b@invalid.example',now());
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000041','leitor'),('maringa','00000000-0000-4000-8000-000000000042','leitor');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000041',true);
select public.ma_salvar_painel('maringa','tasks','[{"id":"t1","title":"Fixture local","status":"open","priority":"Normal"}]',0);
do $$begin
 begin perform public.ma_salvar_painel('maringa','tasks','[]',0);raise exception 'Conflito ignorado';exception when serialization_failure then null;end;
 begin update public.ma_painel set documento='[]';raise exception 'Alteração direta aceita';exception when insufficient_privilege then null;end;
 begin perform public.ma_salvar_painel('inexistente','tasks','[]',0);raise exception 'Município externo aceito';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000042',true);
do $$begin if exists(select 1 from public.ma_painel) then raise exception 'Usuário leu tarefas alheias';end if;end$$;
select public.ma_salvar_painel('maringa','alerts','["pedido:1"]',0);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000041',true);
do $$begin if exists(select 1 from public.ma_painel where chave='alerts') then raise exception 'Usuário leu marcações alheias';end if;end$$;
reset role;
do $$begin if (select count(*) from private.ma_historico where tabela='ma_painel')<>2 then raise exception 'Painel sem histórico';end if;end$$;
rollback;
