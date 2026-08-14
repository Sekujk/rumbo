import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

const THEME_MODES = ['system', 'light', 'dark'];

export default function ProfileScreen({ onOpenFAQ, onReplayGuide }) {
  const { session, signOut } = useAuth();
  const { mode, setThemeMode, colors } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const email = session?.user?.email || '';
  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PE', {
        year: 'numeric',
        month: 'long',
      })
    : null;

  const themeModeLabel = {
    system: t('profile.appearanceSystem'),
    light: t('profile.appearanceLight'),
    dark: t('profile.appearanceDark'),
  };
  const languageLabel = {
    es: t('profile.languageEs'),
    en: t('profile.languageEn'),
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t('profile.shortPasswordTitle'), t('profile.shortPasswordMessage'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('profile.mismatchTitle'), t('profile.mismatchMessage'));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('common.done'), t('profile.passwordUpdatedMessage'));
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('profile.passwordErrorMessage'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountTitle'),
      t('profile.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
            } catch (error) {
              Alert.alert(t('common.error'), error.message || t('profile.deleteAccountErrorMessage'));
              setDeleting(false);
              return;
            }
            // La cuenta ya no existe en el servidor en este punto: se
            // ignora cualquier error de signOut() al invalidar la
            // sesión remota, porque el objetivo real (salir localmente)
            // igual se cumple.
            try {
              await signOut();
            } catch (error) {
              // sin acción: ya se logró lo que importa
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{(email[0] || '?').toUpperCase()}</Text>
      </View>
      <Text style={styles.email}>{email}</Text>
      {memberSince && <Text style={styles.memberSince}>{t('profile.memberSince', { date: memberSince })}</Text>}

      <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>

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

      <Text style={styles.sectionTitle}>{t('profile.help')}</Text>

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

      <TouchableOpacity
        style={styles.listRow}
        onPress={onOpenFAQ}
        accessibilityRole="button"
        accessibilityLabel={t('profile.faqButton')}
      >
        <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
        <Text style={styles.listRowText}>{t('profile.faqButton')}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('profile.changePassword')}</Text>

      <View style={styles.passwordWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder={t('profile.newPassword')}
          placeholderTextColor={colors.placeholder}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          accessibilityLabel={t('profile.newPassword')}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('profile.confirmPassword')}
        placeholderTextColor={colors.placeholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        accessibilityLabel={t('profile.confirmPassword')}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleChangePassword}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={t('profile.savePasswordLabel')}
        accessibilityState={{ disabled: saving }}
      >
        {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>{t('profile.savePassword')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel={t('profile.signOut')}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('profile.dangerZone')}</Text>

      <TouchableOpacity
        style={styles.deleteAccountButton}
        onPress={handleDeleteAccount}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel={t('profile.deleteAccount')}
        accessibilityState={{ disabled: deleting }}
      >
        {deleting ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
          </>
        )}
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
  memberSince: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 36,
    marginBottom: 14,
  },
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
  passwordWrapper: { width: '100%', justifyContent: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 48,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  passwordInput: { paddingRight: 46 },
  eyeButton: {
    position: 'absolute',
    right: 6,
    top: 0,
    height: 48,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 40,
    paddingHorizontal: 16,
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  dangerTitle: { color: colors.danger, marginTop: 28 },
  deleteAccountButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
  },
  deleteAccountText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
