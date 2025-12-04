import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

/**
 * ToastProvider - Provides toast notification functionality throughout the app
 * 
 * Usage:
 *   const { showToast, showError, showSuccess, showWarning } = useToast();
 *   showError('Something went wrong');
 *   showSuccess('Message sent!');
 *   showWarning('Low battery');
 *   showToast('Custom message', 'info', 5000, { label: 'Retry', onPress: () => {} });
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
    action: null,
  });

  const showToast = useCallback((message, type = 'info', duration = 3000, action = null) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
      action,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  // Convenience methods
  const showError = useCallback((message, action = null) => {
    showToast(message, 'error', 4000, action);
  }, [showToast]);

  const showSuccess = useCallback((message, action = null) => {
    showToast(message, 'success', 2500, action);
  }, [showToast]);

  const showWarning = useCallback((message, action = null) => {
    showToast(message, 'warning', 3500, action);
  }, [showToast]);

  const showInfo = useCallback((message, action = null) => {
    showToast(message, 'info', 3000, action);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showWarning, showInfo, hideToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        action={toast.action}
        onDismiss={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export default ToastContext;

