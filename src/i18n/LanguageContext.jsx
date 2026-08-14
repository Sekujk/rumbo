import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './translations';

const STORAGE_KEY = 'rumbo:language';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  }
  return context;
};

const detectDeviceLanguage = () => {
  const code = Localization.getLocales()[0]?.languageCode;
  return SUPPORTED_LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(DEFAULT_LANGUAGE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
          setLang(saved);
        } else {
          setLang(detectDeviceLanguage());
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setLanguage = async (newLang) => {
    if (!SUPPORTED_LANGUAGES.includes(newLang)) return;
    setLang(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (error) {
      console.error('No se pudo guardar la preferencia de idioma:', error);
    }
  };

  // Interpolación simple {{param}} -- alcanza para el tamaño de esta app,
  // no hace falta una librería de i18n con pluralización automática (la
  // decisión singular/plural la toma quien llama a t(), eligiendo la
  // clave correcta).
  const t = (key, params) => {
    const dict = translations[lang] || translations[DEFAULT_LANGUAGE];
    const template = dict[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
    if (!params) return template;
    return Object.keys(params).reduce(
      (str, paramKey) => str.split(`{{${paramKey}}}`).join(String(params[paramKey])),
      template
    );
  };

  if (!loaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
