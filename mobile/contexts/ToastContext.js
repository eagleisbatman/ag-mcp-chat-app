import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
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
  const nextId = useRef(1);
  const [current, setCurrent] = useState(null); // { id, message, type, duration, action }
  const [visible, setVisible] = useState(false);
  const queueRef = useRef([]);
  const [queueCount, setQueueCount] = useState(0);
  const [dismissToken, setDismissToken] = useState(0);

  const showToast = useCallback((message, type = 'info', duration = 3000, action = null) => {
    const toast = {
      id: nextId.current++,
      message,
      type,
      duration,
      action,
    };

    setCurrent((prevCurrent) => {
      if (!prevCurrent) {
        setVisible(true);
        return toast;
      }
      queueRef.current = [...queueRef.current, toast];
      setQueueCount(queueRef.current.length);
      return prevCurrent;
    });
  }, []);

  const hideToast = useCallback(() => {
    setDismissToken((t) => t + 1);
  }, []);

  const handleDismiss = useCallback((dismissedId) => {
    setCurrent((prevCurrent) => {
      if (!prevCurrent || dismissedId !== prevCurrent.id) return prevCurrent;
      const nextToast = queueRef.current[0] ?? null;
      queueRef.current = nextToast ? queueRef.current.slice(1) : [];
      setQueueCount(queueRef.current.length);
      setVisible(Boolean(nextToast));
      return nextToast;
    });
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

  const value = useMemo(
    () => ({ showToast, showError, showSuccess, showWarning, showInfo, hideToast }),
    [showToast, showError, showSuccess, showWarning, showInfo, hideToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        toastId={current?.id}
        visible={visible}
        message={current?.message ?? ''}
        type={current?.type ?? 'info'}
        duration={current?.duration ?? 0}
        action={current?.action ?? null}
        queueCount={queueCount}
        dismissToken={dismissToken}
        onDismiss={handleDismiss}
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
