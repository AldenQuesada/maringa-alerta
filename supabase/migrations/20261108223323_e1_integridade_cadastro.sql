begin;
-- Nenhuma ficha é reescrita ou excluída. Duplicidades existentes exigem reconciliação explícita.
lock table public.ma_cadastros in share row exclusive mode;
do $$begin
 if exists(select 1 from public.ma_cadastros where colecao='usuarios' and nullif(btrim(dados->>'email'),'') is not null
 group by municipio_id,lower(btrim(dados->>'email')) having count(*)>1) then
  raise exception 'Existem e-mails duplicados em pessoas do mesmo município. Reconcilie as fichas antes de aplicar a migração.' using errcode='23514';
 end if;
end$$;
create unique index ma_usuarios_email_unico on public.ma_cadastros(municipio_id,lower(btrim(dados->>'email')))
 where colecao='usuarios' and nullif(btrim(dados->>'email'),'') is not null;
insert into public.ma_configuracao(id,documento) values('colaboradores','{"versao":1,"campos":{"nome":{"tipo":"texto","obrigatorio":true,"maximo":500},"email":{"tipo":"texto","obrigatorio":true,"maximo":254},"telefone":{"tipo":"texto","obrigatorio":true,"maximo":500},"endereco":{"tipo":"texto","obrigatorio":true,"maximo":500},"bairro":{"tipo":"texto","obrigatorio":true,"maximo":500},"cargo":{"tipo":"texto","obrigatorio":true,"maximo":500},"funcao":{"tipo":"texto","obrigatorio":true,"maximo":500},"cep":{"tipo":"texto","obrigatorio":false,"maximo":500},"numero":{"tipo":"texto","obrigatorio":false,"maximo":500},"complemento":{"tipo":"texto","obrigatorio":false,"maximo":500},"documento":{"tipo":"texto","obrigatorio":false,"maximo":80},"nascimento":{"tipo":"texto","obrigatorio":false,"maximo":500},"orgao":{"tipo":"texto","obrigatorio":false,"maximo":500},"especialidade":{"tipo":"texto","obrigatorio":false,"maximo":500},"equipe_id":{"tipo":"texto","obrigatorio":false,"maximo":500},"responsavel_id":{"tipo":"texto","obrigatorio":false,"maximo":500},"substituto_id":{"tipo":"texto","obrigatorio":false,"maximo":500},"estrutura_id":{"tipo":"texto","obrigatorio":false,"maximo":500},"zona":{"tipo":"texto","obrigatorio":false,"maximo":500},"status":{"tipo":"texto","obrigatorio":false,"maximo":500},"verificacao":{"tipo":"texto","obrigatorio":false,"maximo":500},"horarios":{"tipo":"horarios","obrigatorio":true,"maximo":21},"papeis":{"tipo":"funcoes","obrigatorio":false,"maximo":5},"id":{"tipo":"texto","obrigatorio":true,"maximo":100},"municipioId":{"tipo":"texto","obrigatorio":true,"maximo":100}},"funcoes":["admin","responsavel","substituto","coordenador","operador"]}'::jsonb);

