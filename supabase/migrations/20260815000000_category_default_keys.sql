alter table public.categories add column if not exists default_key text;

update public.categories set default_key = 'food' where name = 'Comida' and default_key is null;
update public.categories set default_key = 'transport' where name = 'Transporte' and default_key is null;
update public.categories set default_key = 'leisure' where name = 'Ocio' and default_key is null;
update public.categories set default_key = 'health' where name = 'Salud' and default_key is null;
update public.categories set default_key = 'other' where name = 'Otros' and default_key is null;
