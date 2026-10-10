import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type Tone, type ToastApi } from './toastContext';
import { cn } from '../../lib/cn';

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      // Errors stay longer so they can be read; every toast can also be dismissed manually.
      timers.current.set(id, window.setTimeout(() => dismiss(id), tone === 'error' ? 9000 : 5000));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ show, success: (message) => show(message, 'success'), error: (message) => show(message, 'error') }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[4px] bg-forest px-4 py-3 text-small text-on-forest shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5)]',
            )}
            style={{ animationDuration: '360ms' }}
          >
            {toast.tone === 'error' ? (
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#f0a395]" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#b0bb9a]" />
            )}
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="-m-1 rounded p-1 text-on-forest-muted hover:text-on-forest">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