create function private.ma_colaborador_validar_ficha(ficha jsonb,anterior jsonb default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare contrato jsonb;campo text;regra jsonb;valor jsonb;texto text;resultado jsonb:=ficha;nascimento date;
begin
 select documento into contrato from public.ma_configuracao where id='colaboradores';
 if contrato is null or jsonb_typeof(ficha) is distinct from 'object' or octet_length(ficha::text)>100000 then
  raise exception 'Ficha inválida ou muito grande.' using errcode='23514';end if;
 for campo,valor in select key,value from jsonb_each(ficha) loop
  -- Extensões legadas são preservadas, mas não podem ser criadas ou alteradas por este comando.
  if not (contrato->'campos' ? campo) and (anterior is null or not anterior ? campo or anterior->campo is distinct from valor) then
   raise exception 'Campo não permitido no cadastro: %',campo using errcode='23514';end if;
 end loop;
 for campo,regra in select key,value from jsonb_each(contrato->'campos') loop
  valor:=ficha->campo;
  if not ficha ? campo then
   if (regra->>'obrigatorio')::boolean then raise exception 'Preencha o campo %',campo using errcode='23514';end if;
   continue;
  end if;
  if regra->>'tipo'='texto' then
   if jsonb_typeof(valor) is distinct from 'string' then raise exception 'Formato inválido no campo %',campo using errcode='23514';end if;
   texto:=btrim(ficha->>campo);
   if length(texto)>(regra->>'maximo')::integer or ((regra->>'obrigatorio')::boolean and texto='') then
    raise exception 'Preencha corretamente o campo %',campo using errcode='23514';end if;
   resultado:=jsonb_set(resultado,array[campo],to_jsonb(texto));
  else
   if jsonb_typeof(valor) is distinct from 'array' or jsonb_array_length(valor)>(regra->>'maximo')::integer then
    raise exception 'Lista inválida no campo %',campo using errcode='23514';end if;
   if regra->>'tipo'='funcoes' and exists(select 1 from jsonb_array_elements(valor) x where jsonb_typeof(x)<>'string' or not contrato->'funcoes' @> jsonb_build_array(x)) then
    raise exception 'Funções de atuação inválidas.' using errcode='23514';end if;
  end if;
 end loop;
 texto:=lower(resultado->>'email');
 if texto !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido.' using errcode='23514';end if;
 resultado:=jsonb_set(resultado,'{email}',to_jsonb(texto));
 texto:=resultado->>'telefone';
 if texto !~ '^\+?[0-9 ()-]+$' or length(regexp_replace(texto,'[^0-9]','','g')) not between 10 and 15 then
  raise exception 'Informe um telefone válido, com DDD.' using errcode='23514';end if;
 resultado:=jsonb_set(resultado,'{telefone}',to_jsonb(regexp_replace(texto,'[^0-9]','','g')));
 texto:=coalesce(resultado->>'cep','');
 if texto<>'' then
  if texto !~ '^[0-9]{5}-?[0-9]{3}$' then raise exception 'CEP inválido.' using errcode='23514';end if;
  resultado:=jsonb_set(resultado,'{cep}',to_jsonb(replace(texto,'-','')));
 end if;
 texto:=coalesce(resultado->>'nascimento','');
 if texto<>'' then
  begin
   if texto !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_datetime_format;end if;
   nascimento:=texto::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Data de nascimento inválida.' using errcode='23514';end;
  if nascimento>current_date then raise exception 'Nascimento não pode estar no futuro.' using errcode='23514';end if;
 end if;
 if not contrato->'funcoes' @> jsonb_build_array(resultado->'funcao') then raise exception 'Função inválida.' using errcode='23514';end if;
 return resultado;
end;$$;
revoke all on function private.ma_colaborador_validar_ficha(jsonb,jsonb) from public,anon,authenticated,service_role,ma_escritor;

-- O papel da porta genérica não pode criar, alterar ou excluir pessoas.
-- Dados legados permanecem íntegros e são completados na mesma ficha pelo administrador.
create or replace function private.ma_colaborador_proteger_ficha() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('ma_escritor','authenticated','anon') then
  raise exception 'Use o cadastro completo de colaboradores para alterar pessoas e seus acessos.' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;end if;
 return new;
end;$$;
drop trigger ma_proteger_colaborador on public.ma_cadastros;
create trigger ma_proteger_colaborador_novo before insert on public.ma_cadastros
 for each row when(new.colecao='usuarios') execute function private.ma_colaborador_proteger_ficha();
create trigger ma_proteger_colaborador_edicao before update on public.ma_cadastros
 for each row when(old.colecao='usuarios' or new.colecao='usuarios') execute function private.ma_colaborador_proteger_ficha();
create trigger ma_proteger_colaborador_exclusao before delete on public.ma_cadastros
 for each row when(old.colecao='usuarios') execute function private.ma_colaborador_proteger_ficha();

create or replace function private.ma_colaborador_salvar(municipio text,identificador text,ficha jsonb,acesso jsonb,versao_esperada bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare anterior public.ma_cadastros; salvo public.ma_cadastros; vinc private.ma_colaboradores_acesso; dados_novos jsonb;
 correio text; papel_novo text; situacao_nova text; permitidas text[]; campo text; horario jsonb;
begin
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Administração municipal obrigatória' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('ma_operacao'),hashtext(municipio));
 if not private.ma_gerencia_colaboradores(municipio) then raise exception 'Acesso administrativo revogado' using errcode='42501';end if;
 if octet_length(coalesce(acesso::text,''))>10000 or octet_length(coalesce(ficha::text,''))>100000 or identificador is null or length(identificador) not between 1 and 100 or jsonb_typeof(ficha) is distinct from 'object' or jsonb_typeof(acesso) is distinct from 'object' then raise exception 'Ficha inválida' using errcode='22023';end if;
 select * into anterior from public.ma_cadastros where municipio_id=municipio and colecao='usuarios' and id=identificador for update;
 if anterior.versao is distinct from versao_esperada then raise exception 'Ficha alterada. Atualize antes de salvar.' using errcode='40001';end if;
 dados_novos:=private.ma_colaborador_validar_ficha(coalesce(anterior.dados,'{}')||ficha||jsonb_build_object('id',identificador,'municipioId',municipio),anterior.dados);
 for campo in select unnest(array['nome','email','telefone','endereco','bairro','cargo','funcao']) loop
  if jsonb_typeof(dados_novos->campo) is distinct from 'string' or length(btrim(dados_novos->>campo)) not between 1 and 500 then raise exception 'Preencha o campo %',campo using errcode='23514';end if;
 end loop;
 correio:=lower(btrim(dados_novos->>'email')); dados_novos:=jsonb_set(dados_novos,'{email}',to_jsonb(correio));
 if exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao='usuarios' and id<>identificador and lower(btrim(dados->>'email'))=correio) then raise exception 'Esta pessoa já tem cadastro. Edite a ficha existente.' using errcode='23514';end if;
 if length(correio)>254 or correio !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido' using errcode='23514';end if;
 if dados_novos->>'funcao' not in ('admin','responsavel','substituto','coordenador','operador') then raise exception 'Função inválida' using errcode='23514';end if;
 if jsonb_typeof(dados_novos->'horarios') is distinct from 'array' or jsonb_array_length(dados_novos->'horarios')>21 then raise exception 'Informe os horários de atuação' using errcode='23514';end if;
 for horario in select value from jsonb_array_elements(dados_novos->'horarios') loop
  if jsonb_typeof(horario) is distinct from 'object' or coalesce(horario->>'dia','') !~ '^[0-6]$' or coalesce(horario->>'inicio','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(horario->>'fim','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or horario->>'inicio'>=horario->>'fim' then raise exception 'Horário inválido; divida plantões que atravessam a meia-noite.' using errcode='23514';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(dados_novos->'horarios') with ordinality x(a,i),jsonb_array_elements(dados_novos->'horarios') with ordinality y(b,j) where i<j and a->>'dia'=b->>'dia' and a->>'inicio'<b->>'fim' and b->>'inicio'<a->>'fim') then raise exception 'Horários sobrepostos' using errcode='23514';end if;
 for campo in select unnest(array['equipe_id','responsavel_id','substituto_id']) loop
  if nullif(dados_novos->>campo,'') is not null then
   if campo<>'equipe_id' and dados_novos->>campo=identificador then raise exception 'Selecione outra pessoa como responsável ou substituto' using errcode='23514';end if;
   if not exists(select 1 from public.ma_cadastros where municipio_id=municipio and colecao=case when campo='equipe_id' then 'equipes' else 'usuarios' end and id=dados_novos->>campo and arquivado_em is null) then raise exception 'Referência fora deste município' using errcode='23514';end if;
  end if;
 end loop;
 if exists(with recursive chefia(id) as (
  select nullif(dados_novos->>'responsavel_id','')
  union
  select nullif(c.dados->>'responsavel_id','') from public.ma_cadastros c join chefia r on c.id=r.id
   where c.municipio_id=municipio and c.colecao='usuarios'
 ) select 1 from chefia where id=identificador) then raise exception 'A relação de responsáveis não pode formar um círculo.' using errcode='23514';end if;
 papel_novo:=acesso->>'papel'; situacao_nova:=acesso->>'situacao';
 if papel_novo is null or papel_novo not in ('admin','operador','leitor') or situacao_nova is null or situacao_nova not in ('pendente','ativo','suspenso') or jsonb_typeof(acesso->'colecoes') is distinct from 'array' then raise exception 'Permissões inválidas' using errcode='23514';end if;
 select coalesce(array_agg(distinct value),'{}') into permitidas from jsonb_array_elements_text(acesso->'colecoes');
 if exists(select 1 from unnest(permitidas) x where not exists(select 1 from private.ma_permissoes p where p.papel='admin' and p.colecao=x and p.ler and p.colecao<>'prefeituras')) then raise exception 'Cadastro não permitido para esse papel' using errcode='23514';end if;
 select * into vinc from private.ma_colaboradores_acesso where municipio_id=municipio and id=identificador for update;
 if vinc.user_id is not null and vinc.email<>correio then raise exception 'E-mail de conta já ativada não pode ser trocado pela ficha.' using errcode='23514';end if;
 if vinc.user_id=auth.uid() and (papel_novo<>'admin' or situacao_nova<>'ativo') then raise exception 'Peça a outro administrador para alterar seu próprio acesso.' using errcode='23514';end if;
 if vinc.user_id is null and situacao_nova='ativo' then situacao_nova:='pendente';end if;
 dados_novos:=jsonb_set(dados_novos,'{status}',to_jsonb(case when situacao_nova='suspenso' then 'Inativo' else 'Ativo' end));
 if anterior.id is null then
  insert into public.ma_cadastros(municipio_id,colecao,id,dados) values(municipio,'usuarios',identificador,dados_novos) returning * into salvo;
 else
  update public.ma_cadastros set dados=dados_novos where municipio_id=municipio and colecao='usuarios' and id=identificador returning * into salvo;
 end if;
 insert into private.ma_colaboradores_acesso(municipio_id,id,email,papel,colecoes,situacao)
 values(municipio,identificador,correio,papel_novo,permitidas,situacao_nova)
 on conflict(municipio_id,id) do update set email=excluded.email,papel=excluded.papel,colecoes=excluded.colecoes,situacao=excluded.situacao;
 if vinc.user_id is not null then update public.ma_vinculos set papel=papel_novo where municipio_id=municipio and user_id=vinc.user_id;end if;
 -- Qualquer mudança na ficha exige novo envio; um link não autoriza versão antiga de permissões.
 update private.ma_acessos_envios set revogado_em=clock_timestamp() where municipio_id=municipio and colaborador_id=identificador and revogado_em is null and aceito_em is null;
 return jsonb_build_object('dados',salvo.dados,'versao',salvo.versao,'situacao',situacao_nova);
end;$$;
notify pgrst,'reload schema';
commit;
