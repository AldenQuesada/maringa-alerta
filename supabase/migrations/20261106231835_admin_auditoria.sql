begin;
-- Metadados de alterações, sem copiar dados pessoais ou geometrias para o histórico.
create table public.ma_auditoria (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default clock_timestamp(),
  ator_id uuid,
  tabela text not null,
  municipio_id text,
  registro_id text not null,
  operacao text not null check (operacao in ('INSERT','UPDATE','DELETE')),
  campos text[] not null default '{}'
);
create index ma_auditoria_municipio_data on public.ma_auditoria(municipio_id,criado_em desc,id desc);
create index ma_auditoria_data on public.ma_auditoria(criado_em desc,id desc);
alter table public.ma_auditoria enable row level security;
revoke all on public.ma_auditoria from public,anon,authenticated;
revoke all on sequence public.ma_auditoria_id_seq from public,anon,authenticated;
grant select on public.ma_auditoria to authenticated;
create policy auditoria_admin_leitura on public.ma_auditoria for select to authenticated
  using ((select private.ma_admin()));

create function private.ma_auditar() returns trigger
language plpgsql security definer set search_path='' as $$
declare anterior jsonb := coalesce(to_jsonb(old),'{}');
  posterior jsonb := coalesce(to_jsonb(new),'{}');
  registro jsonb; campos text[];
begin
  registro := case when TG_OP='DELETE' then anterior else posterior end;
  select coalesce(array_agg(k order by k),'{}') into campos from (
    select jsonb_object_keys(coalesce(anterior->'dados',anterior)) as k
    union select jsonb_object_keys(coalesce(posterior->'dados',posterior))
  ) chaves where coalesce(anterior->'dados',anterior)->k
    is distinct from coalesce(posterior->'dados',posterior)->k;
  insert into public.ma_auditoria(ator_id,tabela,municipio_id,registro_id,operacao,campos)
    values(auth.uid(),TG_TABLE_NAME,
      case when TG_TABLE_NAME='ma_prefeituras' then registro->>'id' else registro->>'municipio_id' end,
      coalesce(registro->>'id',registro->>'user_id'),TG_OP,campos);
  return null;
end;
$$;
revoke all on function private.ma_auditar() from public,anon,authenticated;
create trigger ma_prefeitura_auditoria after insert or update or delete on public.ma_prefeituras
  for each row execute function private.ma_auditar();
create trigger ma_vinculo_auditoria after insert or update or delete on public.ma_vinculos
  for each row execute function private.ma_auditar();
create trigger ma_admin_auditoria after insert or update or delete on private.ma_admins
  for each row execute function private.ma_auditar();
create trigger ma_cadastro_auditoria after insert or update or delete on public.ma_cadastros
  for each row execute function private.ma_auditar();
commit;
