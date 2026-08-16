import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppAlert } from '../context/AppAlertContext';
import Mascot from '../components/Mascot';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { notify } = useAppAlert();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const subtitleAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    subtitleAnim.setValue(0);
    Animated.timing(subtitleAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [isSignUp]);

  const handleSubmit = async () => {
    if (!email || !password) {
      notify({ title: t('auth.missingFieldsTitle'), message: t('auth.missingFieldsMessage'), variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { requiresEmailConfirmation } = await signUp(email, password);
        if (requiresEmailConfirmation) {
          notify({ title: t('auth.accountCreatedTitle'), message: t('auth.accountCreatedMessage'), variant: 'success' });
        }
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      notify({ title: t('common.error'), message: error.message || t('auth.genericErrorMessage'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.hero}>
        <View style={styles.glow} />
        <Mascot size={56} />
      </View>

      <Text style={styles.title}>Rumbo</Text>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleAnim }]}>
        {isSignUp ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
      </Animated.Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor={colors.placeholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        accessibilityLabel={t('auth.email')}
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          accessibilityLabel={t('auth.password')}
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

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={isSignUp ? t('auth.signUp') : t('auth.signIn')}
        accessibilityState={{ disabled: loading }}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>{isSignUp ? t('auth.signUp') : t('auth.signIn')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsSignUp(!isSignUp)}
        style={styles.switchButton}
        accessibilityRole="button"
        accessibilityLabel={isSignUp ? t('auth.switchToSignInLabel') : t('auth.switchToSignUpLabel')}
      >
        <Text style={styles.switchText}>
          {isSignUp ? t('auth.switchToSignIn') : t('auth.switchToSignUp')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  hero: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  glow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentGoldSoft,
  },
  title: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 4, color: colors.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 32 },
  input: {
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
  passwordWrapper: { justifyContent: 'center' },
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
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  switchButton: { paddingVertical: 14, marginTop: 8 },
  switchText: { textAlign: 'center', color: colors.primary, fontSize: 14 },
});
