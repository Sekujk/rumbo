import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Linking, Animated, BackHandler } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppAlert } from '../context/AppAlertContext';
import Mascot from '../components/Mascot';

const RELEASES_API = 'https://api.github.com/repos/Sekujk/rumbo/releases/latest';
const RELEASES_PAGE = 'https://github.com/Sekujk/rumbo/releases/latest';

function isNewerVersion(remote, local) {
  const r = remote.replace(/^v/, '').split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i += 1) {
    const rv = r[i] || 0;
    const lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

export default function UpdateScreen({ onExit }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { confirm } = useAppAlert();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const [status, setStatus] = useState('checking');
  const [latest, setLatest] = useState(null);
  const [progress, setProgress] = useState(0);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(10)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const checkForUpdates = async () => {
    setStatus('checking');
    try {
      const res = await fetch(RELEASES_API);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const remoteVersion = data.tag_name || '';
      const apkAsset = (data.assets || []).find((a) => a.name.toLowerCase().endsWith('.apk'));
      if (remoteVersion && isNewerVersion(remoteVersion, currentVersion)) {
        setLatest({ version: remoteVersion.replace(/^v/, ''), apkUrl: apkAsset?.browser_download_url });
        setStatus('available');
      } else {
        setStatus('upToDate');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  useEffect(() => {
    if (status === 'downloading') return;
    cardOpacity.setValue(0);
    cardTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(cardTranslate, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [status]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 200, useNativeDriver: false }).start();
  }, [progress]);

  useEffect(() => {
    const onBackPress = () => {
      if (status === 'downloading') {
        confirm({
          title: t('update.exitConfirmTitle'),
          message: t('update.exitConfirmMessage'),
          confirmText: t('update.exitConfirmConfirm'),
          destructive: true,
          onConfirm: onExit,
        });
      } else {
        onExit?.();
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [status, onExit, t, confirm]);

  const handleDownloadAndInstall = async () => {
    if (!latest?.apkUrl) return;
    setStatus('downloading');
    setProgress(0);
    progressAnim.setValue(0);
    try {
      const fileUri = `${FileSystem.cacheDirectory}Rumbo.apk`;
      const downloadResumable = FileSystem.createDownloadResumable(
        latest.apkUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const pct = downloadProgress.totalBytesExpectedToWrite
            ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
            : 0;
          setProgress(pct);
        }
      );
      const result = await downloadResumable.downloadAsync();
      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/vnd.android.package-archive',
      });
      setStatus('available');
    } catch (error) {
      setStatus('downloadError');
    }
  };

  const percent = Math.round(progress * 100);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <View style={styles.versionPill}>
        <Text style={styles.versionPillText}>{t('update.currentVersion', { version: currentVersion })}</Text>
      </View>

      {status === 'checking' && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.statusText}>{t('update.checking')}</Text>
        </View>
      )}

      {status === 'upToDate' && (
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
          <Mascot size={56} />
          <Text style={styles.statusText}>{t('update.upToDate', { version: currentVersion })}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={checkForUpdates} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{t('update.checkAgain')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {(status === 'available' || status === 'downloadError') && latest && (
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.statusText}>{t('update.available', { version: latest.version })}</Text>
          {status === 'downloadError' && <Text style={styles.errorText}>{t('update.downloadErrorMessage')}</Text>}
          {Platform.OS === 'android' && latest.apkUrl ? (
            <TouchableOpacity
              style={styles.button}
              onPress={handleDownloadAndInstall}
              accessibilityRole="button"
              accessibilityLabel={t('update.downloadButton')}
            >
              <Ionicons name="download-outline" size={18} color={colors.background} />
              <Text style={styles.buttonText}>{t('update.downloadButton')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>{t('update.androidOnly')}</Text>
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Linking.openURL(RELEASES_PAGE)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>{t('update.viewOnGithub')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {status === 'downloading' && (
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.percentText}>{percent}%</Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.statusText}>{t('update.downloading', { percent })}</Text>
        </View>
      )}

      {status === 'error' && (
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
          <Text style={styles.errorText}>{t('update.errorMessage')}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={checkForUpdates} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{t('update.checkAgain')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: colors.background },
  versionPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 16,
    marginBottom: 28,
  },
  versionPillText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  center: { alignItems: 'center', gap: 12 },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusText: { fontSize: 15, color: colors.text, textAlign: 'center', fontWeight: '600', marginTop: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center', marginBottom: 16 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 8 },
  button: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  percentText: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 12 },
  progressTrack: { width: '100%', height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
});
