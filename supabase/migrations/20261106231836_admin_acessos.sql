begin;
create function private.ma_exigir_admin() returns void
language plpgsql security invoker set search_path='' as $$
begin
  if not private.ma_admin() then
    raise exception 'Administração Geral obrigatória' using errcode='42501';
  end if;
end;
$$;
revoke all on function private.ma_exigir_admin() from public,anon,authenticated;

-- Apenas contas com e-mail confirmado; nomes de referência nunca autorizam acesso.
create function private.ma_definir_vinculo(municipio text,email_usuario text,papel_novo text,papel_esperado text)
returns void language plpgsql security definer set search_path='' as $$
declare usuario uuid; papel_atual text;
begin
  perform private.ma_exigir_admin();
  if papel_novo is not null and papel_novo not in ('admin','operador','leitor') then
    raise exception 'Papel municipal inválido' using errcode='22023';
  end if;
  perform 1 from public.ma_prefeituras where id=municipio for update;
  if not found then raise exception 'Prefeitura não encontrada' using errcode='22023'; end if;
  select id into usuario from auth.users where lower(email)=lower(btrim(email_usuario))
    and email_confirmed_at is not null;
  if usuario is null then
    raise exception 'Conta com e-mail confirmado não encontrada. A pessoa precisa entrar no sistema primeiro.' using errcode='22023';
  end if;
  select papel into papel_atual from public.ma_vinculos where municipio_id=municipio and user_id=usuario;
  if papel_atual is distinct from papel_esperado then
    raise exception 'Vínculo alterado por outra sessão. Atualize a lista.' using errcode='40001';
  end if;
  if papel_novo is null then
    delete from public.ma_vinculos where municipio_id=municipio and user_id=usuario;
  else
    insert into public.ma_vinculos(municipio_id,user_id,papel) values(municipio,usuario,papel_novo)
      on conflict(municipio_id,user_id) do update set papel=excluded.papel;
  end if;
end;
$$;
revoke all on function private.ma_definir_vinculo(text,text,text,text) from public,anon;
grant execute on function private.ma_definir_vinculo(text,text,text,text) to authenticated;
create function public.ma_admin_definir_vinculo(municipio text,email_usuario text,papel_novo text,papel_esperado text default null)
returns void language sql security invoker set search_path='' as $$
  select private.ma_definir_vinculo(municipio,email_usuario,papel_novo,papel_esperado);
$$;
revoke all on function public.ma_admin_definir_vinculo(text,text,text,text) from public,anon;
grant execute on function public.ma_admin_definir_vinculo(text,text,text,text) to authenticated;

create function private.ma_listar_acessos(municipio text,limite integer,deslocamento integer)
returns table(user_id uuid,email text,papel text,municipio_id text)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.ma_exigir_admin();
  if limite is null or limite not between 1 and 100 or deslocamento is null or deslocamento<0 then
    raise exception 'Paginação inválida' using errcode='22023';
  end if;
  return query
    select u.id,u.email::text,'admin_plataforma'::text,null::text
      from private.ma_admins a join auth.users u on u.id=a.user_id where municipio is null
    union all
    select u.id,u.email::text,v.papel,v.municipio_id
      from public.ma_vinculos v join auth.users u on u.id=v.user_id
      where municipio is not null and v.municipio_id=municipio
    order by 2,1 limit limite offset deslocamento;
end;
$$;
revoke all on function private.ma_listar_acessos(text,integer,integer) from public,anon;
grant execute on function private.ma_listar_acessos(text,integer,integer) to authenticated;
create function public.ma_admin_listar_acessos(municipio text default null,limite integer default 50,deslocamento integer default 0)
returns table(user_id uuid,email text,papel text,municipio_id text)
language sql stable security invoker set search_path='' as $$
  select * from private.ma_listar_acessos(municipio,limite,deslocamento);
$$;
revoke all on function public.ma_admin_listar_acessos(text,integer,integer) from public,anon;
grant execute on function public.ma_admin_listar_acessos(text,integer,integer) to authenticated;
commit;
