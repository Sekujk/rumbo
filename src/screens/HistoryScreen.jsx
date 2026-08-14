import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert,
  RefreshControl, Animated, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

// LayoutAnimation viene desactivado por defecto en Android (sí funciona
// de fábrica en iOS) -- hay que habilitarlo una vez para que la fila
// eliminada se achique/desvanezca en vez de desaparecer de golpe.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
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
      .select('id, amount, note, occurred_on, categories(name)')
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

  const handleDelete = (item) => {
    const categoryName = item.categories?.name || t('history.noCategory');
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
      <FlatList
        style={styles.container}
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('history.empty')}</Text>}
        renderItem={({ item }) => {
          const categoryName = item.categories?.name || t('history.noCategory');
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.category}>{categoryName}</Text>
                <Text style={styles.date}>{item.occurred_on}</Text>
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
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600', color: colors.text },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  note: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 12 },
  // 44x44 explícito: el ícono mide 20px, pero el área táctil real cumple
  // el mínimo de Apple HIG (44pt) / Material (48dp) gracias al padding.
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
