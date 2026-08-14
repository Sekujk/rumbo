-- La proyección "run-rate" trata cada sol gastado como si fuera parte de
-- un ritmo diario parejo. Eso rompe cuando un gasto puntual y grande
-- (la compra del mercado de la semana, por ejemplo) se mezcla con el
-- gasto normal del día a día: infla la proyección como si ese monto
-- se fuera a repetir todos los días.
--
-- Solución sin pedirle nada nuevo al usuario: mismo criterio de z-score
-- ya usado en code/ExplicadorEconomico, aplicado esta vez a los montos de
-- las transacciones del mes (por categoría, y también al total general).
-- Con 5+ transacciones en el alcance, cualquier monto que se aleje más de
-- 2 desviaciones estándar del promedio se trata como "puntual": se suma
-- una sola vez al proyectado, no se extrapola como si fuera diario. Con
-- menos de 5 transacciones, no hay suficiente base para calcular una
-- desviación estándar confiable, así que el comportamiento cae de vuelta
-- al run-rate simple de antes (ningún gasto se marca outlier).
--
-- De paso se expone un rango (projected_low/projected_high) usando esa
-- misma desviación estándar, escalada a los días que quedan del mes,
-- así la proyección deja de fingir una precisión que los datos no tienen.

drop view if exists public.monthly_projection;
drop view if exists public.category_monthly_projection;

create view public.monthly_projection
with (security_invoker = true) as
with tx as (
  select
    user_id,
    amount,
    occurred_on,
    count(*) over (partition by user_id) as tx_count,
    avg(amount) over (partition by user_id) as avg_amount,
    stddev_samp(amount) over (partition by user_id) as stddev_amount
  from public.transactions
  where occurred_on >= date_trunc('month', current_date)::date
    and occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
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
    extract(day from current_date)::int as days_elapsed,
    extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month,
    greatest((current_date - min(occurred_on) + 1), 1)::int as days_tracked
  from flagged
  group by user_id
)
select
  user_id,
  date_trunc('month', current_date)::date as month_start,
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

create view public.category_monthly_projection
with (security_invoker = true) as
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
  where t.occurred_on >= date_trunc('month', current_date)::date
    and t.occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
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
    extract(day from current_date)::int as days_elapsed,
    extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month,
    greatest((current_date - min(occurred_on) + 1), 1)::int as days_tracked
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
