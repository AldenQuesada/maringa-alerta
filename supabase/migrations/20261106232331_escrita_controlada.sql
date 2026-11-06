begin;
-- Papel interno sem login, sem herança e sem bypass de RLS.
create role ma_escritor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
grant usage on schema public, private, auth to ma_escritor;
grant execute on function auth.uid(),private.ma_admin(),private.ma_acesso(text,boolean) to ma_escritor;
grant select,insert,update on public.ma_prefeituras to ma_escritor;
grant select,insert,update,delete on public.ma_cadastros to ma_escritor;
create policy escritor_prefeitura_leitura on public.ma_prefeituras for select to ma_escritor using (private.ma_admin() or private.ma_acesso(id));
create policy escritor_prefeitura_nova on public.ma_prefeituras for insert to ma_escritor with check (private.ma_admin());
create policy escritor_prefeitura_edicao on public.ma_prefeituras for update to ma_escritor using (private.ma_admin()) with check (private.ma_admin());
create policy escritor_cadastro_leitura on public.ma_cadastros for select to ma_escritor using (private.ma_acesso(municipio_id));
create policy escritor_cadastro_novo on public.ma_cadastros for insert to ma_escritor with check (private.ma_acesso(municipio_id,true));
create policy escritor_cadastro_edicao on public.ma_cadastros for update to ma_escritor using (private.ma_acesso(municipio_id,true)) with check (private.ma_acesso(municipio_id,true));
create policy escritor_cadastro_exclusao on public.ma_cadastros for delete to ma_escritor using (private.ma_acesso(municipio_id,true));
-- Conserva a transação, a autenticação e os predicados de versão já testados.
alter function public.ma_aplicar_alteracoes(jsonb) set schema private;
alter function private.ma_aplicar_alteracoes(jsonb) security definer;
grant create on schema private to ma_escritor;
alter function private.ma_aplicar_alteracoes(jsonb) owner to ma_escritor;
revoke create on schema private from ma_escritor;
revoke all on function private.ma_aplicar_alteracoes(jsonb) from public,anon;
grant execute on function private.ma_aplicar_alteracoes(jsonb) to authenticated;
create function public.ma_aplicar_alteracoes(alteracoes jsonb) returns void language sql security invoker set search_path='' as $$
 select private.ma_aplicar_alteracoes(alteracoes);
$$;
revoke all on function public.ma_aplicar_alteracoes(jsonb) from public,anon;
grant execute on function public.ma_aplicar_alteracoes(jsonb) to authenticated;
revoke insert,update,delete on public.ma_prefeituras,public.ma_cadastros from authenticated;
commit;
