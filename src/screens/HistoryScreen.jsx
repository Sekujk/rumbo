import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Animated, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppAlert } from '../context/AppAlertContext';
import { getCategoryColor } from '../theme/colors';
import { getCategoryDisplayName } from '../config/defaultCategories';
import Mascot from '../components/Mascot';
import MonthSelector from '../components/MonthSelector';
import { useEarliestExpenseMonth } from '../hooks/useEarliestExpenseMonth';

// LayoutAnimation viene desactivado por defecto en Android (sí funciona
// de fábrica en iOS), hay que habilitarlo una vez para que la fila
// eliminada se achique/desvanezca en vez de desaparecer de golpe.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { confirm, notify } = useAppAlert();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const minMonth = useEarliestExpenseMonth();

  const contentOpacity = useRef(new Animated.Value(0)).current;

  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return selectedMonth.getFullYear() === today.getFullYear() && selectedMonth.getMonth() === today.getMonth();
  }, [selectedMonth]);

  const load = useCallback(async () => {
    const monthStartStr = selectedMonth.toISOString().slice(0, 10);
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, note, occurred_on, category_id, categories(name, default_key)')
      .gte('occurred_on', monthStartStr)
      .lt('occurred_on', nextMonthStr)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setTransactions(data);
  }, [selectedMonth]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
  }, [loading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Agrupar en secciones por día: una lista plana de 30-40 gastos del mes
  // se vuelve ilegible; agrupadas por fecha (con el total de cada día) se
  // puede escanear de un vistazo, como cualquier app de banco.
  const sections = useMemo(() => {
    const groups = new Map();
    transactions.forEach((item) => {
      if (!groups.has(item.occurred_on)) groups.set(item.occurred_on, []);
      groups.get(item.occurred_on).push(item);
    });
    return Array.from(groups.entries()).map(([date, data]) => ({
      date,
      total: data.reduce((sum, item) => sum + Number(item.amount), 0),
      data,
    }));
  }, [transactions]);

  const formatSectionDate = (dateStr) => {
    if (dateStr === todayStr()) return t('history.today');
    if (dateStr === yesterdayStr()) return t('history.yesterday');
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PE', { day: 'numeric', month: 'long' });
  };

  const handleDelete = (item) => {
    const categoryName = item.categories ? getCategoryDisplayName(t, item.categories) : t('history.noCategory');
    confirm({
      title: t('history.deleteTitle'),
      message: t('history.deleteMessage', { category: categoryName, amount: Number(item.amount).toFixed(2) }),
      confirmText: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', item.id);
        if (error) {
          notify({ title: t('common.error'), message: t('history.deleteErrorMessage'), variant: 'error' });
          return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTransactions((prev) => prev.filter((tx) => tx.id !== item.id));
      },
    });
  };

  return (
    <Animated.View style={[styles.flex, { opacity: contentOpacity }]}>
      <View style={styles.selectorWrap}>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} minMonth={minMonth} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('history.loading')} />
        </View>
      ) : (
      <SectionList
        style={styles.container}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Mascot size={40} />
            <Text style={styles.empty}>{isCurrentMonth ? t('history.empty') : t('history.emptyPastMonth')}</Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const dayLabel = formatSectionDate(section.date);
          return (
            <View
              style={styles.sectionHeader}
              accessibilityLabel={t('history.dayTotalLabel', { day: dayLabel, amount: section.total.toFixed(2) })}
            >
              <Text style={styles.sectionHeaderDate}>{dayLabel}</Text>
              <Text style={styles.sectionHeaderTotal}>S/ {section.total.toFixed(2)}</Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const categoryName = item.categories ? getCategoryDisplayName(t, item.categories) : t('history.noCategory');
          return (
            <View style={styles.row}>
              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(colors, item.category_id) }]} />
              <View style={styles.rowLeft}>
                <Text style={styles.category}>{categoryName}</Text>
                {item.note && <Text style={styles.note}>{item.note}</Text>}
              </View>
              <Text style={styles.amount}>S/ {Number(item.amount).toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={t('history.deleteLabel', { category: categoryName, amount: Number(item.amount).toFixed(2) })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
      )}
    </Animated.View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  selectorWrap: { paddingTop: 16, backgroundColor: colors.background },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 8, fontSize: 14 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 6 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHeaderTotal: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryDot: { width: 9, height: 9, borderRadius: 5, marginRight: 12 },
  rowLeft: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600', color: colors.text },
  note: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 12 },
  // 44x44 explícito: el ícono mide 20px, pero el área táctil real cumple
  // el mínimo de Apple HIG (44pt) / Material (48dp) gracias al padding.
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
