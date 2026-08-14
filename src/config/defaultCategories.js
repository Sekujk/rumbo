export const DEFAULT_CATEGORIES = ['Comida', 'Transporte', 'Ocio', 'Salud', 'Otros'];

export const ensureDefaultCategories = async (supabase, userId) => {
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('id')
    .limit(1);
  if (fetchError) throw fetchError;
  if (existing && existing.length > 0) return;

  const rows = DEFAULT_CATEGORIES.map((name) => ({ user_id: userId, name }));
  const { error: insertError } = await supabase.from('categories').insert(rows);
  if (insertError) throw insertError;
};
