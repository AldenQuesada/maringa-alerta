begin;
create function wa.contact_erase_snapshots(municipio text,registros jsonb) returns void language sql set search_path='' as $$
 delete from private.ma_historico h where h.tabela='ma_cadastros' and h.municipio_id=municipio
 and exists(select 1 from jsonb_array_elements(registros) r where r->>'id'=h.registro_id and r->>'collection'=coalesce(h.anterior->>'colecao',h.posterior->>'colecao'));
$$;
revoke all on function wa.contact_erase_snapshots(text,jsonb) from public,anon,authenticated,service_role;
-- Token explícito impede uma aba antiga com aviso de arquivamento de executar exclusão definitiva.
create or replace function private.ma_contato_excluir(municipio text,chave text,revisao text) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;s wa.sessions;r record;cfg jsonb;owned jsonb;ids bigint[];
begin
 cfg:=wa.contact_config();
 if auth.uid() is null or not private.ma_acesso(municipio,true) then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
 if left(chave,2)='s:' then
  select ss.* into s from wa.sessions ss join wa.channels c on c.id=ss.channel_id where c.municipio_id=municipio and 's:'||ss.id=chave and not ss.simulation;
  if not found then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.channel_id||':'||s.contact,0));
  perform 1 from wa.sessions where id=s.id for update;
 else
  perform 1 from public.ma_cadastros where municipio_id=municipio and colecao='voluntarios' and 'r:'||id=chave for update;
 end if;
 perform pg_advisory_xact_lock(hashtext('ma_relacoes'),hashtext(municipio));
 select data into item from wa.contact_rows(municipio,chave);
 if item is null or not coalesce((item->>'can_delete')::boolean,false) then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
 if revisao is distinct from 'delete-v1:'||(item->>'revision') then raise exception '%',cfg->'labels'->>'stale' using errcode='40001';end if;
 -- Bloqueia reservas concorrentes antes de verificar envio; reavalia após qualquer commit do worker.
 if s.id is not null then perform 1 from wa.outbox where session_id=s.id order by id for update;end if;
 if s.id is not null and exists(select 1 from wa.outbox where session_id=s.id and state in ('sending','uncertain')) then
  raise exception '%',cfg->'labels'->>'busy' using errcode='55000';end if;
 select coalesce(jsonb_agg(jsonb_build_object('collection',c.colecao,'id',c.id)),'[]') into owned from public.ma_cadastros c
 where c.municipio_id=municipio and ((s.id is null and c.colecao='voluntarios' and c.id=item->>'record_id') or
 exists(select 1 from wa.contact_owned_records x where x.session_id=s.id and x.municipio_id=municipio and x.collection=c.colecao and x.record_id=c.id));
 for r in select c.* from public.ma_cadastros c where c.municipio_id=municipio and exists(select 1 from jsonb_array_elements(owned) x where x->>'collection'=c.colecao and x->>'id'=c.id) order by c.colecao,c.id for update loop
  if not private.ma_permitido(municipio,r.colecao,'excluir') then raise exception '%',cfg->'labels'->>'forbidden' using errcode='42501';end if;
 end loop;
 -- Relação de propriedade autoriza cascata; vínculo de terceiro não transfere propriedade.
 if exists(select 1 from private.ma_referencias ref where ref.municipio_id=municipio
 and exists(select 1 from jsonb_array_elements(owned) x where x->>'collection'=ref.destino_colecao and x->>'id'=ref.destino_id)
 and not exists(select 1 from jsonb_array_elements(owned) x where x->>'collection'=ref.colecao and x->>'id'=ref.id)) then
 raise exception '%',cfg->'labels'->>'linked' using errcode='23503';end if;
 delete from private.ma_referencias ref where ref.municipio_id=municipio and exists(select 1 from jsonb_array_elements(owned) x where x->>'collection'=ref.colecao and x->>'id'=ref.id);
 if s.id is not null then
  select array_agg(id) into ids from wa.inbox where channel_id=s.channel_id and contact=s.contact;
  delete from wa.operations where action like 'contact_%' and (target in(s.id::text,municipio||':s:'||s.id) or (action='contact_media_recovered' and target=any(ids::text[])));
  delete from wa.sessions where id=s.id; -- FKs + propriedade removem todos os filhos e cadastros.
 else delete from public.ma_cadastros where municipio_id=municipio and colecao='voluntarios' and id=item->>'record_id';end if;
 perform wa.contact_erase_snapshots(municipio,owned);
 -- Auditoria mínima do ato, sem telefone, respostas, IDs de contato ou conteúdo apagado.
 insert into wa.operations(actor,action,target) values(auth.uid(),'contact_purge',municipio||':records='||jsonb_array_length(owned));
end $$;
update public.ma_configuracao set documento=(documento-'archive_collections')||jsonb_build_object('deletion',jsonb_build_object('mode','permanent','revision_prefix','delete-v1:')),
 versao=versao+1 where id='contatos';
update public.ma_configuracao set documento=jsonb_set(documento,'{labels}',(documento->'labels')||'{
 "delete_title":"Excluir definitivamente este contato?",
 "delete_description":"Esta ação apaga o contato, as respostas, toda a conversa e os cadastros vinculados de colaboração, pontos públicos, relatos e pedidos de ajuda. Não é possível desfazer. Os anexos privados serão removidos automaticamente em seguida. Depois, uma nova mensagem Oi iniciará um cadastro totalmente vazio.",
 "confirm_delete":"Excluir definitivamente",
 "deleted":"Contato e registros vinculados excluídos definitivamente.",
 "linked":"Há um registro de outro atendimento referenciando este cadastro. Remova esse vínculo antes de excluir.",
 "stale":"Atualize a página para conferir a versão atual e a confirmação de exclusão definitiva."
 }'::jsonb),versao=versao+1 where id='contatos';
commit;
