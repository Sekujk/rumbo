-- Ingresos + presupuestos por categoría, para poder responder "gasté mucho
-- o poco" con datos reales del propio usuario en vez de un número general
-- sin punto de comparación.

create table public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  source text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_limit numeric(10, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index income_user_occurred_idx on public.income (user_id, occurred_on desc);
create index budgets_user_idx on public.budgets (user_id);

alter table public.income enable row level security;
alter table public.budgets enable row level security;

create policy "income_select_own" on public.income
  for select using (user_id = (select auth.uid()));
create policy "income_insert_own" on public.income
  for insert with check (user_id = (select auth.uid()));
create policy "income_update_own" on public.income
  for update using (user_id = (select auth.uid()));
create policy "income_delete_own" on public.income
  for delete using (user_id = (select auth.uid()));

create policy "budgets_select_own" on public.budgets
  for select using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets
  for insert with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets
  for update using (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets
  for delete using (user_id = (select auth.uid()));

-- Ingreso total registrado en el mes en curso. No se proyecta (a diferencia
-- del gasto): el ingreso suele entrar de golpe (sueldo) en vez de a un
-- ritmo diario parejo, así que extrapolarlo daría un número engañoso.
create view public.monthly_income
with (security_invoker = true) as
select
  user_id,
  coalesce(sum(amount), 0) as income_so_far
from public.income
where occurred_on >= date_trunc('month', current_date)::date
  and occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
group by user_id;

-- Mismo run-rate que monthly_projection (ver migración anterior), pero
-- por categoría en vez de un solo total, para poder decir en qué
-- categoría se va a ir la plata, no solo cuánto en total.
create view public.category_monthly_projection
with (security_invoker = true) as
select
  t.user_id,
  t.category_id,
  c.name as category_name,
  coalesce(sum(t.amount), 0) as spent_so_far,
  extract(day from current_date)::int as days_elapsed,
  extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month,
  round(
    coalesce(sum(t.amount), 0) / greatest(extract(day from current_date), 1)
    * extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day')),
    2
  ) as projected_month_total
from public.transactions t
join public.categories c on c.id = t.category_id
where t.occurred_on >= date_trunc('month', current_date)::date
  and t.occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
group by t.user_id, t.category_id, c.name;

-- Promedio de gasto por categoría en meses YA CERRADOS (excluye el mes en
-- curso a propósito: un mes a mitad de camino no es comparable con uno
-- completo). Sin historial previo, esta vista simplemente no devuelve filas
-- para ese usuario/categoría: el cliente debe mostrar "sin historial
-- todavía" en vez de tratar la ausencia de filas como cero.
create view public.category_historical_average
with (security_invoker = true) as
select
  user_id,
  category_id,
  round(avg(monthly_total), 2) as avg_monthly_spent,
  count(*)::int as months_counted
from (
  select
    user_id,
    category_id,
    date_trunc('month', occurred_on) as month,
    sum(amount) as monthly_total
  from public.transactions
  where occurred_on < date_trunc('month', current_date)
  group by user_id, category_id, date_trunc('month', occurred_on)
) monthly
group by user_id, category_id;
