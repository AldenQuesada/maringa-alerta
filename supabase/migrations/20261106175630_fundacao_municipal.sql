begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.ma_prefeituras (
  id text primary key check (length(id) between 1 and 100),
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and dados ? 'id' and dados->>'id' = id and dados ? 'nome' and length(dados->>'nome') > 0),
  codigo_ibge text generated always as (dados->>'codigo_ibge') stored unique not null check (codigo_ibge ~ '^[0-9]{7}$'),
  versao bigint not null default 1,
  atualizado_em timestamptz not null default now()
);
create table private.ma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.ma_vinculos (
  municipio_id text not null references public.ma_prefeituras(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('admin','operador','leitor')),
  primary key (municipio_id,user_id)
);
create index ma_vinculos_usuario on public.ma_vinculos(user_id,municipio_id);
create table public.ma_cadastros (
  municipio_id text not null references public.ma_prefeituras(id) on delete cascade,
  colecao text not null check (colecao in ('importacoes','bairros','usuarios','zonas','bases','riscos','equipes','integrantes','voluntarios','instituicoes','veiculos','equipamentos','estoques','abrigos','pontos','ocorrenciaTipos','canais','eventos','regras','solicitacoes','relatos','mobilizacoes','apoios')),
  id text not null check (length(id) between 1 and 100),
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and dados ? 'id' and dados->>'id' = id and dados ? 'municipioId' and dados->>'municipioId' = municipio_id),
  versao bigint not null default 1,
  atualizado_em timestamptz not null default now(),
  constraint ma_sem_simulacao check (coalesce(dados->>'status_simulacao','') not in ('simulado','demonstracao','demo')),
  primary key(municipio_id,colecao,id)
);
alter table public.ma_prefeituras enable row level security;
alter table public.ma_vinculos enable row level security;
alter table public.ma_cadastros enable row level security;
alter table private.ma_admins enable row level security;

-- Helpers internos consultam somente vínculos administrados no servidor.
create function private.ma_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from private.ma_admins where user_id = auth.uid());
$$;
create function private.ma_acesso(municipio text, escrita boolean default false) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.ma_vinculos v join public.ma_prefeituras p on p.id=v.municipio_id
  where v.user_id=auth.uid() and v.municipio_id=municipio
    and coalesce(p.dados->>'status','implantacao') <> 'suspensa'
    and (not escrita or v.papel in ('admin','operador'))
 );
$$;
revoke all on function private.ma_admin() from public, anon;
revoke all on function private.ma_acesso(text,boolean) from public, anon;
grant execute on function private.ma_admin(), private.ma_acesso(text,boolean) to authenticated;

create policy prefeitura_leitura on public.ma_prefeituras for select to authenticated using (private.ma_admin() or private.ma_acesso(id));
create policy prefeitura_nova on public.ma_prefeituras for insert to authenticated with check (private.ma_admin());
create policy prefeitura_edicao on public.ma_prefeituras for update to authenticated using (private.ma_admin()) with check (private.ma_admin());
-- Exclusão de prefeitura deliberadamente indisponível na API: suspensão preserva seus registros.
create policy vinculo_proprio on public.ma_vinculos for select to authenticated using (user_id=(select auth.uid()));
create policy cadastro_leitura on public.ma_cadastros for select to authenticated using (private.ma_acesso(municipio_id));
create policy cadastro_novo on public.ma_cadastros for insert to authenticated with check (private.ma_acesso(municipio_id,true));
create policy cadastro_edicao on public.ma_cadastros for update to authenticated using (private.ma_acesso(municipio_id,true)) with check (private.ma_acesso(municipio_id,true));
create policy cadastro_exclusao on public.ma_cadastros for delete to authenticated using (private.ma_acesso(municipio_id,true));
revoke all on public.ma_prefeituras, public.ma_vinculos, public.ma_cadastros from anon, authenticated;
grant select,insert,update on public.ma_prefeituras to authenticated;
grant select on public.ma_vinculos to authenticated;
grant select,insert,update,delete on public.ma_cadastros to authenticated;

