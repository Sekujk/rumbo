import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  // Fundido corto cuando se alterna Ingresar/Registrarte, para que el
  // cambio de "ventana" (mismo formulario, otro propósito) se sienta,
  // no salte de golpe. No corre en el primer render -- eso ya lo cubre
  // fadeAnim/slideAnim de arriba.
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
      Alert.alert(t('auth.missingFieldsTitle'), t('auth.missingFieldsMessage'));
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { requiresEmailConfirmation } = await signUp(email, password);
        if (requiresEmailConfirmation) {
          Alert.alert(t('auth.accountCreatedTitle'), t('auth.accountCreatedMessage'));
        }
        // Si no requiere confirmación, la sesión ya quedó activa y
        // AuthContext te lleva directo al dashboard sin alertas de más.
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('auth.genericErrorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
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
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 4, color: colors.text },
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
    backgroundColor: colors.text,
    borderRadius: 8,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  // padding vertical propio (no solo el texto) para que el área táctil
  // del link llegue al mínimo de 44pt, no solo la línea de texto (~20px).
  switchButton: { paddingVertical: 14, marginTop: 8 },
  switchText: { textAlign: 'center', color: colors.primary, fontSize: 14 },
});
