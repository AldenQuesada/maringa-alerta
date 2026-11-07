begin;
create table public.ma_painel (
 municipio_id text not null references public.ma_prefeituras(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 chave text not null check(chave in ('tasks','alerts')),
 documento jsonb not null check(jsonb_typeof(documento)='array' and jsonb_array_length(documento)<=2000 and octet_length(documento::text)<=1000000),
 versao bigint not null default 1,
 atualizado_em timestamptz not null default now(),
 primary key(municipio_id,user_id,chave)
);
alter table public.ma_painel enable row level security;
revoke all on public.ma_painel from public,anon,authenticated;
grant select on public.ma_painel to authenticated;
grant select,insert,update on public.ma_painel to ma_escritor;
create policy painel_leitura on public.ma_painel for select to authenticated,ma_escritor using(user_id=auth.uid() and private.ma_acesso(municipio_id));
create policy painel_novo on public.ma_painel for insert to ma_escritor with check(user_id=auth.uid() and private.ma_acesso(municipio_id));
create policy painel_edicao on public.ma_painel for update to ma_escritor using(user_id=auth.uid() and private.ma_acesso(municipio_id)) with check(user_id=auth.uid() and private.ma_acesso(municipio_id));
create function private.ma_salvar_painel(municipio text,tipo text,conteudo jsonb,versao_esperada bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare resultado public.ma_painel; item jsonb;
begin
 if auth.uid() is null or not private.ma_acesso(municipio) then raise exception 'Sem acesso ao painel' using errcode='42501';end if;
 if conteudo is null or jsonb_typeof(conteudo)<>'array' or tipo not in ('tasks','alerts') then raise exception 'Documento inválido' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(conteudo) loop
  if tipo='alerts' and jsonb_typeof(item)<>'string' then raise exception 'Alerta inválido' using errcode='23514';end if;
  if tipo='tasks' and (jsonb_typeof(item)<>'object' or coalesce(btrim(item->>'id'),'')='' or coalesce(btrim(item->>'title'),'')='' or length(item->>'title')>140 or coalesce(item->>'status','') not in ('open','done') or coalesce(item->>'priority','') not in ('Normal','Alta','Crítica')) then raise exception 'Tarefa inválida' using errcode='23514';end if;
 end loop;
 if tipo='tasks' and (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(conteudo)) then raise exception 'Tarefas duplicadas' using errcode='23514';end if;
 if versao_esperada=0 then
  begin insert into public.ma_painel(municipio_id,user_id,chave,documento) values(municipio,auth.uid(),tipo,conteudo) returning * into resultado;
  exception when unique_violation then raise exception 'Painel alterado por outra sessão. Atualize a página.' using errcode='40001';end;
 else
  update public.ma_painel set documento=conteudo,versao=versao+1,atualizado_em=now() where municipio_id=municipio and user_id=auth.uid() and chave=tipo and versao=versao_esperada returning * into resultado;
  if not found then raise exception 'Painel alterado por outra sessão. Atualize a página.' using errcode='40001';end if;
 end if;
 return to_jsonb(resultado);
end;
$$;
grant create on schema private to ma_escritor;
alter function private.ma_salvar_painel(text,text,jsonb,bigint) owner to ma_escritor;
revoke create on schema private from ma_escritor;
revoke all on function private.ma_salvar_painel(text,text,jsonb,bigint) from public,anon;
grant execute on function private.ma_salvar_painel(text,text,jsonb,bigint) to authenticated;
create function public.ma_salvar_painel(municipio text,tipo text,conteudo jsonb,versao_esperada bigint) returns jsonb language sql security invoker set search_path='' as $$select private.ma_salvar_painel(municipio,tipo,conteudo,versao_esperada)$$;
revoke all on function public.ma_salvar_painel(text,text,jsonb,bigint) from public,anon;
grant execute on function public.ma_salvar_painel(text,text,jsonb,bigint) to authenticated;
-- O histórico registra identidade composta; evita confundir os painéis de dois usuários.
create or replace function private.ma_registrar_historico() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb;p jsonb;r jsonb;
begin
 if TG_OP<>'INSERT' then a:=to_jsonb(old);end if;
 if TG_OP<>'DELETE' then p:=to_jsonb(new);end if;
 r:=coalesce(p,a);
 insert into private.ma_historico(ator,tabela,municipio_id,registro_id,operacao,anterior,posterior)
 values(auth.uid(),TG_TABLE_NAME,case when TG_TABLE_NAME='ma_prefeituras' then r->>'id' else r->>'municipio_id' end,case when TG_TABLE_NAME='ma_painel' then (r->>'user_id')||':'||(r->>'chave') else coalesce(r->>'id',r->>'user_id') end,TG_OP,a,p);
 return null;
end;
$$;
create trigger ma_historico_painel after insert or update or delete on public.ma_painel for each row execute function private.ma_registrar_historico();
commit;
