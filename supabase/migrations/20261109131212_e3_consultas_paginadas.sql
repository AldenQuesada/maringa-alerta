begin;
-- Leituras delimitadas têm executor próprio, sem autoridade de gravação.
create role ma_consultor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
grant ma_consultor,ma_gestor_acessos to current_user;
grant usage on schema public,private to ma_consultor;
grant select on public.ma_cadastros,public.ma_configuracao to ma_consultor;
create policy consultor_cadastros on public.ma_cadastros for select to ma_consultor using(true);
create policy consultor_configuracao on public.ma_configuracao for select to ma_consultor using(true);
grant execute on function private.ma_permitido(text,text,text),private.ma_gerencia_colaboradores(text) to ma_consultor;

-- Ordem imutável por ID: a mudança de nome não desloca itens entre páginas.
create index ma_cadastros_pagina_ativos on public.ma_cadastros(municipio_id,colecao,id) where arquivado_em is null;
create index ma_cadastros_busca_ativos on public.ma_cadastros using gin (
 to_tsvector('simple'::regconfig,coalesce(dados->>'nome','')||' '||coalesce(dados->>'identificacao','')||' '||coalesce(dados->>'email','')||' '||coalesce(dados->>'bairro',''))
) where arquivado_em is null;
create index ma_envios_ultimo_colaborador on private.ma_acessos_envios(municipio_id,colaborador_id,criado_em desc,id desc);

