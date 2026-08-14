create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index transactions_user_occurred_idx on public.transactions (user_id, occurred_on desc);
create index categories_user_idx on public.categories (user_id);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "categories_select_own" on public.categories
  for select using (user_id = (select auth.uid()));
create policy "categories_insert_own" on public.categories
  for insert with check (user_id = (select auth.uid()));
create policy "categories_update_own" on public.categories
  for update using (user_id = (select auth.uid()));
create policy "categories_delete_own" on public.categories
  for delete using (user_id = (select auth.uid()));

create policy "transactions_select_own" on public.transactions
  for select using (user_id = (select auth.uid()));
create policy "transactions_insert_own" on public.transactions
  for insert with check (user_id = (select auth.uid()));
create policy "transactions_update_own" on public.transactions
  for update using (user_id = (select auth.uid()));
create policy "transactions_delete_own" on public.transactions
  for delete using (user_id = (select auth.uid()));

create view public.monthly_projection
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', current_date)::date as month_start,
  coalesce(sum(amount), 0) as spent_so_far,
  extract(day from current_date)::int as days_elapsed,
  extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month,
  round(
    coalesce(sum(amount), 0) / greatest(extract(day from current_date), 1)
    * extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day')),
    2
  ) as projected_month_total
from public.transactions
where occurred_on >= date_trunc('month', current_date)::date
  and occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
group by user_id;
