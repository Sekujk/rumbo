import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategoryColor } from '../theme/colors';
import Mascot from '../components/Mascot';

export default function AddTransactionScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [type, setType] = useState('expense'); // 'expense' | 'income'
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Un Animated.Value por categoría, creado una sola vez (no en cada
  // render) para el rebote al elegirla.
  const chipScales = useRef({}).current;
  const getChipScale = (id) => {
    if (!chipScales[id]) chipScales[id] = new Animated.Value(1);
    return chipScales[id];
  };

  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      const { data, error } = await supabase.from('categories').select('id, name').order('name');
      if (!error && data) {
        setCategories(data);
        setCategoryId(data[0]?.id || null);
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
      Alert.alert(t('add.invalidAmountTitle'), t('add.invalidAmountMessage'));
      return;
    }
    if (type === 'expense' && !categoryId) {
      Alert.alert(t('add.missingCategoryTitle'), t('add.missingCategoryMessage'));
      return;
    }
    setSaving(true);
    try {
      const occurred_on = new Date().toISOString().slice(0, 10);
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
      Alert.alert(t('common.error'), error.message || t('add.saveErrorMessage'));
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
                  return (
                    <Animated.View key={cat.id} style={{ transform: [{ scale: getChipScale(cat.id) }] }}>
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          selected ? { backgroundColor: catColor, borderColor: catColor } : null,
                        ]}
                        onPress={() => handleSelectCategory(cat.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t('add.categoryLabel', { name: cat.name })}
                      >
                        {!selected && <View style={[styles.chipDot, { backgroundColor: catColor }]} />}
                        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
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
  // 48dp de alto mínimo (padding vertical 12) para cumplir el touch target
  // de Android/iOS; antes medía ~33px con paddingVertical: 8.
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
