drop view if exists public.monthly_projection;
drop view if exists public.category_monthly_projection;
drop view if exists public.monthly_income;
drop view if exists public.category_historical_average;

create function public.monthly_projection(p_today date)
returns table (
  user_id uuid,
  month_start date,
  spent_so_far numeric,
  days_elapsed int,
  days_in_month int,
  days_tracked int,
  outlier_count int,
  outlier_spent numeric,
  projected_month_total numeric,
  projected_low numeric,
  projected_high numeric
)
language sql
security invoker
stable
as $$
  with tx as (
    select
      user_id,
      amount,
      occurred_on,
      count(*) over (partition by user_id) as tx_count,
      avg(amount) over (partition by user_id) as avg_amount,
      stddev_samp(amount) over (partition by user_id) as stddev_amount
    from public.transactions
    where occurred_on >= date_trunc('month', p_today)::date
      and occurred_on < (date_trunc('month', p_today) + interval '1 month')::date
  ),
  flagged as (
    select
      *,
      (tx_count >= 5 and coalesce(stddev_amount, 0) > 0 and abs(amount - avg_amount) > 2 * stddev_amount) as is_outlier
    from tx
  ),
  agg as (
    select
      user_id,
      sum(amount) as spent_so_far,
      coalesce(sum(amount) filter (where not is_outlier), 0) as regular_spent,
      coalesce(sum(amount) filter (where is_outlier), 0) as outlier_spent,
      count(*) filter (where is_outlier)::int as outlier_count,
      coalesce(max(stddev_amount), 0) as amount_stddev,
      extract(day from p_today)::int as days_elapsed,
      extract(day from (date_trunc('month', p_today) + interval '1 month - 1 day'))::int as days_in_month,
      greatest((p_today - min(occurred_on) + 1), 1)::int as days_tracked
    from flagged
    group by user_id
  )
  select
    user_id,
    date_trunc('month', p_today)::date as month_start,
    spent_so_far,
    days_elapsed,
    days_in_month,
    days_tracked,
    outlier_count,
    outlier_spent,
    round(regular_spent / days_tracked * days_in_month + outlier_spent, 2) as projected_month_total,
    round(greatest(
      (regular_spent / days_tracked * days_in_month + outlier_spent)
        - amount_stddev * sqrt(greatest(days_in_month - days_tracked, 0))::numeric,
      0
    ), 2) as projected_low,
    round(
      (regular_spent / days_tracked * days_in_month + outlier_spent)
        + amount_stddev * sqrt(greatest(days_in_month - days_tracked, 0))::numeric,
      2
    ) as projected_high
  from agg;
$$;

create function public.category_monthly_projection(p_today date)
returns table (
  user_id uuid,
  category_id uuid,
  category_name text,
  spent_so_far numeric,
  days_elapsed int,
  days_in_month int,
  days_tracked int,
  outlier_count int,
  outlier_spent numeric,
  projected_month_total numeric,
  projected_low numeric,
  projected_high numeric
)
language sql
security invoker
stable
as $$
  with tx as (
    select
      t.user_id,
      t.category_id,
      c.name as category_name,
      t.amount,
      t.occurred_on,
      count(*) over (partition by t.user_id, t.category_id) as tx_count,
      avg(t.amount) over (partition by t.user_id, t.category_id) as avg_amount,
      stddev_samp(t.amount) over (partition by t.user_id, t.category_id) as stddev_amount
    from public.transactions t
    join public.categories c on c.id = t.category_id
    where t.occurred_on >= date_trunc('month', p_today)::date
      and t.occurred_on < (date_trunc('month', p_today) + interval '1 month')::date
  ),
  flagged as (
    select
      *,
      (tx_count >= 5 and coalesce(stddev_amount, 0) > 0 and abs(amount - avg_amount) > 2 * stddev_amount) as is_outlier
    from tx
  ),
  agg as (
    select
      user_id,
      category_id,
      category_name,
      sum(amount) as spent_so_far,
      coalesce(sum(amount) filter (where not is_outlier), 0) as regular_spent,
      coalesce(sum(amount) filter (where is_outlier), 0) as outlier_spent,
      count(*) filter (where is_outlier)::int as outlier_count,
      coalesce(max(stddev_amount), 0) as amount_stddev,
      extract(day from p_today)::int as days_elapsed,
      extract(day from (date_trunc('month', p_today) + interval '1 month - 1 day'))::int as days_in_month,
      greatest((p_today - min(occurred_on) + 1), 1)::int as days_tracked
    from flagged
    group by user_id, category_id, category_name
  )
  select
    user_id,
    category_id,
    category_name,
    spent_so_far,
    days_elapsed,
    days_in_month,
    days_tracked,
    outlier_count,
    outlier_spent,
    round(regular_spent / days_tracked * days_in_month + outlier_spent, 2) as projected_month_total,
    round(greatest(
      (regular_spent / days_tracked * days_in_month + outlier_spent)
        - amount_stddev * sqrt(greatest(days_in_month - days_tracked, 0))::numeric,
      0
    ), 2) as projected_low,
    round(
      (regular_spent / days_tracked * days_in_month + outlier_spent)
        + amount_stddev * sqrt(greatest(days_in_month - days_tracked, 0))::numeric,
      2
    ) as projected_high
  from agg;
$$;

create function public.monthly_income(p_today date)
returns table (
  user_id uuid,
  income_so_far numeric
)
language sql
security invoker
stable
as $$
  select
    user_id,
    coalesce(sum(amount), 0) as income_so_far
  from public.income
  where occurred_on >= date_trunc('month', p_today)::date
    and occurred_on < (date_trunc('month', p_today) + interval '1 month')::date
  group by user_id;
$$;

create function public.category_historical_average(p_today date)
returns table (
  user_id uuid,
  category_id uuid,
  avg_monthly_spent numeric,
  months_counted int
)
language sql
security invoker
stable
as $$
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
    where occurred_on < date_trunc('month', p_today)
    group by user_id, category_id, date_trunc('month', occurred_on)
  ) monthly
  group by user_id, category_id;
$$;

grant execute on function public.monthly_projection(date) to authenticated;
grant execute on function public.category_monthly_projection(date) to authenticated;
grant execute on function public.monthly_income(date) to authenticated;
grant execute on function public.category_historical_average(date) to authenticated;
