import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Mascot from '../components/Mascot';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const STEPS = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'];

export default function OnboardingScreen({ onFinish }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const isLast = index === STEPS.length - 1;

  const animateTo = (nextIndex) => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setIndex(nextIndex), 140);
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    animateTo(index + 1);
  };

  const handleBack = () => {
    if (index === 0) return;
    animateTo(index - 1);
  };

  const step = STEPS[index];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onFinish}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.skip')}
      >
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Mascot size={72} style={styles.mascot} />
        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.title}>{t(`onboarding.${step}Title`)}</Text>
          <Text style={styles.body}>{t(`onboarding.${step}Body`)}</Text>
        </Animated.View>
      </View>

      <View style={styles.dots}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.backButton, index === 0 && styles.backButtonHidden]}
          onPress={handleBack}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.back')}
        >
          <Text style={styles.backText}>{t('onboarding.back')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('onboarding.start') : t('onboarding.next')}
        >
          <Text style={styles.nextText}>{isLast ? t('onboarding.start') : t('onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'space-between' },
  skipButton: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  skipText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  mascot: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 14 },
  body: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 23 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { minHeight: 52, paddingHorizontal: 16, justifyContent: 'center' },
  backButtonHidden: { opacity: 0 },
  backText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 32,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
