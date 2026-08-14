import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function EditProfileScreen() {
  const { session, signOut } = useAuth();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
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
      <Text style={styles.sectionTitle}>{t('profile.email')}</Text>
      <Text style={styles.email}>{email}</Text>
      {memberSince && <Text style={styles.memberSince}>{t('profile.memberSince', { date: memberSince })}</Text>}

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
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
  email: { fontSize: 16, fontWeight: '600', color: colors.text },
  memberSince: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 28,
    marginBottom: 12,
  },
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
  dangerTitle: { color: colors.danger },
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
