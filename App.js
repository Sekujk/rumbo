import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { supabase } from './src/config/supabase';
import { ensureDefaultCategories } from './src/config/defaultCategories';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const TABS = [
  { id: 'dashboard', labelKey: 'tab.dashboard', icon: 'stats-chart', Component: DashboardScreen },
  { id: 'add', labelKey: 'tab.add', icon: 'add-circle', Component: AddTransactionScreen },
  { id: 'history', labelKey: 'tab.history', icon: 'time', Component: HistoryScreen },
  { id: 'budgets', labelKey: 'tab.budgets', icon: 'wallet', Component: BudgetsScreen },
];

function MainApp() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [ready, setReady] = useState(false);

  // Entrada de toda la pantalla al terminar de loguearse -- antes pasaba
  // de golpe del login al dashboard sin transición.
  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountScale = useRef(new Animated.Value(0.98)).current;

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  // Una escala animada por pestaña -- se crea una sola vez, no en cada
  // render, para que el "rebote" al tocar no se reinicie de golpe.
  const tabScales = useRef(TABS.reduce((acc, tab) => {
    acc[tab.id] = new Animated.Value(1);
    return acc;
  }, {})).current;

  useEffect(() => {
    ensureDefaultCategories(supabase, session.user.id)
      .catch((error) => console.error('No se pudieron crear las categorías por defecto:', error))
      .finally(() => setReady(true));
  }, [session.user.id]);

  useEffect(() => {
    if (!ready) return;
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(mountScale, { toValue: 1, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, [ready]);

  // Mismo lenguaje de movimiento para cambiar de pestaña, abrir el perfil
  // o volver de él -- una sola animación de "ventana que se desliza" con
  // dirección, reusada en los tres casos.
  const animateTransition = (direction) => {
    contentOpacity.setValue(0);
    contentTranslateX.setValue(direction * 20);
    headerOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(contentTranslateX, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const handleTabPress = (id) => {
    if (id === activeTab && !showProfile) return;
    const oldIndex = TABS.findIndex((t) => t.id === activeTab);
    const newIndex = TABS.findIndex((t) => t.id === id);
    // Positivo si vas hacia una pestaña más a la derecha -- el contenido
    // entra desde ese lado, como una ventana que se desliza, no solo un
    // fundido plano.
    const direction = showProfile ? -1 : newIndex > oldIndex ? 1 : -1;

    Animated.sequence([
      Animated.timing(tabScales[id], { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(tabScales[id], { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();

    animateTransition(direction);
    setActiveTab(id);
    setShowProfile(false);
  };

  const handleOpenProfile = () => {
    animateTransition(1);
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    animateTransition(-1);
    setShowProfile(false);
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const activeTabInfo = TABS.find((tab) => tab.id === activeTab);
  const ActiveComponent = activeTabInfo.Component;

  return (
    <Animated.View style={[styles.flex, { opacity: mountOpacity, transform: [{ scale: mountScale }] }]}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          {showProfile ? (
            <TouchableOpacity
              onPress={handleCloseProfile}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('header.back')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
              <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]}>
                {t('header.profile')}
              </Animated.Text>
            </TouchableOpacity>
          ) : (
            <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]}>
              {t(activeTabInfo.labelKey)}
            </Animated.Text>
          )}
          {!showProfile && (
            <TouchableOpacity
              onPress={handleOpenProfile}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('header.profileIcon')}
            >
              <Ionicons name="person-circle-outline" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          style={[styles.flex, { opacity: contentOpacity, transform: [{ translateX: contentTranslateX }] }]}
        >
          {showProfile ? <ProfileScreen /> : <ActiveComponent />}
        </Animated.View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const label = t(tab.labelKey);
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => handleTabPress(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
              >
                <Animated.View style={{ transform: [{ scale: tabScales[tab.id] }] }}>
                  <Ionicons
                    name={active ? tab.icon : `${tab.icon}-outline`}
                    size={22}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </Animated.View>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1} adjustsFontSizeToFit>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

function Root() {
  const { session, isLoading } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return session ? <MainApp /> : <AuthScreen />;
}

function ThemedStatusBar() {
  const { resolvedScheme } = useTheme();
  return <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <Root />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const getStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  // minHeight 56 asegura que todo el botón (ícono + texto) supere el mínimo
  // táctil de 48dp/44pt, no solo el ícono.
  tabButton: { flex: 1, minHeight: 56, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  // El activo no se distingue solo por color (evita depender del color para
  // comunicar estado): también cambia el ícono a su versión rellena y suma
  // un fondo sutil.
  tabButtonActive: { backgroundColor: colors.primarySoft },
  tabLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: colors.primary },
});
