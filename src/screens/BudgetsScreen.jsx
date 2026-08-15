import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategoryDisplayName } from '../config/defaultCategories';

export default function BudgetsScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Rebote del check al guardar: antes no había ninguna confirmación
  // visual de que el presupuesto se guardó, más allá del spinner breve.
  const saveAnims = useRef({}).current;
  const getSaveAnim = (id) => {
    if (!saveAnims[id]) saveAnims[id] = new Animated.Value(1);
    return saveAnims[id];
  };
  const playSaveBounce = (id) => {
    Animated.sequence([
      Animated.timing(getSaveAnim(id), { toValue: 1.5, duration: 120, useNativeDriver: true }),
      Animated.spring(getSaveAnim(id), { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
  };

  const load = useCallback(async () => {
    const [{ data: categories, error: catError }, { data: budgets, error: budError }] = await Promise.all([
      supabase.from('categories').select('id, name, default_key').order('name'),
      supabase.from('budgets').select('id, category_id, monthly_limit'),
    ]);
    if (!catError && !budError) {
      const budgetMap = {};
      (budgets || []).forEach((b) => {
        budgetMap[b.category_id] = b;
      });
      setRows(
        (categories || []).map((c) => ({
          categoryId: c.id,
          name: getCategoryDisplayName(t, c),
          budgetId: budgetMap[c.id]?.id || null,
          value: budgetMap[c.id] ? String(budgetMap[c.id].monthly_limit) : '',
        }))
      );
    }
  }, [t]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
  }, [loading]);

  const updateValue = (categoryId, value) => {
    setRows((prev) => prev.map((r) => (r.categoryId === categoryId ? { ...r, value } : r)));
  };

  const handleSave = async (row) => {
    const parsed = parseFloat(row.value.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      Alert.alert(t('budgets.invalidAmountTitle'), t('budgets.invalidAmountMessage'));
      return;
    }
    setSavingId(row.categoryId);
    try {
      const { error } = await supabase.from('budgets').upsert(
        {
          user_id: session.user.id,
          category_id: row.categoryId,
          monthly_limit: parsed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category_id' }
      );
      if (error) throw error;
      await load();
      playSaveBounce(row.categoryId);
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('budgets.saveErrorMessage'));
    } finally {
      setSavingId(null);
    }
  };

  const handleClear = async (row) => {
    if (!row.budgetId) return;
    setSavingId(row.categoryId);
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', row.budgetId);
      if (error) throw error;
      await load();
    } catch (error) {
      Alert.alert(t('common.error'), t('budgets.clearErrorMessage'));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('budgets.loading')} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.flex, { opacity: contentOpacity }]}>
      <FlatList
        style={styles.container}
        data={rows}
        keyExtractor={(item) => item.categoryId}
        contentContainerStyle={{ padding: 20 }}
        ListHeaderComponent={<Text style={styles.intro}>{t('budgets.intro')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.prefix}>S/</Text>
              <TextInput
                style={styles.input}
                placeholder={t('budgets.noLimit')}
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                value={item.value}
                onChangeText={(v) => updateValue(item.categoryId, v)}
                accessibilityLabel={t('budgets.limitLabel', { name: item.name })}
              />
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleSave(item)}
                disabled={savingId === item.categoryId}
                accessibilityRole="button"
                accessibilityLabel={t('budgets.saveLabel', { name: item.name })}
              >
                <Animated.View style={{ transform: [{ scale: getSaveAnim(item.categoryId) }] }}>
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                </Animated.View>
              </TouchableOpacity>
              {item.budgetId && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleClear(item)}
                  disabled={savingId === item.categoryId}
                  accessibilityRole="button"
                  accessibilityLabel={t('budgets.clearLabel', { name: item.name })}
                >
                  <Ionicons name="close" size={20} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </Animated.View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 20 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
