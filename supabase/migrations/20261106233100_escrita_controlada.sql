begin;
-- Helpers privados têm uma responsabilidade e não podem ser chamados pelos clientes.
create function private.ma_gravar_prefeitura(item jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare linhas integer;
begin
  perform private.ma_exigir_admin();
  if item->>'operacao'='inserir' then
    insert into public.ma_prefeituras(id,dados) values(item->>'id',item->'dados');
  elsif item->>'operacao'='atualizar' then
    update public.ma_prefeituras set dados=item->'dados'
      where id=item->>'id' and versao=(item->>'versao')::bigint;
    get diagnostics linhas=row_count;
    if linhas<>1 then raise exception 'Prefeitura alterada por outra sessão. Atualize a página.' using errcode='40001'; end if;
  else
    raise exception 'Prefeituras podem ser suspensas, não excluídas pela aplicação' using errcode='22023';
  end if;
end;
$$;
revoke all on function private.ma_gravar_prefeitura(jsonb) from public,anon,authenticated;

create function private.ma_gravar_cadastro(item jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare linhas integer;
begin
  if not private.ma_acesso(item->>'municipio_id',true) then
    raise exception 'Sem permissão de escrita nesta prefeitura' using errcode='42501';
  end if;
  if item->>'operacao'='inserir' then
    insert into public.ma_cadastros(municipio_id,colecao,id,dados)
      values(item->>'municipio_id',item->>'colecao',item->>'id',item->'dados');
  elsif item->>'operacao'='atualizar' then
    update public.ma_cadastros set dados=item->'dados'
      where municipio_id=item->>'municipio_id' and colecao=item->>'colecao'
        and id=item->>'id' and versao=(item->>'versao')::bigint;
    get diagnostics linhas=row_count;
    if linhas<>1 then raise exception 'Cadastro alterado por outra sessão. Atualize a página.' using errcode='40001'; end if;
  elsif item->>'operacao'='excluir' then
    delete from public.ma_cadastros
      where municipio_id=item->>'municipio_id' and colecao=item->>'colecao'
        and id=item->>'id' and versao=(item->>'versao')::bigint;
    get diagnostics linhas=row_count;
    if linhas<>1 then raise exception 'Cadastro alterado por outra sessão. Atualize a página.' using errcode='40001'; end if;
  else raise exception 'Operação desconhecida' using errcode='22023';
  end if;
end;
$$;
revoke all on function private.ma_gravar_cadastro(jsonb) from public,anon,authenticated;

-- Única fronteira privilegiada de escrita. Os helpers revalidam papel e município
-- no servidor em CADA operação; não dependem de filtros ou claims editáveis no cliente.
create function private.ma_aplicar_lote(alteracoes jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória' using errcode='42501'; end if;
  if alteracoes is null or jsonb_typeof(alteracoes) is distinct from 'array' then
    raise exception 'Lote inválido' using errcode='22023'; end if;
  if jsonb_array_length(alteracoes)>5000 then raise exception 'Lote excede 5000 alterações' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(alteracoes) loop
    if jsonb_typeof(item) is distinct from 'object' then raise exception 'Alteração inválida' using errcode='22023';end if;
    if item->>'colecao'='prefeituras' then perform private.ma_gravar_prefeitura(item);
    else perform private.ma_gravar_cadastro(item);
    end if;
  end loop;
end;
$$;
revoke all on function private.ma_aplicar_lote(jsonb) from public,anon;
grant execute on function private.ma_aplicar_lote(jsonb) to authenticated;
create or replace function public.ma_aplicar_alteracoes(alteracoes jsonb) returns void
language sql security invoker set search_path='' as $$
  select private.ma_aplicar_lote(alteracoes);
$$;
revoke all on function public.ma_aplicar_alteracoes(jsonb) from public,anon;
grant execute on function public.ma_aplicar_alteracoes(jsonb) to authenticated;
revoke insert,update,delete on public.ma_prefeituras,public.ma_cadastros from authenticated;
commit;