create function private.ma_carimbar() returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_OP='UPDATE' then
  if new.id is distinct from old.id then raise exception 'Identificador imutável'; end if;
  if TG_TABLE_NAME='ma_cadastros' then
   if new.municipio_id is distinct from old.municipio_id or new.colecao is distinct from old.colecao then raise exception 'Escopo imutável'; end if;
  end if;
  new.versao := old.versao+1;
 else new.versao := 1;
 end if;
 new.atualizado_em := clock_timestamp();
 return new;
end;
$$;
revoke all on function private.ma_carimbar() from public,anon,authenticated;
create trigger ma_prefeitura_versao before insert or update on public.ma_prefeituras for each row execute function private.ma_carimbar();
create trigger ma_cadastro_versao before insert or update on public.ma_cadastros for each row execute function private.ma_carimbar();

create function private.ma_vincular_criador() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is not null and private.ma_admin() then
  insert into public.ma_vinculos(municipio_id,user_id,papel) values(new.id,auth.uid(),'admin') on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.ma_vincular_criador() from public,anon,authenticated;
create trigger ma_prefeitura_criador after insert on public.ma_prefeituras for each row execute function private.ma_vincular_criador();

-- Transação atômica com concorrência otimista. RLS é aplicada a cada operação.
create function public.ma_aplicar_alteracoes(alteracoes jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare item jsonb; linhas integer;
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória' using errcode='42501'; end if;
 if jsonb_typeof(alteracoes)<>'array' or jsonb_array_length(alteracoes)>5000 then raise exception 'Lote inválido'; end if;
 for item in select value from jsonb_array_elements(alteracoes) loop
  if item->>'colecao'='prefeituras' then
   if item->>'operacao'='inserir' then
    insert into public.ma_prefeituras(id,dados) values(item->>'id',item->'dados');
   elsif item->>'operacao'='atualizar' then
    update public.ma_prefeituras set dados=item->'dados' where id=item->>'id' and versao=(item->>'versao')::bigint;
    get diagnostics linhas=row_count;
    if linhas<>1 then raise exception 'Cadastro alterado por outra sessão ou acesso revogado. Atualize a página.' using errcode='40001'; end if;
   else raise exception 'Prefeituras podem ser suspensas, não excluídas pela aplicação'; end if;
  else
   if item->>'operacao'='inserir' then
    insert into public.ma_cadastros(municipio_id,colecao,id,dados) values(item->>'municipio_id',item->>'colecao',item->>'id',item->'dados');
   elsif item->>'operacao'='atualizar' then
    update public.ma_cadastros set dados=item->'dados' where municipio_id=item->>'municipio_id' and colecao=item->>'colecao' and id=item->>'id' and versao=(item->>'versao')::bigint;
    get diagnostics linhas=row_count;
    if linhas<>1 then raise exception 'Cadastro alterado por outra sessão ou acesso revogado. Atualize a página.' using errcode='40001'; end if;
   elsif item->>'operacao'='excluir' then
    delete from public.ma_cadastros where municipio_id=item->>'municipio_id' and colecao=item->>'colecao' and id=item->>'id' and versao=(item->>'versao')::bigint;
    get diagnostics linhas=row_count;
    if linhas<>1 then raise exception 'Cadastro alterado por outra sessão ou acesso revogado. Atualize a página.' using errcode='40001'; end if;
   else raise exception 'Operação desconhecida'; end if;
  end if;
 end loop;
end;
$$;
revoke all on function public.ma_aplicar_alteracoes(jsonb) from public,anon;
grant execute on function public.ma_aplicar_alteracoes(jsonb) to authenticated;

create function public.ma_meu_perfil() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('admin_plataforma',private.ma_admin(),'user_id',auth.uid());
$$;
revoke all on function public.ma_meu_perfil() from public,anon;
grant execute on function public.ma_meu_perfil() to authenticated;

insert into public.ma_prefeituras(id,dados) values ('maringa','{"id":"maringa","nome":"Maringá","uf":"PR","codigo_ibge":"4115200","pais":"Brasil","paisId":"BR","estado":"Paraná","codigo_uf":"41","status":"ativa","origem_provisionamento":"Supabase","lat":-23.4205,"lng":-51.9333,"zoom":12}');
commit;
