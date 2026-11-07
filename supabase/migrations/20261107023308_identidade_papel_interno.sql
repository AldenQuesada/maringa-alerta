begin;
-- O Supabase hospedado não permite que postgres conceda USAGE em auth a papéis próprios.
-- Ler apenas o subject que o gateway autenticado fornece, sem elevar privilégios.
create function private.ma_identidade() returns uuid language sql stable security invoker set search_path='' as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
   nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
revoke all on function private.ma_identidade() from public,anon;
grant execute on function private.ma_identidade() to ma_escritor,authenticated;
grant ma_escritor to current_user;
do $$declare f record;begin
 for f in select pg_get_functiondef(p.oid) as ddl from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='private' and p.proowner='ma_escritor'::regrole
   and p.proname in ('ma_gravar_lote','ma_aplicar_alteracoes','ma_salvar_painel') loop
  execute replace(f.ddl,'auth.uid()','private.ma_identidade()');
 end loop;
end$$;
revoke ma_escritor from current_user;
alter policy painel_leitura on public.ma_painel using(user_id=private.ma_identidade() and private.ma_acesso(municipio_id));
alter policy painel_novo on public.ma_painel with check(user_id=private.ma_identidade() and private.ma_acesso(municipio_id));
alter policy painel_edicao on public.ma_painel using(user_id=private.ma_identidade() and private.ma_acesso(municipio_id)) with check(user_id=private.ma_identidade() and private.ma_acesso(municipio_id));
commit;
