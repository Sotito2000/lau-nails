-- Lau Nails · acceso de clientas con códigos de invitación de un solo uso
-- Ejecuta este archivo ENTERO en Supabase -> SQL Editor.
-- Seguridad: todas las tablas tienen RLS activado SIN políticas, así que nadie puede leerlas directamente.
-- Todo el acceso pasa por las funciones de abajo (security definer), que comprueban quién llama.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admins (user_id uuid primary key references auth.users on delete cascade);
create table if not exists public.clients (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null, email text, active boolean not null default true,
  session_token text, created_at timestamptz not null default now(), last_login timestamptz);
create table if not exists public.invites (
  id bigserial primary key, code_hash text not null unique, client_name text not null,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users, used_at timestamptz, revoked boolean not null default false);
create table if not exists public.claim_attempts (
  user_id uuid primary key references auth.users on delete cascade, n int not null default 0, last_at timestamptz default now());
create table if not exists public.site_content (key text primary key, html text not null, booking_url text);

alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.invites enable row level security;
alter table public.claim_attempts enable row level security;
alter table public.site_content enable row level security;
revoke all on public.admins, public.clients, public.invites, public.claim_attempts, public.site_content from anon, authenticated;

-- ---------- utilidades ----------
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public, extensions as
$$ select exists(select 1 from public.admins where user_id = auth.uid()) $$;

-- ---------- clienta ----------
create or replace function public.client_status() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare c public.clients;
begin
  if auth.uid() is null then return 'anon'; end if;
  select * into c from public.clients where user_id = auth.uid();
  if not found then return 'needs_invite'; end if;
  if not c.active then return 'blocked'; end if;
  return 'client';
end $$;

-- Canjea un código de invitación: devuelve 'ok', 'invalid' o 'locked' (5 fallos)
create or replace function public.claim_invite(p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); a public.claim_attempts; inv public.invites; em text; norm text;
begin
  if uid is null then return 'invalid'; end if;
  if exists(select 1 from public.clients where user_id = uid) then return 'ok'; end if;
  insert into public.claim_attempts(user_id) values (uid) on conflict do nothing;
  select * into a from public.claim_attempts where user_id = uid for update;
  if a.n >= 5 then return 'locked'; end if;
  norm := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  select * into inv from public.invites
   where code_hash = encode(digest(norm, 'sha256'), 'hex')
     and used_by is null and not revoked and expires_at > now() for update;
  if not found then
    update public.claim_attempts set n = n + 1, last_at = now() where user_id = uid;
    return 'invalid';
  end if;
  select email into em from auth.users where id = uid;
  insert into public.clients(user_id, name, email) values (uid, inv.client_name, em);
  update public.invites set used_by = uid, used_at = now() where id = inv.id;
  return 'ok';
end $$;

-- Abre sesión: invalida la anterior (una sola sesión activa por clienta) y devuelve el token nuevo
create or replace function public.open_session() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare tok text := encode(gen_random_bytes(24), 'hex');
begin
  if public.client_status() <> 'client' then return null; end if;
  update public.clients set session_token = tok, last_login = now() where user_id = auth.uid();
  return tok;
end $$;

create or replace function public.check_session(p_token text) returns boolean
language sql security definer stable set search_path = public, extensions as
$$ select exists(select 1 from public.clients where user_id = auth.uid() and active and session_token = p_token) $$;

-- Contenido privado (servicios, galería, reservas) solo con sesión válida
create or replace function public.get_private(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare c public.clients; res json;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'reason', 'anon'); end if;
  select * into c from public.clients where user_id = auth.uid();
  if not found or not c.active then return json_build_object('ok', false, 'reason', 'blocked'); end if;
  if c.session_token is distinct from p_token then return json_build_object('ok', false, 'reason', 'session'); end if;
  select json_build_object('ok', true, 'html', s.html, 'booking_url', s.booking_url) into res
    from public.site_content s where s.key = 'interior';
  return coalesce(res, json_build_object('ok', false, 'reason', 'empty'));
end $$;

-- ---------- administradora (Laura) ----------
create or replace function public.admin_create_invite(p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea := gen_random_bytes(8); code text := ''; i int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  for i in 0..7 loop code := code || substr(alphabet, 1 + (get_byte(b, i) % 31), 1); end loop;
  insert into public.invites(code_hash, client_name) values (encode(digest(code, 'sha256'), 'hex'), trim(p_name));
  return substr(code, 1, 4) || '-' || substr(code, 5, 4);   -- solo se muestra ahora; en la base queda su huella
end $$;

create or replace function public.admin_list_clients()
returns table(user_id uuid, name text, email text, active boolean, last_login timestamptz, created_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select c.user_id, c.name, c.email, c.active, c.last_login, c.created_at
    from public.clients c order by c.created_at desc;
end $$;

create or replace function public.admin_list_invites()
returns table(id bigint, client_name text, created_at timestamptz, expires_at timestamptz, used_at timestamptz, revoked boolean)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select i.id, i.client_name, i.created_at, i.expires_at, i.used_at, i.revoked
    from public.invites i order by i.created_at desc limit 100;
end $$;

create or replace function public.admin_set_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.clients set active = p_active, session_token = case when p_active then session_token else null end
   where user_id = p_user;
end $$;

create or replace function public.admin_kick(p_user uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.clients set session_token = null where user_id = p_user;
end $$;

create or replace function public.admin_revoke_invite(p_id bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.invites set revoked = true where id = p_id and used_by is null;
end $$;

-- ---------- permisos: solo usuarios con sesión pueden llamar a las funciones ----------
revoke all on function public.is_admin(), public.client_status(), public.claim_invite(text), public.open_session(),
  public.check_session(text), public.get_private(text), public.admin_create_invite(text), public.admin_list_clients(),
  public.admin_list_invites(), public.admin_set_active(uuid, boolean), public.admin_kick(uuid), public.admin_revoke_invite(bigint)
  from public, anon;
grant execute on function public.is_admin(), public.client_status(), public.claim_invite(text), public.open_session(),
  public.check_session(text), public.get_private(text), public.admin_create_invite(text), public.admin_list_clients(),
  public.admin_list_invites(), public.admin_set_active(uuid, boolean), public.admin_kick(uuid), public.admin_revoke_invite(bigint)
  to authenticated;

-- ---------- almacenamiento privado para fotos y vídeos de la galería ----------
insert into storage.buckets(id, name, public) values ('gallery', 'gallery', false) on conflict (id) do nothing;
drop policy if exists "clientas leen galeria" on storage.objects;
create policy "clientas leen galeria" on storage.objects for select to authenticated
  using (bucket_id = 'gallery' and exists(select 1 from public.clients c where c.user_id = auth.uid() and c.active));
