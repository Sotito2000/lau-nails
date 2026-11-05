-- Parche de endurecimiento. Ejecútalo UNA vez en Supabase -> SQL Editor (después de schema.sql).
-- Valida el nombre al crear una invitación (no vacío, máximo 80 caracteres).
create or replace function public.admin_create_invite(p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea := gen_random_bytes(8); code text := ''; i int;
        nm text := left(trim(coalesce(p_name, '')), 80);
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if nm = '' then raise exception 'name_required'; end if;
  for i in 0..7 loop code := code || substr(alphabet, 1 + (get_byte(b, i) % 31), 1); end loop;
  insert into public.invites(code_hash, client_name) values (encode(digest(code, 'sha256'), 'hex'), nm);
  return substr(code, 1, 4) || '-' || substr(code, 5, 4);
end $$;
