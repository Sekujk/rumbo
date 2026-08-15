import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, Alert,
  RefreshControl, Animated, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategoryColor } from '../theme/colors';
import { getCategoryDisplayName } from '../config/defaultCategories';
import Mascot from '../components/Mascot';

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
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, note, occurred_on, category_id, categories(name, default_key)')
      .gte('occurred_on', monthStartStr)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setTransactions(data);
  }, []);

  useEffect(() => {
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
    Alert.alert(
      t('history.deleteTitle'),
      t('history.deleteMessage', { category: categoryName, amount: Number(item.amount).toFixed(2) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('transactions').delete().eq('id', item.id);
            if (error) {
              Alert.alert(t('common.error'), t('history.deleteErrorMessage'));
              return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTransactions((prev) => prev.filter((tx) => tx.id !== item.id));
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('history.loading')} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.flex, { opacity: contentOpacity }]}>
      <SectionList
        style={styles.container}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Mascot size={40} />
            <Text style={styles.empty}>{t('history.empty')}</Text>
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
    </Animated.View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
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
