begin;
revoke all on private.ma_admins from public,anon,authenticated;
create index ma_convites_usuario on private.ma_convites_iniciais(utilizado_por);
-- O painel pode criar este event trigger ao habilitar RLS automático.
-- Ele não precisa ser uma função pública acessível pela API.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
 end if;
end $$;
commit;
