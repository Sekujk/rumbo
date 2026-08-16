const lightCategoryPalette = ['#db2777', '#7c3aed', '#2563eb', '#0891b2', '#65a30d', '#ca8a04', '#ea580c', '#64748b'];
const darkCategoryPalette = ['#f472b6', '#a78bfa', '#60a5fa', '#22d3ee', '#a3e635', '#facc15', '#fb923c', '#94a3b8'];

export const lightColors = {
  mode: 'light',
  background: '#ffffff',
  surface: '#ffffff',
  surfaceMuted: '#f6f7f5',
  border: '#f0f0f0',
  borderStrong: '#d0d5dd',
  text: '#14181f',
  textMuted: '#667085',
  textFaint: '#98a2b3',
  placeholder: '#98a2b3',
  primary: '#0e7490',
  primarySoft: '#e0f7fa',
  success: '#15803d',
  successSoft: '#e7f6ec',
  danger: '#b3261e',
  dangerSoft: '#fbe9e7',
  warning: '#b45309',
  warningSoft: '#fef3e2',
  overlay: 'rgba(0, 0, 0, 0.05)',
  categoryPalette: lightCategoryPalette,
};

export const darkColors = {
  mode: 'dark',
  background: '#0f1115',
  surface: '#1a1d23',
  surfaceMuted: '#20242c',
  border: '#2a2f38',
  borderStrong: '#3a4048',
  text: '#f2f4f7',
  textMuted: '#9aa4b2',
  textFaint: '#6b7280',
  placeholder: '#6b7280',
  primary: '#22b8d8',
  primarySoft: '#123a44',
  success: '#34d399',
  successSoft: '#123326',
  danger: '#f87171',
  dangerSoft: '#3a1e1e',
  warning: '#fbbf24',
  warningSoft: '#3a2a0f',
  overlay: 'rgba(255, 255, 255, 0.06)',
  categoryPalette: darkCategoryPalette,
};

export const getCategoryColor = (colors, key) => {
  if (!key) return colors.textFaint;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997;
  }
  const palette = colors.categoryPalette || [];
  if (palette.length === 0) return colors.textFaint;
  return palette[Math.abs(hash) % palette.length];
};
