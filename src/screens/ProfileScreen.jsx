import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const MENU_ITEMS = [
  { key: 'editProfile', icon: 'person-outline', labelKey: 'profile.editProfile' },
  { key: 'settings', icon: 'options-outline', labelKey: 'profile.settings' },
  { key: 'faq', icon: 'help-circle-outline', labelKey: 'profile.faqButton' },
  { key: 'update', icon: 'cloud-download-outline', labelKey: 'profile.update' },
  { key: 'about', icon: 'information-circle-outline', labelKey: 'profile.about' },
];

export default function ProfileScreen({ onNavigate }) {
  const { session, signOut } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const email = session?.user?.email || '';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{(email[0] || '?').toUpperCase()}</Text>
      </View>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.listRow}
            onPress={() => onNavigate(item.key)}
            accessibilityRole="button"
            accessibilityLabel={t(item.labelKey)}
          >
            <Ionicons name={item.icon} size={20} color={colors.textMuted} />
            <Text style={styles.listRowText}>{t(item.labelKey)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel={t('profile.signOut')}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: colors.background, flexGrow: 1 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: colors.primary },
  email: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 14 },
  menu: { width: '100%', marginTop: 32 },
  listRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 32,
    paddingHorizontal: 16,
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
