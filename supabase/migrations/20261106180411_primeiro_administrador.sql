begin;
-- Somente e-mail comprovado pelo Auth pode consumir o convite inicial.
create table private.ma_convites_iniciais(email text primary key, utilizado_por uuid references auth.users(id));
alter table private.ma_convites_iniciais enable row level security;
revoke all on private.ma_convites_iniciais from public,anon,authenticated;
create function private.ma_primeiro_admin() returns trigger language plpgsql security definer set search_path = '' as $$
declare convite text;
begin
 if new.email_confirmed_at is null then return new; end if;
 update private.ma_convites_iniciais set utilizado_por=new.id where email=lower(new.email) and utilizado_por is null returning email into convite;
 if convite is not null then
  insert into private.ma_admins(user_id) values(new.id) on conflict do nothing;
  insert into public.ma_vinculos(municipio_id,user_id,papel) values('maringa',new.id,'admin') on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.ma_primeiro_admin() from public,anon,authenticated;
create trigger ma_admin_confirmado after insert or update of email_confirmed_at,email on auth.users for each row execute function private.ma_primeiro_admin();
commit;
