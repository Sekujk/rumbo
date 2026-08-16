import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getCategoryColor } from '../theme/colors';

const SIZE = 168;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEGREES = 3;

export default function CategoryDonutChart({ rows, total }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const segments = useMemo(() => {
    const gapLength = rows.length > 1 ? (GAP_DEGREES / 360) * CIRCUMFERENCE : 0;
    let cumulative = 0;
    return rows.map((row) => {
      const fraction = total > 0 ? row.spent / total : 0;
      const dashOffset = -cumulative * CIRCUMFERENCE;
      cumulative += fraction;
      return {
        categoryId: row.categoryId,
        name: row.name,
        spent: row.spent,
        fraction,
        color: getCategoryColor(colors, row.categoryId),
        dashArray: `${Math.max(CIRCUMFERENCE * fraction - gapLength, 0)} ${CIRCUMFERENCE}`,
        dashOffset,
      };
    });
  }, [rows, total, colors]);

  if (total <= 0 || segments.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.surfaceMuted} strokeWidth={STROKE} fill="none" />
          {segments.map((seg) => (
            seg.fraction > 0 && (
              <Circle
                key={seg.categoryId}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={seg.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="round"
                rotation={-90}
                originX={SIZE / 2}
                originY={SIZE / 2}
              />
            )
          ))}
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit>
            S/ {total.toFixed(0)}
          </Text>
          <Text style={styles.centerCaption}>{t('dashboard.spent').toLowerCase()}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.categoryId} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>{seg.name}</Text>
            <View style={styles.legendStats}>
              <Text style={styles.legendAmount}>S/ {seg.spent.toFixed(2)}</Text>
              <Text style={styles.legendPercent}>{Math.round(seg.fraction * 100)}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    gap: 18,
  },
  chartWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: SIZE - STROKE * 2 },
  centerValue: { fontSize: 19, fontWeight: '700', color: colors.text },
  centerCaption: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  legend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  legendStats: { alignItems: 'flex-end' },
  legendAmount: { fontSize: 12, color: colors.text, fontWeight: '700' },
  legendPercent: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
