import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

const THEME_MODES = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { mode, setThemeMode, colors } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const themeModeLabel = {
    system: t('profile.appearanceSystem'),
    light: t('profile.appearanceLight'),
    dark: t('profile.appearanceDark'),
  };
  const languageLabel = {
    es: t('profile.languageEs'),
    en: t('profile.languageEn'),
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.prefRow}>
        <Text style={styles.prefLabel}>{t('profile.appearance')}</Text>
        <View style={styles.segmented}>
          {THEME_MODES.map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setThemeMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={themeModeLabel[m]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                  {themeModeLabel[m]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.prefRow}>
        <Text style={styles.prefLabel}>{t('profile.language')}</Text>
        <View style={styles.segmented}>
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = lang === l;
            return (
              <TouchableOpacity
                key={l}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setLanguage(l)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={languageLabel[l]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                  {languageLabel[l]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
  prefRow: { width: '100%', marginBottom: 18 },
  prefLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentButtonActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.background },
});
