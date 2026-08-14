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

revoke execute on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
