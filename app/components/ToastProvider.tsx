"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Toast = { id: number; type?: 'success' | 'error' | 'info'; message: string };

const ToastContext = createContext<{ show: (message: string, type?: Toast['type']) => void } | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // fallback no-op to avoid runtime crashes when used outside provider (development edge cases)
    return { show: (_msg: string, _type?: Toast['type']) => {} };
  }
  return ctx;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const t = { id, message, type };
    setToasts((s) => [t, ...s]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type || ''}`} role="status">
              <div className="flex-1">
                <div style={{ fontWeight: 600 }}>{t.type?.toUpperCase() || 'INFO'}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.message}</div>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
