import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

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
  const onDismissRef = React.useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismissRef.current(toast.id), 400);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast.id]);

  return (
    <div
      className={`flex items-center gap-3.5 bg-surface/95 backdrop-blur-xl border border-border/80 rounded-2xl px-4 py-3.5 shadow-luxury transition-all duration-400 max-w-[340px] ${
        visible
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-3 opacity-0 scale-95'
      }`}
    >
      {/* Product thumbnail or success icon */}
      {toast.image ? (
        <div className="relative flex-shrink-0">
          <img
            src={toast.image}
            alt=""
            className="w-11 h-11 rounded-xl object-cover border border-border/40 shadow-sm"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
            <Check className="w-3 h-3 text-on-primary" strokeWidth={3} />
          </div>
        </div>
      ) : (
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
          <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-on-surface truncate leading-tight">
          {toast.message}
        </p>
        <p className="text-[10px] text-primary/80 font-medium mt-0.5">
          Added to your bag ✓
        </p>
      </div>

      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 400);
        }}
        className="p-1.5 rounded-lg text-on-surface-muted/60 hover:text-on-surface hover:bg-surface-subtle transition-all flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2.5 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
