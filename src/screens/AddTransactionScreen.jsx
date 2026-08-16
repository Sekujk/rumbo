import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Animated,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppAlert } from '../context/AppAlertContext';
import { getCategoryColor } from '../theme/colors';
import { MAX_CATEGORIES, getCategoryDisplayName } from '../config/defaultCategories';
import { toLocalDateString } from '../utils/date';
import Mascot from '../components/Mascot';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AddTransactionScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { notify, confirm } = useAppAlert();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [type, setType] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const chipScales = useRef({}).current;
  const getChipScale = (id) => {
    if (!chipScales[id]) chipScales[id] = new Animated.Value(1);
    return chipScales[id];
  };

  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, default_key, archived_at')
        .order('name');
      if (!error && data) {
        const active = data.filter((c) => !c.archived_at);
        setCategories(active);
        setArchivedCategories(data.filter((c) => c.archived_at));
        setCategoryId(active[0]?.id || null);
      }
      setLoadingCategories(false);
    };
    loadCategories();
  }, []);

  const handleSelectCategory = (id) => {
    setCategoryId(id);
    Animated.sequence([
      Animated.timing(getChipScale(id), { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(getChipScale(id), { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const isDuplicate = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      notify({ title: t('add.newCategoryDuplicateTitle'), message: t('add.newCategoryDuplicateMessage'), variant: 'warning' });
      return;
    }
    setSavingCategory(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: session.user.id, name: trimmed })
        .select('id, name, default_key, archived_at')
        .single();
      if (error) throw error;
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(data.id);
      setNewCategoryName('');
      setAddingCategory(false);
    } catch (error) {
      notify({ title: t('common.error'), message: error.message || t('add.newCategorySaveErrorMessage'), variant: 'error' });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleOpenAddCategory = () => {
    if (categories.length >= MAX_CATEGORIES) {
      notify({ title: t('add.newCategoryLimitTitle'), message: t('add.newCategoryLimitMessage', { max: MAX_CATEGORIES }), variant: 'warning' });
      return;
    }
    setAddingCategory(true);
  };

  const handleArchiveCategory = async (category) => {
    const displayName = getCategoryDisplayName(t, category);
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id);

    confirm({
      title: t('add.archiveCategoryTitle', { name: displayName }),
      message: count > 0
        ? t('add.archiveCategoryMessageWithCount', { name: displayName, count })
        : t('add.archiveCategoryMessageEmpty', { name: displayName }),
      confirmText: t('add.archiveCategoryConfirm'),
      destructive: true,
      onConfirm: () => archiveCategory(category),
    });
  };

  const archiveCategory = async (category) => {
    try {
      await supabase.from('budgets').delete().eq('category_id', category.id);
      const { error } = await supabase
        .from('categories')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', category.id);
      if (error) throw error;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      setArchivedCategories((prev) => [...prev, { ...category, archived_at: new Date().toISOString() }]);
      setCategoryId((prev) => (prev === category.id ? null : prev));
    } catch (error) {
      notify({ title: t('common.error'), message: error.message || t('add.archiveCategoryErrorMessage'), variant: 'error' });
    }
  };

  const handleRestoreCategory = async (category) => {
    try {
      const { error } = await supabase.from('categories').update({ archived_at: null }).eq('id', category.id);
      if (error) throw error;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setArchivedCategories((prev) => prev.filter((c) => c.id !== category.id));
      setCategories((prev) => [...prev, { ...category, archived_at: null }].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      notify({ title: t('common.error'), message: error.message || t('add.restoreCategoryErrorMessage'), variant: 'error' });
    }
  };

  const playSuccessAnimation = () => {
    setShowSuccess(true);
    successAnim.setValue(0);
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(850),
      Animated.timing(successAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowSuccess(false));
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) {
      notify({ title: t('add.invalidAmountTitle'), message: t('add.invalidAmountMessage'), variant: 'warning' });
      return;
    }
    if (type === 'expense' && !categoryId) {
      notify({ title: t('add.missingCategoryTitle'), message: t('add.missingCategoryMessage'), variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const occurred_on = toLocalDateString();
      const { error } =
        type === 'expense'
          ? await supabase.from('transactions').insert({
              user_id: session.user.id,
              category_id: categoryId,
              amount: parsedAmount,
              note: note || null,
              occurred_on,
            })
          : await supabase.from('income').insert({
              user_id: session.user.id,
              amount: parsedAmount,
              source: note || null,
              occurred_on,
            });
      if (error) throw error;
      setAmount('');
      setNote('');
      playSuccessAnimation();
    } catch (error) {
      notify({ title: t('common.error'), message: error.message || t('add.saveErrorMessage'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isIncome = type === 'income';

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeButton, !isIncome && styles.typeButtonActiveExpense]}
            onPress={() => setType('expense')}
            accessibilityRole="radio"
            accessibilityState={{ selected: !isIncome }}
            accessibilityLabel={t('add.registerExpense')}
          >
            <Text style={[styles.typeButtonText, !isIncome && styles.typeButtonTextActive]}>{t('add.expense')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, isIncome && styles.typeButtonActiveIncome]}
            onPress={() => setType('income')}
            accessibilityRole="radio"
            accessibilityState={{ selected: isIncome }}
            accessibilityLabel={t('add.registerIncome')}
          >
            <Text style={[styles.typeButtonText, isIncome && styles.typeButtonTextActive]}>{t('add.income')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('add.amount')}</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencyPrefix}>S/</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            accessibilityLabel={isIncome ? t('add.amountIncomeLabel') : t('add.amountExpenseLabel')}
          />
        </View>

        {!isIncome && (
          <>
            <Text style={styles.label}>{t('add.category')}</Text>
            {loadingCategories ? (
              <ActivityIndicator color={colors.primary} accessibilityLabel={t('add.loadingCategories')} />
            ) : (
              <View style={styles.categoryRow}>
                {categories.map((cat) => {
                  const selected = categoryId === cat.id;
                  const catColor = getCategoryColor(colors, cat.id);
                  const displayName = getCategoryDisplayName(t, cat);
                  return (
                    <Animated.View key={cat.id} style={{ transform: [{ scale: getChipScale(cat.id) }] }}>
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          selected ? { backgroundColor: catColor, borderColor: catColor } : null,
                        ]}
                        onPress={() => handleSelectCategory(cat.id)}
                        onLongPress={() => handleArchiveCategory(cat)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t('add.categoryLabel', { name: displayName })}
                        accessibilityHint={t('add.archiveHint')}
                      >
                        {!selected && <View style={[styles.chipDot, { backgroundColor: catColor }]} />}
                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                          {displayName}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}

                {addingCategory ? (
                  <View style={styles.newCategoryRow}>
                    <TextInput
                      style={styles.newCategoryInput}
                      placeholder={t('add.newCategoryPlaceholder')}
                      placeholderTextColor={colors.placeholder}
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      autoFocus
                      onSubmitEditing={handleAddCategory}
                      accessibilityLabel={t('add.newCategoryPlaceholder')}
                    />
                    <TouchableOpacity
                      style={styles.newCategoryIconButton}
                      onPress={handleAddCategory}
                      disabled={savingCategory}
                      accessibilityRole="button"
                      accessibilityLabel={t('add.confirmNewCategory')}
                    >
                      {savingCategory ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.newCategoryIconButton}
                      onPress={() => {
                        setAddingCategory(false);
                        setNewCategoryName('');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('add.cancelNewCategory')}
                    >
                      <Ionicons name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addCategoryChip}
                    onPress={handleOpenAddCategory}
                    accessibilityRole="button"
                    accessibilityLabel={t('add.addCategory')}
                  >
                    <Ionicons name="add" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!loadingCategories && <Text style={styles.archiveHint}>{t('add.archiveHint')}</Text>}

            {archivedCategories.length > 0 && (
              <TouchableOpacity
                style={styles.viewArchivedButton}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowArchived((prev) => !prev);
                }}
                accessibilityRole="button"
                accessibilityLabel={showArchived ? t('add.hideArchived') : t('add.viewArchived', { count: archivedCategories.length })}
              >
                <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                <Text style={styles.viewArchivedText}>
                  {showArchived ? t('add.hideArchived') : t('add.viewArchived', { count: archivedCategories.length })}
                </Text>
              </TouchableOpacity>
            )}

            {showArchived && (
              <View style={styles.categoryRow}>
                {archivedCategories.map((cat) => {
                  const displayName = getCategoryDisplayName(t, cat);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, styles.archivedChip]}
                      onPress={() => handleRestoreCategory(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={t('add.restoreCategory', { name: displayName })}
                    >
                      <Ionicons name="refresh-outline" size={14} color={colors.textFaint} />
                      <Text style={[styles.categoryChipText, styles.archivedChipText]}>{displayName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <Text style={styles.label}>{isIncome ? t('add.source') : t('add.note')}</Text>
        <TextInput
          style={styles.input}
          placeholder={isIncome ? t('add.sourcePlaceholder') : t('add.notePlaceholder')}
          placeholderTextColor={colors.placeholder}
          value={note}
          onChangeText={setNote}
          accessibilityLabel={isIncome ? t('add.sourceLabel') : t('add.noteLabel')}
        />

        <TouchableOpacity
          style={[styles.button, isIncome && styles.buttonIncome]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isIncome ? t('add.saveIncome') : t('add.saveExpense')}
          accessibilityState={{ disabled: saving }}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>{isIncome ? t('add.saveIncome') : t('add.saveExpense')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showSuccess && (
        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
              transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            },
          ]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityLabel={isIncome ? t('add.incomeSaved') : t('add.expenseSaved')}
        >
          <Mascot size={20} animated={false} />
          <Ionicons name="checkmark-circle" size={22} color={colors.background} />
          <Text style={styles.successText}>{isIncome ? t('add.incomeSaved') : t('add.expenseSaved')}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  typeButtonActiveExpense: { backgroundColor: colors.text },
  typeButtonActiveIncome: { backgroundColor: colors.success },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  typeButtonTextActive: { color: colors.background },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end' },
  currencyPrefix: { fontSize: 24, fontWeight: '600', color: colors.textFaint, marginRight: 6, marginBottom: 10 },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '700', paddingVertical: 8, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 48, color: colors.text, backgroundColor: colors.surface },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  addCategoryChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  newCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 44,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  newCategoryIconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  archiveHint: { fontSize: 11, color: colors.textFaint, marginTop: 8 },
  viewArchivedButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, marginTop: 4 },
  viewArchivedText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  archivedChip: { opacity: 0.6, borderStyle: 'dashed' },
  archivedChipText: { color: colors.textMuted },
  categoryChipText: { color: colors.text, fontSize: 14 },
  categoryChipTextActive: { color: colors.background },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  buttonIncome: { backgroundColor: colors.success },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  successOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  successText: { color: colors.background, fontSize: 15, fontWeight: '600' },
});
