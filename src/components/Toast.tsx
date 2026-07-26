import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface ToastData {
  id: number;
  message: string;
  image?: string;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

const ToastItem: React.FC<{ toast: ToastData; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 shadow-luxury transition-all duration-300 max-w-[320px] ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      {toast.image ? (
        <img src={toast.image} alt="" className="w-9 h-9 rounded-md object-cover border border-border/50 flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-md bg-primary-container flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-on-surface truncate">{toast.message}</p>
        <p className="text-[10px] text-primary font-medium">Added to bag</p>
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="p-1 text-on-surface-muted hover:text-on-surface transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[70] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
