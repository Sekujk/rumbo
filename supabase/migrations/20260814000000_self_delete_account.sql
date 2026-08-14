-- Autoservicio real de "borrar mi cuenta": el cliente nunca tiene la
-- service_role key (eso sería un hueco de seguridad grave, cualquiera
-- podría extraerla del bundle de la app y borrar cuentas ajenas). La
-- forma correcta en Supabase para que un usuario borre su propia cuenta
-- sin exponer esa clave es una función de Postgres con SECURITY DEFINER:
-- corre con privilegios elevados, pero solo puede tocar las filas del
-- usuario que la invoca, porque usa auth.uid() adentro (que lee el JWT
-- de la sesión, no depende del rol con el que corre la función).

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.transactions where user_id = auth.uid();
  delete from public.income where user_id = auth.uid();
  delete from public.budgets where user_id = auth.uid();
  delete from public.categories where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

-- Solo usuarios autenticados pueden ejecutarla, y solo pueden borrarse a
-- sí mismos: no recibe ningún id como parámetro, así que no hay forma de
-- pasarle el id de otra persona. Postgres otorga EXECUTE a PUBLIC por
-- defecto al crear una función: hay que revocarlo explícitamente de
-- PUBLIC (no solo de "anon"), porque todo rol hereda los privilegios de
-- PUBLIC aunque no se le hayan dado a él directamente.
revoke execute on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