-- Projeção escalar: listas nunca transportam geometria, histórico ou ficha inteira.
create function private.ma_resumo(dados jsonb,campos text[]) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(k,case jsonb_typeof(v)
 when 'string' then to_jsonb(left(v#>>'{}',240))
 when 'array' then (select coalesce(jsonb_agg(left(x#>>'{}',100)),'[]') from (select value x from jsonb_array_elements(v) limit 6) a)
 else v end),'{}')
 from jsonb_each(dados) e(k,v) where k=any(campos) and jsonb_typeof(v) in ('string','number','boolean','null','array');
$$;

create function private.ma_cadastros_pagina(municipio text,modulo text,busca text default '',apos text default null,tamanho integer default 50,projecao text default 'lista') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare esquema jsonb; colecao_alvo text; campos text[]; termos text; consulta tsquery;
 resultado jsonb:='[]'; registro record; item jsonb; ultimo text; bytes integer:=0; mais boolean:=false;
begin
 select documento#>array['esquemas',modulo] into esquema from public.ma_configuracao where id='interface';
 colecao_alvo:=esquema->>'collection';
 if colecao_alvo is null or (private.ma_permitido(municipio,colecao_alvo,'ler') is not true and not (projecao='seletor' and colecao_alvo in ('usuarios','equipes') and private.ma_gerencia_colaboradores(municipio) is true)) then raise exception 'Consulta não permitida' using errcode='42501';end if;
 if tamanho is null or tamanho not between 1 and 100 or length(coalesce(busca,''))>100 or length(coalesce(apos,''))>100 or projecao is null or projecao not in ('lista','seletor') then raise exception 'Consulta inválida' using errcode='22023';end if;
 campos:=array['id','municipioId','nome','identificacao'];
 if projecao='lista' then select campos||coalesce(array_agg(value),'{}') into campos from jsonb_array_elements_text(esquema->'columns');end if;
 select string_agg(quote_literal(x)||':*',' & ') into termos from regexp_split_to_table(lower(btrim(coalesce(busca,''))),'[^[:alnum:]_]+') x where x<>'';
 if position('@' in coalesce(busca,''))>0 then consulta:=plainto_tsquery('simple',btrim(busca));
 elsif termos is not null then consulta:=to_tsquery('simple',termos);end if;
 for registro in select c.id,c.versao,c.dados from public.ma_cadastros c
 where c.municipio_id=municipio and c.colecao=colecao_alvo and c.arquivado_em is null and (apos is null or c.id>apos)
 and (esquema->>'role' is null or c.dados->>'funcao'=esquema->>'role' or c.dados->'papeis' ? (esquema->>'role'))
 and (esquema->>'category' is null or c.dados->>'categoria'=esquema->>'category')
 and (consulta is null or to_tsvector('simple'::regconfig,coalesce(c.dados->>'nome','')||' '||coalesce(c.dados->>'identificacao','')||' '||coalesce(c.dados->>'email','')||' '||coalesce(c.dados->>'bairro','')) @@ consulta)
 order by c.id limit tamanho+1 loop
  item:=jsonb_build_object('id',registro.id,'colecao',colecao_alvo,'versao',registro.versao,'dados',private.ma_resumo(registro.dados,campos));
  if octet_length(item::text)>280000 then raise exception 'Resumo excede o limite de consulta' using errcode='22023';end if;
  if jsonb_array_length(resultado)=tamanho or bytes+octet_length(item::text)>280000 then mais:=true;exit;end if;
  resultado:=resultado||jsonb_build_array(item);ultimo:=registro.id;bytes:=bytes+octet_length(item::text);
 end loop;
 return jsonb_build_object('itens',resultado,'proxima',case when mais then ultimo else null end,'limite',tamanho);
end;$$;

create function private.ma_cadastro_detalhe(municipio text,modulo text,identificador text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare esquema jsonb; colecao_alvo text; resultado jsonb;
begin
 select documento#>array['esquemas',modulo] into esquema from public.ma_configuracao where id='interface';colecao_alvo:=esquema->>'collection';
 if colecao_alvo is null or private.ma_permitido(municipio,colecao_alvo,'ler') is not true then raise exception 'Consulta não permitida' using errcode='42501';end if;
 if identificador is null or length(identificador) not between 1 and 100 then raise exception 'Identificador inválido' using errcode='22023';end if;
 select jsonb_build_object('id',c.id,'colecao',c.colecao,'versao',c.versao,'dados',c.dados) into resultado from public.ma_cadastros c
 where c.municipio_id=municipio and c.colecao=colecao_alvo and c.id=identificador and c.arquivado_em is null
 and (esquema->>'role' is null or c.dados->>'funcao'=esquema->>'role' or c.dados->'papeis' ? (esquema->>'role'))
 and (esquema->>'category' is null or c.dados->>'categoria'=esquema->>'category');
 return resultado;
end;$$;

-- O contexto tem apenas metadados; fichas e seletores são consultados separadamente.
create or replace function private.ma_colaboradores_contexto(municipio text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if private.ma_gerencia_colaboradores(municipio) is not true then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 return jsonb_build_object('municipio',municipio,'papeis',jsonb_build_array('admin','operador','leitor'),
 'colecoes',(select jsonb_agg(colecao order by colecao) from private.ma_permissoes where papel='admin' and ler and colecao<>'prefeituras'));
end;$$;

create function private.ma_colaborador_detalhe(municipio text,identificador text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if private.ma_gerencia_colaboradores(municipio) is not true then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 return (select jsonb_build_object('dados',c.dados,'versao',c.versao,'acesso',case when a.id is not null then to_jsonb(a)-'user_id'-'colecao' else null end,
 'envio',(select jsonb_build_object('estado',e.estado) from private.ma_acessos_envios e where e.municipio_id=c.municipio_id and e.colaborador_id=c.id order by e.criado_em desc,e.id desc limit 1),
 'referencias',(select coalesce(jsonb_object_agg(ref.campo,left(r.dados->>'nome',240)),'{}') from (values('equipe_id','equipes'),('responsavel_id','usuarios'),('substituto_id','usuarios')) ref(campo,colecao)
 join public.ma_cadastros r on r.municipio_id=municipio and r.colecao=ref.colecao and r.id=c.dados->>ref.campo and r.arquivado_em is null))
 from public.ma_cadastros c left join private.ma_colaboradores_acesso a on a.municipio_id=c.municipio_id and a.id=c.id
 where c.municipio_id=municipio and c.colecao='usuarios' and c.id=identificador and c.arquivado_em is null);
end;$$;

create function private.ma_colaboradores_pagina(municipio text,busca text default '',apos text default null,tamanho integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare pagina jsonb; itens jsonb; modulo_pessoas text;
begin
 if private.ma_gerencia_colaboradores(municipio) is not true then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 select key into modulo_pessoas from public.ma_configuracao,jsonb_each(documento->'esquemas') where id='interface' and value->>'collection'='usuarios' and value->>'role' is null order by key limit 1;
 pagina:=private.ma_cadastros_pagina(municipio,modulo_pessoas,busca,apos,tamanho,'seletor');
 select coalesce(jsonb_agg(jsonb_build_object('dados',private.ma_resumo(c.dados,array['id','nome','email','cargo','funcao','equipe_id']),
 'equipe_nome',left(t.dados->>'nome',240),'versao',c.versao,'acesso',case when a.id is null then null else jsonb_build_object('papel',a.papel,'situacao',a.situacao) end,
 'envio',(select jsonb_build_object('estado',e.estado) from private.ma_acessos_envios e where e.municipio_id=c.municipio_id and e.colaborador_id=c.id order by e.criado_em desc,e.id desc limit 1)) order by c.id),'[]') into itens
 from jsonb_array_elements(pagina->'itens') p
 join public.ma_cadastros c on c.municipio_id=municipio and c.colecao='usuarios' and c.id=p->>'id'
 left join private.ma_colaboradores_acesso a on a.municipio_id=c.municipio_id and a.id=c.id
 left join public.ma_cadastros t on t.municipio_id=c.municipio_id and t.colecao='equipes' and t.id=c.dados->>'equipe_id' and t.arquivado_em is null;
 return jsonb_set(pagina,'{itens}',itens);
end;$$;

create function public.ma_cadastros_pagina(municipio text,modulo text,busca text default '',apos text default null,tamanho integer default 50,projecao text default 'lista') returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_cadastros_pagina(municipio,modulo,busca,apos,tamanho,projecao)$$;
create function public.ma_cadastro_detalhe(municipio text,modulo text,identificador text) returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_cadastro_detalhe(municipio,modulo,identificador)$$;
create function public.ma_colaborador_detalhe(municipio text,identificador text) returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_colaborador_detalhe(municipio,identificador)$$;
create function public.ma_colaboradores_pagina(municipio text,busca text default '',apos text default null,tamanho integer default 30) returns jsonb language sql stable security invoker set search_path='' as $$select private.ma_colaboradores_pagina(municipio,busca,apos,tamanho)$$;

grant create on schema private to ma_consultor,ma_gestor_acessos;
-- Revogações/grants precedem a retirada da associação ao proprietário.
do $$declare f record;begin
 for f in select p.oid::regprocedure nome,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('ma_resumo','ma_cadastros_pagina','ma_cadastro_detalhe','ma_colaborador_detalhe','ma_colaboradores_pagina') loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.nome);
  if f.proname<>'ma_resumo' then execute format('grant execute on function %s to authenticated',f.nome);end if;
  if f.nspname='private' then
   if f.proname in ('ma_colaborador_detalhe','ma_colaboradores_pagina') then execute format('alter function %s owner to ma_gestor_acessos',f.nome);
   else execute format('grant execute on function %s to ma_consultor,ma_gestor_acessos',f.nome);execute format('alter function %s owner to ma_consultor',f.nome);end if;
  end if;
 end loop;
end$$;
alter default privileges for role ma_consultor revoke execute on functions from public;
revoke create on schema private from ma_consultor,ma_gestor_acessos;
revoke ma_consultor,ma_gestor_acessos from current_user;
notify pgrst,'reload schema';
commit;
