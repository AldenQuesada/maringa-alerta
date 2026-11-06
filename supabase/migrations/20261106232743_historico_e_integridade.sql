begin;
-- Histórico próprio: somente o servidor grava. Inclui valores para reconstrução.
create table private.ma_historico (
 id bigint generated always as identity primary key,
 criado_em timestamptz not null default clock_timestamp(),
 ator uuid, transacao bigint not null default txid_current(),
 tabela text not null,municipio_id text,registro_id text not null,
 operacao text not null,anterior jsonb,posterior jsonb
);
alter table private.ma_historico enable row level security;
revoke all on private.ma_historico from public,anon,authenticated,ma_escritor;
revoke all on sequence private.ma_historico_id_seq from public,anon,authenticated,ma_escritor;
create index ma_historico_municipio_data on private.ma_historico(municipio_id,criado_em desc,id desc);
create function private.ma_registrar_historico() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb; p jsonb; r jsonb;
begin
 if TG_OP<>'INSERT' then a:=to_jsonb(old);end if;
 if TG_OP<>'DELETE' then p:=to_jsonb(new);end if;
 r:=coalesce(p,a);
 insert into private.ma_historico(ator,tabela,municipio_id,registro_id,operacao,anterior,posterior)
 values(auth.uid(),TG_TABLE_NAME,case when TG_TABLE_NAME='ma_prefeituras' then r->>'id' else r->>'municipio_id' end,coalesce(r->>'id',r->>'user_id'),TG_OP,a,p);
 return null;
end;
$$;
revoke all on function private.ma_registrar_historico() from public,anon,authenticated,ma_escritor;
create trigger ma_historico_cadastros after insert or update or delete on public.ma_cadastros for each row execute function private.ma_registrar_historico();
create trigger ma_historico_prefeituras after insert or update or delete on public.ma_prefeituras for each row execute function private.ma_registrar_historico();
create trigger ma_historico_vinculos after insert or update or delete on public.ma_vinculos for each row execute function private.ma_registrar_historico();
create trigger ma_historico_admins after insert or update or delete on private.ma_admins for each row execute function private.ma_registrar_historico();
create table private.ma_referencias (
 municipio_id text not null,colecao text not null,id text not null,campo text not null,
 destino_colecao text not null,destino_id text not null,
 primary key(municipio_id,colecao,id,campo),
 foreign key(municipio_id,colecao,id) references public.ma_cadastros(municipio_id,colecao,id) on delete cascade,
 foreign key(municipio_id,destino_colecao,destino_id) references public.ma_cadastros(municipio_id,colecao,id) on delete restrict
);
create index ma_referencias_destino on private.ma_referencias(municipio_id,destino_colecao,destino_id);
alter table private.ma_referencias enable row level security;
revoke all on private.ma_referencias from public,anon,authenticated,ma_escritor;
-- Relações mantidas como configuração, não como condição de interface.
insert into public.ma_configuracao(id,documento) values('relacoes','{"usuarios":{"estrutura_id":"instituicoes","substituto_id":"usuarios"},"instituicoes":{"responsavel_id":"usuarios"},"eventos":{"mapa_evento_id":"eventos"},"solicitacoes":{"atribuido_a":"voluntarios"},"integrantes":{"equipe":"equipes"}}');
create function private.ma_integridade_relacoes() returns trigger language plpgsql security definer set search_path='' as $$
declare campo text; destino text; valor text;
begin
 perform pg_advisory_xact_lock(hashtext('ma_relacoes'),hashtext(new.municipio_id));
 delete from private.ma_referencias where municipio_id=new.municipio_id and colecao=new.colecao and id=new.id;
 for campo,destino in select key,value from jsonb_each_text(coalesce((select documento->new.colecao from public.ma_configuracao where id='relacoes'),'{}')) loop
  valor:=nullif(new.dados->>campo,'');
  if valor is not null then
   if destino=new.colecao and valor=new.id then raise exception 'Autorreferência proibida' using errcode='23514';end if;
   insert into private.ma_referencias values(new.municipio_id,new.colecao,new.id,campo,destino,valor);
  end if;
 end loop;
 if new.colecao='eventos' and exists(
  with recursive alcance(id) as (
   select destino_id from private.ma_referencias where municipio_id=new.municipio_id and colecao='eventos' and id=new.id
   union
   select r.destino_id from private.ma_referencias r join alcance a on r.id=a.id where r.municipio_id=new.municipio_id and r.colecao='eventos'
  ) select 1 from alcance where id=new.id
 ) then raise exception 'Vínculo circular de eventos proibido' using errcode='23514';end if;
 return null;
end;
$$;
revoke all on function private.ma_integridade_relacoes() from public,anon,authenticated,ma_escritor;
create trigger ma_relacoes_cadastro after insert or update on public.ma_cadastros for each row execute function private.ma_integridade_relacoes();
-- A carga real atual não contém relações de IDs. Interromper em vez de ignorar
-- referências existentes: uma integração futura deverá migrá-las explicitamente.
do $$begin
 if exists(select 1 from public.ma_cadastros c cross join lateral jsonb_each_text(coalesce((select documento->c.colecao from public.ma_configuracao where id='relacoes'),'{}')) r where nullif(c.dados->>r.key,'') is not null) then
  raise exception 'Existem relações anteriores: preparar backfill antes de instalar esta migração';
 end if;
end$$;
commit;
