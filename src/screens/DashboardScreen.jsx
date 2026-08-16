import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategoryColor } from '../theme/colors';
import { getCategoryDisplayName } from '../config/defaultCategories';
import Mascot from '../components/Mascot';
import MonthSelector from '../components/MonthSelector';
import CategoryDonutChart from '../components/CategoryDonutChart';
import RadialProgress from '../components/RadialProgress';
import { useEarliestExpenseMonth } from '../hooks/useEarliestExpenseMonth';
import { toLocalDateString } from '../utils/date';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const minMonth = useEarliestExpenseMonth();
  const [viewMode, setViewMode] = useState('list');
  const [projection, setProjection] = useState(null);
  const [income, setIncome] = useState(null);
  const [categoryRows, setCategoryRows] = useState([]);
  const [pastTotals, setPastTotals] = useState({ spent: 0, income: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return selectedMonth.getFullYear() === today.getFullYear() && selectedMonth.getMonth() === today.getMonth();
  }, [selectedMonth]);

  const cardAnims = useRef({}).current;
  const getCardAnim = (id) => {
    if (!cardAnims[id]) cardAnims[id] = new Animated.Value(0);
    return cardAnims[id];
  };
  const hasAnimatedCards = useRef(false);

  const loadCurrentMonth = useCallback(async () => {
    const today = toLocalDateString();
    const [
      { data: proj, error: projErr },
      { data: inc, error: incErr },
      { data: catProj, error: catProjErr },
      { data: cats, error: catsErr },
      { data: budgets, error: budgetsErr },
      { data: histAvg, error: histErr },
    ] = await Promise.all([
      supabase.rpc('monthly_projection', { p_today: today }).maybeSingle(),
      supabase.rpc('monthly_income', { p_today: today }).maybeSingle(),
      supabase.rpc('category_monthly_projection', { p_today: today }),
      supabase.from('categories').select('id, name, default_key').order('name'),
      supabase.from('budgets').select('category_id, monthly_limit'),
      supabase.rpc('category_historical_average', { p_today: today }),
    ]);

    if (!projErr) setProjection(proj);
    if (!incErr) setIncome(inc);

    if (!catsErr && !catProjErr && !budgetsErr && !histErr) {
      const projMap = {};
      (catProj || []).forEach((p) => { projMap[p.category_id] = p; });
      const budgetMap = {};
      (budgets || []).forEach((b) => { budgetMap[b.category_id] = Number(b.monthly_limit); });
      const histMap = {};
      (histAvg || []).forEach((h) => { histMap[h.category_id] = h; });

      const rows = (cats || [])
        .map((c) => {
          const p = projMap[c.id];
          const h = histMap[c.id];
          return {
            categoryId: c.id,
            name: getCategoryDisplayName(t, c),
            spent: p ? Number(p.spent_so_far) : 0,
            projected: p ? Number(p.projected_month_total) : 0,
            projectedLow: p ? Number(p.projected_low) : 0,
            projectedHigh: p ? Number(p.projected_high) : 0,
            outlierCount: p ? Number(p.outlier_count) : 0,
            outlierSpent: p ? Number(p.outlier_spent) : 0,
            daysTracked: p ? Number(p.days_tracked) : 0,
            budget: budgetMap[c.id] ?? null,
            historicalAvg: h ? Number(h.avg_monthly_spent) : null,
            monthsCounted: h ? h.months_counted : 0,
          };
        })
        .sort((a, b) => b.spent - a.spent);
      setCategoryRows(rows);
    }
  }, [t]);

  const loadPastMonth = useCallback(async () => {
    const monthStartStr = toLocalDateString(selectedMonth);
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = toLocalDateString(nextMonth);

    const [
      { data: txs, error: txErr },
      { data: incomeRows, error: incErr },
      { data: cats, error: catsErr },
    ] = await Promise.all([
      supabase.from('transactions').select('amount, category_id').gte('occurred_on', monthStartStr).lt('occurred_on', nextMonthStr),
      supabase.from('income').select('amount').gte('occurred_on', monthStartStr).lt('occurred_on', nextMonthStr),
      supabase.from('categories').select('id, name, default_key').order('name'),
    ]);

    if (!txErr && !incErr && !catsErr) {
      const totalSpent = (txs || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const totalIncome = (incomeRows || []).reduce((sum, r) => sum + Number(r.amount), 0);
      setPastTotals({ spent: totalSpent, income: totalIncome });

      const spentByCategory = {};
      (txs || []).forEach((tx) => {
        if (!tx.category_id) return;
        spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] || 0) + Number(tx.amount);
      });
      const rows = (cats || [])
        .filter((c) => spentByCategory[c.id] > 0)
        .map((c) => ({ categoryId: c.id, name: getCategoryDisplayName(t, c), spent: spentByCategory[c.id] }))
        .sort((a, b) => b.spent - a.spent);
      setCategoryRows(rows);
    }
  }, [selectedMonth, t]);

  const load = useCallback(async () => {
    if (isCurrentMonth) {
      await loadCurrentMonth();
    } else {
      await loadPastMonth();
    }
  }, [isCurrentMonth, loadCurrentMonth, loadPastMonth]);

  useEffect(() => {
    setLoading(true);
    hasAnimatedCards.current = false;
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const spent = projection?.spent_so_far ?? 0;
  const projected = projection?.projected_month_total ?? 0;
  const projectedLow = projection?.projected_low ?? projected;
  const projectedHigh = projection?.projected_high ?? projected;
  const outlierCount = projection?.outlier_count ?? 0;
  const outlierSpent = projection?.outlier_spent ?? 0;
  const daysElapsed = projection?.days_elapsed ?? new Date().getDate();
  const daysInMonth = projection?.days_in_month ?? 30;
  const daysTracked = projection?.days_tracked ?? 0;
  const lowConfidence = daysTracked > 0 && daysTracked < 3;
  const hasRange = projectedHigh - projectedLow > 1;
  const progress = Math.min(daysElapsed / daysInMonth, 1);
  const incomeSoFar = income?.income_so_far ?? 0;
  const balance = incomeSoFar - spent;

  const displaySpent = isCurrentMonth ? spent : pastTotals.spent;
  const displayIncome = isCurrentMonth ? incomeSoFar : pastTotals.income;
  const displayBalance = displayIncome - displaySpent;

  const compareMax = Math.max(displayIncome, displaySpent, 1);
  const incomeBarPct = (displayIncome / compareMax) * 100;
  const spentBarPct = (displaySpent / compareMax) * 100;

  useEffect(() => {
    if (loading) return;
    Animated.timing(contentOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    if (isCurrentMonth) {
      Animated.timing(progressAnim, { toValue: progress, duration: 700, useNativeDriver: false }).start();
    }
  }, [loading, progress, isCurrentMonth]);

  useEffect(() => {
    if (loading || hasAnimatedCards.current) return;
    const visibleRows = isCurrentMonth ? categoryRows.filter((r) => r.spent > 0 || r.budget != null) : categoryRows;
    if (visibleRows.length === 0) return;
    hasAnimatedCards.current = true;
    Animated.stagger(
      55,
      visibleRows.map((row) =>
        Animated.timing(getCardAnim(row.categoryId), { toValue: 1, duration: 260, useNativeDriver: true })
      )
    ).start();
  }, [loading, categoryRows, isCurrentMonth]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('dashboard.loading')} />
      </View>
    );
  }

  const fillWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const visibleCategoryRows = isCurrentMonth ? categoryRows.filter((r) => r.spent > 0 || r.budget != null) : categoryRows;
  const chartRows = visibleCategoryRows.filter((r) => r.spent > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Animated.View style={{ opacity: contentOpacity }}>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} minMonth={minMonth} />

        <View style={styles.viewToggleWrap}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('list')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.viewList')}
              accessibilityState={{ selected: viewMode === 'list' }}
            >
              <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'chart' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('chart')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.viewChart')}
              accessibilityState={{ selected: viewMode === 'chart' }}
            >
              <Ionicons name="pie-chart-outline" size={18} color={viewMode === 'chart' ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {isCurrentMonth ? (
          viewMode === 'chart' ? (
            <View style={styles.radialCard}>
              <RadialProgress progress={progress} color={colors.primary} size={160} strokeWidth={16}>
                <Text style={styles.radialValue} accessibilityLabel={t('dashboard.spentSoFarLabel', { amount: spent.toFixed(2) })}>
                  S/ {spent.toFixed(0)}
                </Text>
                <Text style={styles.radialCaption}>{t('dashboard.spentSoFar')}</Text>
              </RadialProgress>

              <View style={styles.radialStats}>
                <Text style={styles.radialStatLine}>{t('dashboard.dayOfMonth', { day: daysElapsed, total: daysInMonth })}</Text>
                <Text style={styles.radialStatLine}>
                  {t('dashboard.projectionLabel')}: S/ {projected.toFixed(2)}
                </Text>
              </View>

              {spent === 0 && (
                <View style={styles.emptyState}>
                  <Mascot size={40} />
                  <Text style={styles.empty}>{t('dashboard.emptyFirstExpense')}</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.eyebrow}>{t('dashboard.dayOfMonth', { day: daysElapsed, total: daysInMonth })}</Text>

              <Text style={styles.spentLabel}>{t('dashboard.spentSoFar')}</Text>
              <Text style={styles.spentValue} accessibilityLabel={t('dashboard.spentSoFarLabel', { amount: spent.toFixed(2) })}>
                S/ {spent.toFixed(2)}
              </Text>

              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityLabel={t('dashboard.progressLabel', { day: daysElapsed, total: daysInMonth })}
              >
                <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
              </View>

              <View style={styles.projectionCard}>
                <Text style={styles.projectionLabel}>{t('dashboard.projectionLabel')}</Text>
                <Text style={styles.projectionValue} accessibilityLabel={t('dashboard.projectionValueLabel', { amount: projected.toFixed(2) })}>
                  S/ {projected.toFixed(2)}
                </Text>

                {!lowConfidence && hasRange && (
                  <Text style={styles.projectionRange}>
                    {t('dashboard.projectionRange', { low: projectedLow.toFixed(2), high: projectedHigh.toFixed(2) })}
                  </Text>
                )}

                {outlierCount > 0 && (
                  <Text style={styles.projectionOutlier}>
                    {outlierCount === 1
                      ? t('dashboard.outlierOne', { amount: outlierSpent.toFixed(2) })
                      : t('dashboard.outlierMany', { count: outlierCount, amount: outlierSpent.toFixed(2) })}
                  </Text>
                )}

                {lowConfidence ? (
                  <Text style={[styles.projectionHint, styles.projectionHintWarning]}>
                    {daysTracked === 1
                      ? t('dashboard.lowConfidenceOne')
                      : t('dashboard.lowConfidenceMany', { days: daysTracked })}
                  </Text>
                ) : (
                  <Text style={styles.projectionHint}>
                    {t('dashboard.hint')}
                    {hasRange ? t('dashboard.hintRange') : ''}
                  </Text>
                )}
              </View>

              {spent === 0 && (
                <View style={styles.emptyState}>
                  <Mascot size={40} />
                  <Text style={styles.empty}>{t('dashboard.emptyFirstExpense')}</Text>
                </View>
              )}
            </>
          )
        ) : (
          <>
            <Text style={styles.spentLabel}>{t('dashboard.totalSpent')}</Text>
            <Text style={styles.spentValue} accessibilityLabel={t('dashboard.spentSoFarLabel', { amount: pastTotals.spent.toFixed(2) })}>
              S/ {pastTotals.spent.toFixed(2)}
            </Text>

            {pastTotals.spent === 0 && (
              <View style={styles.emptyState}>
                <Mascot size={40} />
                <Text style={styles.empty}>{t('dashboard.pastMonthEmpty')}</Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>{t('dashboard.incomeVsExpenses')}</Text>
        {displayIncome > 0 ? (
          viewMode === 'chart' ? (
            <View style={styles.compareCard}>
              <View style={styles.compareRow}>
                <View style={styles.compareLabelRow}>
                  <Ionicons name="arrow-up-circle" size={16} color={colors.success} />
                  <Text style={styles.compareLabel}>{t('dashboard.incomeThisMonth')}</Text>
                </View>
                <Text style={styles.compareValue}>S/ {displayIncome.toFixed(2)}</Text>
              </View>
              <View style={styles.compareTrack}>
                <View style={[styles.compareFill, { width: `${incomeBarPct}%`, backgroundColor: colors.success }]} />
              </View>

              <View style={[styles.compareRow, styles.compareRowSpaced]}>
                <View style={styles.compareLabelRow}>
                  <Ionicons name="arrow-down-circle" size={16} color={colors.primary} />
                  <Text style={styles.compareLabel}>{t('dashboard.spent')}</Text>
                </View>
                <Text style={styles.compareValue}>S/ {displaySpent.toFixed(2)}</Text>
              </View>
              <View style={styles.compareTrack}>
                <View style={[styles.compareFill, { width: `${spentBarPct}%`, backgroundColor: colors.primary }]} />
              </View>

              <Text style={[styles.compareRemaining, displayBalance < 0 && styles.balanceNegative]}>
                {t('dashboard.remaining')}: S/ {displayBalance.toFixed(2)}
              </Text>
            </View>
          ) : (
            <View style={styles.balanceCard}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>{t('dashboard.incomeThisMonth')}</Text>
                <Text style={styles.balanceValue}>S/ {displayIncome.toFixed(2)}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>{t('dashboard.spent')}</Text>
                <Text style={styles.balanceValue}>S/ {displaySpent.toFixed(2)}</Text>
              </View>
              <View style={[styles.balanceRow, styles.balanceRowTotal]}>
                <Text style={styles.balanceLabelTotal}>{t('dashboard.remaining')}</Text>
                <Text style={[styles.balanceValueTotal, displayBalance < 0 && styles.balanceNegative]}>
                  S/ {displayBalance.toFixed(2)}
                </Text>
              </View>
            </View>
          )
        ) : (
          <Text style={styles.empty}>{t('dashboard.emptyIncome')}</Text>
        )}

        <Text style={styles.sectionTitle}>{t('dashboard.byCategory')}</Text>
        {visibleCategoryRows.length === 0 ? (
          <Text style={styles.empty}>{isCurrentMonth ? t('dashboard.emptyCategories') : t('dashboard.pastMonthEmpty')}</Text>
        ) : viewMode === 'chart' ? (
          chartRows.length > 0 ? (
            <CategoryDonutChart rows={chartRows} total={displaySpent} />
          ) : (
            <Text style={styles.empty}>{t('dashboard.emptyCategories')}</Text>
          )
        ) : (
          visibleCategoryRows.map((row) => {
            const cardAnim = getCardAnim(row.categoryId);

            if (!isCurrentMonth) {
              return (
                <Animated.View
                  key={row.categoryId}
                  style={[
                    styles.categoryCard,
                    {
                      opacity: cardAnim,
                      transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                    },
                  ]}
                >
                  <View style={styles.categoryCardHeader}>
                    <View style={styles.categoryCardNameRow}>
                      <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(colors, row.categoryId) }]} />
                      <Text style={styles.categoryCardName}>{row.name}</Text>
                    </View>
                    <Text style={styles.categoryCardSpent}>S/ {row.spent.toFixed(2)}</Text>
                  </View>
                </Animated.View>
              );
            }

            const budgetRatio = row.budget ? Math.min(row.spent / row.budget, 1) : null;
            const overBudget = row.budget != null && row.spent > row.budget;
            const rowLowConfidence = row.daysTracked > 0 && row.daysTracked < 3;
            const rowHasRange = !rowLowConfidence && row.projectedHigh - row.projectedLow > 1;
            const vsAvg =
              row.historicalAvg && row.historicalAvg > 0
                ? ((row.projected - row.historicalAvg) / row.historicalAvg) * 100
                : null;

            return (
              <Animated.View
                key={row.categoryId}
                style={[
                  styles.categoryCard,
                  {
                    opacity: cardAnim,
                    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                  },
                ]}
              >
                <View style={styles.categoryCardHeader}>
                  <View style={styles.categoryCardNameRow}>
                    <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(colors, row.categoryId) }]} />
                    <Text style={styles.categoryCardName}>{row.name}</Text>
                  </View>
                  <Text style={styles.categoryCardSpent}>S/ {row.spent.toFixed(2)}</Text>
                </View>

                {row.budget != null && (
                  <>
                    <View style={styles.categoryProgressTrack}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          { width: `${budgetRatio * 100}%`, backgroundColor: getCategoryColor(colors, row.categoryId) },
                          overBudget && styles.categoryProgressFillOver,
                        ]}
                      />
                    </View>
                    <Text style={[styles.categoryBudgetText, overBudget && styles.categoryBudgetTextOver]}>
                      {overBudget
                        ? t('dashboard.overBudget', { over: (row.spent - row.budget).toFixed(2), budget: row.budget.toFixed(2) })
                        : t('dashboard.underBudget', { left: (row.budget - row.spent).toFixed(2), budget: row.budget.toFixed(2) })}
                    </Text>
                  </>
                )}

                <Text style={styles.categoryProjection}>
                  {t('dashboard.projected', { amount: row.projected.toFixed(2) })}
                  {rowLowConfidence
                    ? (row.daysTracked === 1
                      ? t('dashboard.projectedLowConfidenceOne')
                      : t('dashboard.projectedLowConfidenceMany', { days: row.daysTracked }))
                    : rowHasRange
                    ? t('dashboard.projectedRange', { low: row.projectedLow.toFixed(2), high: row.projectedHigh.toFixed(2) })
                    : ''}
                </Text>

                {row.outlierCount > 0 && (
                  <Text style={styles.categoryOutlier}>
                    {row.outlierCount === 1
                      ? t('dashboard.categoryOutlierOne', { amount: row.outlierSpent.toFixed(2) })
                      : t('dashboard.categoryOutlierMany', { count: row.outlierCount, amount: row.outlierSpent.toFixed(2) })}
                  </Text>
                )}

                {vsAvg != null ? (
                  <Text style={[styles.categoryVsAvg, vsAvg > 0 ? styles.vsAvgUp : styles.vsAvgDown]}>
                    {vsAvg > 0
                      ? (row.monthsCounted === 1
                        ? t('dashboard.vsAvgUpOne', { percent: Math.abs(vsAvg).toFixed(0), avg: row.historicalAvg.toFixed(2) })
                        : t('dashboard.vsAvgUpMany', { percent: Math.abs(vsAvg).toFixed(0), avg: row.historicalAvg.toFixed(2), months: row.monthsCounted }))
                      : (row.monthsCounted === 1
                        ? t('dashboard.vsAvgDownOne', { percent: Math.abs(vsAvg).toFixed(0), avg: row.historicalAvg.toFixed(2) })
                        : t('dashboard.vsAvgDownMany', { percent: Math.abs(vsAvg).toFixed(0), avg: row.historicalAvg.toFixed(2), months: row.monthsCounted }))}
                  </Text>
                ) : (
                  <Text style={styles.categoryNoHistory}>{t('dashboard.noHistory')}</Text>
                )}
              </Animated.View>
            );
          })
        )}
      </Animated.View>
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  viewToggleWrap: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 3,
    gap: 3,
  },
  viewToggleButton: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  radialCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 26,
    paddingHorizontal: 20,
  },
  radialValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  radialCaption: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  radialStats: { marginTop: 18, alignItems: 'center', gap: 4 },
  radialStatLine: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  compareCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 18,
  },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  compareRowSpaced: { marginTop: 16 },
  compareLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compareLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  compareValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  compareTrack: { height: 10, backgroundColor: colors.surfaceMuted, borderRadius: 5, overflow: 'hidden' },
  compareFill: { height: '100%', borderRadius: 5 },
  compareRemaining: { fontSize: 13, color: colors.success, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  eyebrow: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  spentLabel: { fontSize: 14, color: colors.textMuted },
  spentValue: { fontSize: 40, fontWeight: '700', color: colors.text, marginTop: 4 },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  projectionCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 20,
    marginTop: 28,
  },
  projectionLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  projectionValue: { fontSize: 32, fontWeight: '700', color: colors.primary, marginTop: 6 },
  projectionRange: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 6 },
  projectionOutlier: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 },
  projectionHint: { fontSize: 12, color: colors.textMuted, marginTop: 10, lineHeight: 17 },
  projectionHintWarning: { color: colors.warning, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 16, fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 16, gap: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 36,
    marginBottom: 14,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  balanceLabel: { fontSize: 14, color: colors.textMuted },
  balanceValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  balanceRowTotal: { marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  balanceLabelTotal: { fontSize: 15, color: colors.text, fontWeight: '700' },
  balanceValueTotal: { fontSize: 18, color: colors.success, fontWeight: '700' },
  balanceNegative: { color: colors.danger },
  categoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  categoryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryCardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 9, height: 9, borderRadius: 5 },
  categoryCardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  categoryCardSpent: { fontSize: 15, fontWeight: '700', color: colors.text },
  categoryProgressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  categoryProgressFill: { height: '100%', backgroundColor: colors.primary },
  categoryProgressFillOver: { backgroundColor: colors.danger },
  categoryBudgetText: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  categoryBudgetTextOver: { color: colors.danger, fontWeight: '600' },
  categoryProjection: { fontSize: 12, color: colors.textMuted, marginTop: 12, lineHeight: 16 },
  categoryOutlier: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  categoryVsAvg: { fontSize: 12, marginTop: 6, fontWeight: '600', lineHeight: 16 },
  vsAvgUp: { color: colors.danger },
  vsAvgDown: { color: colors.success },
  categoryNoHistory: { fontSize: 12, color: colors.textFaint, marginTop: 6, fontStyle: 'italic' },
});
