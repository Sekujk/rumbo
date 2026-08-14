import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

const RELEASES_API = 'https://api.github.com/repos/Sekujk/rumbo/releases/latest';
const RELEASES_PAGE = 'https://github.com/Sekujk/rumbo/releases/latest';

// Compara versiones "1.2.3" (semver simple, sin librería): más que
// suficiente para el esquema de versión de app.json.
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

export default function UpdateScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const [status, setStatus] = useState('checking'); // checking | upToDate | available | downloading | error
  const [latest, setLatest] = useState(null); // { version, apkUrl }
  const [progress, setProgress] = useState(0);

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

  const handleDownloadAndInstall = async () => {
    if (!latest?.apkUrl) return;
    setStatus('downloading');
    setProgress(0);
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
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
      setStatus('available');
    } catch (error) {
      setStatus('downloadError');
    }
  };

  const percent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={status === 'upToDate' ? 'checkmark-circle' : 'cloud-download-outline'}
          size={40}
          color={status === 'upToDate' ? colors.success : colors.primary}
        />
      </View>

      <Text style={styles.currentVersion}>{t('update.currentVersion', { version: currentVersion })}</Text>

      {status === 'checking' && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.statusText}>{t('update.checking')}</Text>
        </View>
      )}

      {status === 'upToDate' && (
        <>
          <Text style={styles.statusText}>{t('update.upToDate', { version: currentVersion })}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={checkForUpdates} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{t('update.checkAgain')}</Text>
          </TouchableOpacity>
        </>
      )}

      {(status === 'available' || status === 'downloadError') && latest && (
        <>
          <Text style={styles.statusText}>{t('update.available', { version: latest.version })}</Text>
          {status === 'downloadError' && <Text style={styles.errorText}>{t('update.downloadErrorMessage')}</Text>}
          {Platform.OS === 'android' && latest.apkUrl ? (
            <TouchableOpacity
              style={styles.button}
              onPress={handleDownloadAndInstall}
              accessibilityRole="button"
              accessibilityLabel={t('update.downloadButton')}
            >
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
        </>
      )}

      {status === 'downloading' && (
        <View style={styles.center}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.statusText}>{t('update.downloading', { percent })}</Text>
        </View>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.errorText}>{t('update.errorMessage')}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={checkForUpdates} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{t('update.checkAgain')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: colors.background },
  iconWrap: { marginTop: 24, marginBottom: 12 },
  currentVersion: { fontSize: 13, color: colors.textFaint, marginBottom: 24 },
  center: { alignItems: 'center', gap: 12 },
  statusText: { fontSize: 15, color: colors.text, textAlign: 'center', fontWeight: '600', marginBottom: 16 },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center', marginBottom: 16 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 8 },
  button: {
    width: '100%',
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
  progressTrack: { width: '100%', height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
});
