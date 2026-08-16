import React, { createContext, useCallback, useContext, useState } from 'react';
import AppAlertModal from '../components/AppAlertModal';

const AppAlertContext = createContext();

export const useAppAlert = () => {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert debe usarse dentro de AppAlertProvider');
  }
  return context;
};

export const AppAlertProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const notify = useCallback(({ title, message, variant = 'info', buttonText }) => {
    setState({ kind: 'notify', title, message, variant, buttonText });
  }, []);

  const confirm = useCallback(({ title, message, confirmText, cancelText, destructive = false, onConfirm }) => {
    setState({ kind: 'confirm', title, message, confirmText, cancelText, destructive, onConfirm });
  }, []);

  const close = useCallback(() => setState(null), []);

  return (
    <AppAlertContext.Provider value={{ notify, confirm }}>
      {children}
      <AppAlertModal state={state} onClose={close} />
    </AppAlertContext.Provider>
  );
};
