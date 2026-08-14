-- Bug de criterio: la proyección "run-rate" dividía entre los días de
-- calendario que van del mes (extract(day from current_date)), asumiendo
-- que hubo gasto parejo desde el día 1. Si el usuario recién empieza a
-- registrar una categoría a mitad de mes, esa suposición es falsa y el
-- número sale contraintuitivo, ej. S/12 gastados hoy (día 13 del mes)
-- proyectaban solo S/28.62, como si esos S/12 fueran el promedio de 13
-- días de gasto, no de 1 solo día real.
--
-- Se reemplaza el divisor por los días REALMENTE observados (desde la
-- primera transacción del mes en ese alcance (overall o por categoría),
-- que es lo que un run-rate honesto debería estar promediando. Se expone
-- days_tracked además para que el cliente pueda avisar cuando hay muy
-- pocos días de datos en vez de mostrar la proyección como si fuera
-- confiable desde el primer registro.
--
-- Se recrean en vez de CREATE OR REPLACE porque agregar una columna nueva
-- (days_tracked) requeriría que quede al final exacto de la lista para
-- que Postgres lo permita: más simple y menos frágil recrearlas.

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
