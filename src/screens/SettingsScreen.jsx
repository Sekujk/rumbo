import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppAlert } from '../context/AppAlertContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

const THEME_MODES = ['system', 'light', 'dark'];

const REMINDER_ENABLED_KEY = 'rumbo:reminder-enabled';
const REMINDER_HOUR_KEY = 'rumbo:reminder-hour';
const REMINDER_MINUTE_KEY = 'rumbo:reminder-minute';
const REMINDER_NOTIFICATION_ID_KEY = 'rumbo:reminder-notification-id';
const DEFAULT_HOUR = 20;
const DEFAULT_MINUTE = 0;

// Desde el SDK 53 de Expo, Expo Go ya no soporta expo-notifications (ni
// siquiera notificaciones locales) — hace falta una build propia. Sin
// este chequeo, cualquier llamada a Notifications.* revienta con un
// error feo apenas alguien prueba la app en Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

// Se ejecuta una sola vez al importar el módulo (no en cada render):
// define cómo se muestra una notificación mientras la app está abierta,
// y crea el canal de Android que exige mostrar cualquier notificación ahí.
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Recordatorio diario',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export default function SettingsScreen() {
  const { mode, setThemeMode, colors } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const { notify } = useAppAlert();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => {
    const d = new Date();
    d.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const [enabled, hourStr, minuteStr] = await Promise.all([
        AsyncStorage.getItem(REMINDER_ENABLED_KEY),
        AsyncStorage.getItem(REMINDER_HOUR_KEY),
        AsyncStorage.getItem(REMINDER_MINUTE_KEY),
      ]);
      if (enabled === 'true') setReminderEnabled(true);
      const hour = hourStr != null ? parseInt(hourStr, 10) : DEFAULT_HOUR;
      const minute = minuteStr != null ? parseInt(minuteStr, 10) : DEFAULT_MINUTE;
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      setReminderTime(d);
    })();
  }, []);

  const themeModeLabel = {
    system: t('profile.appearanceSystem'),
    light: t('profile.appearanceLight'),
    dark: t('profile.appearanceDark'),
  };
  const languageLabel = {
    es: t('profile.languageEs'),
    en: t('profile.languageEn'),
  };

  const scheduleReminder = async (date) => {
    const existingId = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notification.dailyReminderTitle'),
        body: t('notification.dailyReminderBody'),
      },
      trigger: { hour: date.getHours(), minute: date.getMinutes(), repeats: true },
    });
    await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, id);
  };

  const cancelReminder = async () => {
    const existingId = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
      await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
    }
  };

  const handleToggleReminder = async (value) => {
    if (isExpoGo) {
      notify({
        title: t('profile.expoGoTitle'),
        message: t('profile.expoGoMessage'),
        variant: 'info',
      });
      return;
    }
    if (value) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        notify({
          title: t('profile.notificationPermissionTitle'),
          message: t('profile.notificationPermissionMessage'),
          variant: 'warning',
        });
        return;
      }
      try {
        await scheduleReminder(reminderTime);
        setReminderEnabled(true);
        await AsyncStorage.setItem(REMINDER_ENABLED_KEY, 'true');
      } catch (error) {
        notify({ title: t('common.error'), message: t('profile.reminderErrorMessage'), variant: 'error' });
      }
    } else {
      await cancelReminder();
      setReminderEnabled(false);
      await AsyncStorage.setItem(REMINDER_ENABLED_KEY, 'false');
    }
  };

  const handleTimeChange = async (event, selectedDate) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setReminderTime(selectedDate);
    await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(selectedDate.getHours()));
    await AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(selectedDate.getMinutes()));
    if (reminderEnabled) {
      try {
        await scheduleReminder(selectedDate);
      } catch (error) {
        notify({ title: t('common.error'), message: t('profile.reminderErrorMessage'), variant: 'error' });
      }
    }
  };

  const timeLabel = reminderTime.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-PE', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <View style={styles.prefRow}>
        <Text style={styles.prefLabel}>{t('profile.notifications')}</Text>
        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={styles.reminderTextWrap}>
              <Text style={styles.reminderTitle}>{t('profile.dailyReminder')}</Text>
              <Text style={styles.reminderHint}>{t('profile.dailyReminderHint')}</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={reminderEnabled ? colors.primary : colors.surface}
              accessibilityLabel={t('profile.dailyReminder')}
              accessibilityRole="switch"
            />
          </View>

          {reminderEnabled && (
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setShowTimePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('profile.reminderTime')}: ${timeLabel}`}
            >
              <Text style={styles.timeLabel}>{t('profile.reminderTime')}</Text>
              <Text style={styles.timeValue}>{timeLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showTimePicker && (
        <DateTimePicker value={reminderTime} mode="time" is24Hour={false} display="default" onChange={handleTimeChange} />
      )}
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
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
  reminderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reminderTextWrap: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  reminderHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 44,
  },
  timeLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  timeValue: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
