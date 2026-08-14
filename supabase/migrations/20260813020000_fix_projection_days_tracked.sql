drop view if exists public.monthly_projection;
drop view if exists public.category_monthly_projection;

create view public.monthly_projection
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', current_date)::date as month_start,
  coalesce(sum(amount), 0) as spent_so_far,
  extract(day from current_date)::int as days_elapsed,
  extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month,
  greatest((current_date - min(occurred_on) + 1), 1)::int as days_tracked,
  round(
    coalesce(sum(amount), 0) / greatest((current_date - min(occurred_on) + 1), 1)
    * extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day')),
    2
  ) as projected_month_total
from public.transactions
where occurred_on >= date_trunc('month', current_date)::date
  and occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
group by user_id;

create view public.category_monthly_projection
with (security_invoker = true) as
select
  t.user_id,
  t.category_id,
  c.name as category_name,
  coalesce(sum(t.amount), 0) as spent_so_far,
  extract(day from current_date)::int as days_elapsed,
  extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month,
  greatest((current_date - min(t.occurred_on) + 1), 1)::int as days_tracked,
  round(
    coalesce(sum(t.amount), 0) / greatest((current_date - min(t.occurred_on) + 1), 1)
    * extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day')),
    2
  ) as projected_month_total
from public.transactions t
join public.categories c on c.id = t.category_id
where t.occurred_on >= date_trunc('month', current_date)::date
  and t.occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
group by t.user_id, t.category_id, c.name;
