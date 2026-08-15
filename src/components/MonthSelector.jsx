import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

// month: Date normalizado al dia 1 del mes seleccionado.
// minMonth: Date (dia 1) del mes con el gasto mas antiguo, o null si nunca
// hubo gastos, o undefined mientras se calcula. No tiene sentido dejar
// navegar a meses de antes de eso, porque ahi no hay nada que mostrar.
export default function MonthSelector({ month, onChange, minMonth }) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const today = new Date();
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  const canGoPrevious =
    minMonth instanceof Date &&
    (month.getFullYear() > minMonth.getFullYear() ||
      (month.getFullYear() === minMonth.getFullYear() && month.getMonth() > minMonth.getMonth()));

  const label = month.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PE', { month: 'long', year: 'numeric' });

  const goToPrevious = () => {
    if (!canGoPrevious) return;
    const next = new Date(month);
    next.setMonth(next.getMonth() - 1);
    onChange(next);
  };

  const goToNext = () => {
    if (isCurrentMonth) return;
    const next = new Date(month);
    next.setMonth(next.getMonth() + 1);
    onChange(next);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={goToPrevious}
        disabled={!canGoPrevious}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.previousMonth')}
        accessibilityState={{ disabled: !canGoPrevious }}
      >
        <Ionicons name="chevron-back" size={20} color={canGoPrevious ? colors.text : colors.textFaint} />
      </TouchableOpacity>

      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.arrowButton}
        onPress={goToNext}
        disabled={isCurrentMonth}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.nextMonth')}
        accessibilityState={{ disabled: isCurrentMonth }}
      >
        <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? colors.textFaint : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 16 },
  arrowButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
    minWidth: 140,
    textAlign: 'center',
  },
});
