import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import Mascot from '../components/Mascot';

export default function AboutScreen({ onReplayGuide }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Mascot size={56} />
      <Text style={styles.appName}>Rumbo</Text>
      <Text style={styles.tagline}>{t('about.tagline')}</Text>
      <Text style={styles.version}>{t('about.versionLabel', { version })}</Text>

      <TouchableOpacity
        style={styles.listRow}
        onPress={onReplayGuide}
        accessibilityRole="button"
        accessibilityLabel={t('profile.replayGuide')}
      >
        <Ionicons name="sparkles-outline" size={20} color={colors.textMuted} />
        <Text style={styles.listRowText}>{t('profile.replayGuide')}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: colors.background, flexGrow: 1 },
  appName: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  tagline: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 8, paddingHorizontal: 8 },
  version: { fontSize: 13, color: colors.textFaint, marginTop: 12 },
  listRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
});
