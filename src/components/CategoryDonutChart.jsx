import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { getCategoryColor } from '../theme/colors';

const SIZE = 150;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Dona armada con círculos SVG apilados (sin librería de gráficos): cada
// segmento es un círculo con strokeDasharray = [arco visible, resto], y
// strokeDashoffset lo corre hasta donde terminó el segmento anterior.
// rotation=-90 hace que el primer segmento arranque arriba (12 en punto)
// en vez del default de SVG (3 en punto).
export default function CategoryDonutChart({ rows, total }) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const segments = useMemo(() => {
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
        dashArray: `${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`,
        dashOffset,
      };
    });
  }, [rows, total, colors]);

  if (total <= 0 || segments.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE} fill="none" />
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
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.categoryId} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>{seg.name}</Text>
            <Text style={styles.legendPercent}>{Math.round(seg.fraction * 100)}%</Text>
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
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    gap: 16,
  },
  chartWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: SIZE - STROKE * 2 },
  centerValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  legendPercent: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
