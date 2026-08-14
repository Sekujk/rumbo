import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

// "Sol": la mascota de Rumbo. Nombre con doble sentido a propósito, el
// Sol es la moneda de Perú y también el astro. Sin assets de imagen (este
// entorno no genera ilustraciones): un emoji con un rebote suave y
// continuo es suficiente para darle personalidad sin quedar forzado.
export default function Mascot({ size = 48, style, animated = true }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.Text
      style={[styles.emoji, { fontSize: size, transform: [{ translateY: animated ? translateY : 0 }] }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      🪙
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  emoji: { textAlign: 'center' },
});
