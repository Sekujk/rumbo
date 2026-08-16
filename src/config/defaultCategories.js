export const DEFAULT_CATEGORIES = [
  { key: 'food', name: 'Comida' },
  { key: 'transport', name: 'Transporte' },
  { key: 'leisure', name: 'Ocio' },
  { key: 'health', name: 'Salud' },
  { key: 'other', name: 'Otros' },
];

export const MAX_CATEGORIES = 10;

export const ensureDefaultCategories = async (supabase, userId) => {
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('id')
    .limit(1);
  if (fetchError) throw fetchError;
  if (existing && existing.length > 0) return;

  const rows = DEFAULT_CATEGORIES.map(({ key, name }) => ({ user_id: userId, name, default_key: key }));
  const { error: insertError } = await supabase.from('categories').insert(rows);
  if (insertError) throw insertError;
};

export const getCategoryDisplayName = (t, category) =>
  category?.default_key ? t(`category.${category.default_key}`) : category?.name;
