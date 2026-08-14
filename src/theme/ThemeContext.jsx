import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const STORAGE_KEY = 'rumbo:theme-mode';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  // 'system' | 'light' | 'dark': lo que el usuario eligió, no lo que se
  // está mostrando (eso es resolvedScheme más abajo).
  const [mode, setMode] = useState('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setMode(saved);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setThemeMode = async (newMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.error('No se pudo guardar la preferencia de tema:', error);
    }
  };

  const resolvedScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, setThemeMode, resolvedScheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
