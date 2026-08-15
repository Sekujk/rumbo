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

  // Mensaje informativo con un solo botón (reemplaza Alert.alert(title, message)).
  const notify = useCallback(({ title, message, variant = 'info', buttonText }) => {
    setState({ kind: 'notify', title, message, variant, buttonText });
  }, []);

  // Confirmación con Cancelar + acción (reemplaza Alert.alert con 2 botones).
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
