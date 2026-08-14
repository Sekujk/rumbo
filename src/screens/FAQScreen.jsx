import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUESTION_COUNT = 8;

function FAQItem({ question, answer, colors, styles }) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, { toValue: open ? 0 : 1, duration: 180, useNativeDriver: true }).start();
    setOpen((prev) => !prev);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.item}>
      <TouchableOpacity
        style={styles.itemHeader}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={question}
      >
        <Text style={styles.question}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      {open && <Text style={styles.answer}>{answer}</Text>}
    </View>
  );
}

export default function FAQScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const items = Array.from({ length: QUESTION_COUNT }, (_, i) => ({
    question: t(`faq.q${i + 1}`),
    answer: t(`faq.a${i + 1}`),
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {items.map((item) => (
        <FAQItem key={item.question} question={item.question} answer={item.answer} colors={colors} styles={styles} />
      ))}
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 52,
    gap: 12,
  },
  question: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 19 },
  answer: { fontSize: 13, color: colors.textMuted, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 16 },
});
