-- Banco descartável; fixtures revertidas ao final.
begin;
insert into auth.users(id,email) values ('e3000000-0000-4000-8000-000000000001','e3-admin@example.invalid'),('e3000000-0000-4000-8000-000000000002','e3-externo@example.invalid');
insert into public.ma_vinculos(municipio_id,user_id,papel) values('maringa','e3000000-0000-4000-8000-000000000001','admin');
insert into public.ma_cadastros(municipio_id,colecao,id,dados)
select 'maringa','usuarios','e3-'||lpad(n::text,5,'0'),jsonb_build_object('id','e3-'||lpad(n::text,5,'0'),'municipioId','maringa','nome','Pessoa E3 '||n,'funcao','operador','email','e3-'||n||'@example.invalid','telefone','44999999999','endereco','Endereço reservado','bairro','Centro','cargo','Operação','horarios','[]'::jsonb,'documento','SEGREDO-DA-FICHA','observacao',repeat('x',1000)) from generate_series(1,135) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
do $$declare a jsonb;b jsonb;c jsonb;ids text[]:='{}';k text;cur text:=null;i integer:=0;begin
 a:=public.ma_colaboradores_contexto('maringa');
 if a ? 'colaboradores' or a ? 'equipes' then raise exception 'Contexto carrega coleções';end if;
 loop
  a:=public.ma_cadastros_pagina('maringa','pessoas','E3',cur,50,'lista');
  if jsonb_array_length(a->'itens')>50 or octet_length(a::text)>300000 then raise exception 'Página excede orçamento';end if;
  for k in select value->>'id' from jsonb_array_elements(a->'itens') loop
   if k=any(ids) then raise exception 'Registro duplicado entre páginas';end if;ids:=array_append(ids,k);
  end loop;
  if a::text like '%SEGREDO-DA-FICHA%' or a::text like '%Endereço reservado%' then raise exception 'Lista contém ficha completa';end if;
  cur:=a->>'proxima';exit when cur is null;i:=i+1;if i>4 then raise exception 'Cursor não progride';end if;
 end loop;
 if cardinality(ids)<>135 then raise exception 'Registros perdidos: %',cardinality(ids);end if;
 a:=public.ma_cadastro_detalhe('maringa','pessoas','e3-00135');
 if a#>>'{dados,documento}'<>'SEGREDO-DA-FICHA' then raise exception 'Detalhe não contém ficha completa';end if;
 a:=public.ma_colaborador_detalhe('maringa','e3-00135');
 if a#>>'{dados,id}'<>'e3-00135' then raise exception 'Detalhe administrativo falhou';end if;
 a:=public.ma_colaboradores_pagina('maringa','E3',null,30);
 if jsonb_array_length(a->'itens')<>30 or a->>'proxima' is null or a::text like '%SEGREDO-DA-FICHA%' then raise exception 'Página administrativa inválida';end if;
 a:=public.ma_cadastros_pagina('maringa','pessoas','Pessoa E3 135',null,20,'seletor');
 if jsonb_array_length(a->'itens')<>1 or a#>>'{itens,0,id}'<>'e3-00135' then raise exception 'Busca remota não encontra pessoa além da primeira página';end if;
 if a#>'{itens,0,dados}' ? 'email' then raise exception 'Seletor expõe dados desnecessários';end if;
 begin perform public.ma_cadastros_pagina('maringa','pessoas','',null,101);raise exception 'Limite excessivo aceito';exception when invalid_parameter_value then null;end;
 begin perform public.ma_cadastros_pagina('maringa','pessoas','',null,0);raise exception 'Limite zero aceito';exception when invalid_parameter_value then null;end;
 begin perform public.ma_cadastros_pagina('maringa','pessoas',repeat('a',101));raise exception 'Busca excessiva aceita';exception when invalid_parameter_value then null;end;
 begin perform public.ma_cadastros_pagina('inexistente','pessoas');raise exception 'Município externo aceito';exception when insufficient_privilege then null;end;
 begin perform public.ma_cadastro_detalhe('inexistente','pessoas','e3-00135');raise exception 'Detalhe externo aceito';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.ma_cadastros_pagina('maringa','pessoas');raise exception 'Externo leu lista';exception when insufficient_privilege then null;end;
 begin perform private.ma_cadastro_detalhe('maringa','pessoas','e3-00135');raise exception 'Externo leu detalhe privado';exception when insufficient_privilege then null;end;
 begin perform private.ma_colaboradores_pagina('maringa');raise exception 'Externo leu administrativo privado';exception when insufficient_privilege then null;end;
end$$;
set local role anon;
do $$begin begin perform public.ma_cadastros_pagina('maringa','pessoas');raise exception 'Anônimo leu lista';exception when insufficient_privilege then null;end;end$$;
reset role;
-- Administração Geral não precisa receber um vínculo municipal artificial.
insert into private.ma_admins(user_id) values('e3000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
do $$declare p jsonb;begin
 p:=public.ma_colaboradores_pagina('maringa','E3',null,30);
 if jsonb_array_length(p->'itens')<>30 then raise exception 'Admin Geral sem vínculo perdeu a lista';end if;
 p:=public.ma_cadastros_pagina('maringa','pessoas','E3',null,20,'seletor');
 if jsonb_array_length(p->'itens')<>20 then raise exception 'Admin Geral sem vínculo perdeu o seletor';end if;
 begin perform public.ma_cadastros_pagina('maringa','pessoas','',null,20,'lista');raise exception 'Seletor administrativo abriu leitura municipal geral';exception when insufficient_privilege then null;end;
 begin perform public.ma_cadastro_detalhe('maringa','pessoas','e3-00135');raise exception 'Detalhe genérico ignorou vínculo municipal';exception when insufficient_privilege then null;end;
 if public.ma_colaborador_detalhe('maringa','e3-00135')#>>'{dados,id}'<>'e3-00135' then raise exception 'Admin Geral perdeu detalhe administrativo';end if;
end$$;
reset role;
update public.ma_prefeituras set dados=jsonb_set(dados,'{status}','"suspensa"') where id='maringa';
set local role authenticated;
do $$begin
 begin perform public.ma_colaboradores_pagina('maringa');raise exception 'Município suspenso manteve lista';exception when insufficient_privilege then null;end;
 begin perform public.ma_colaborador_detalhe('maringa','e3-00135');raise exception 'Município suspenso manteve detalhe';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
