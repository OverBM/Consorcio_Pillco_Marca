import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { ApiError } from '@/services/http/client';
import { cn } from '@/utils/cn';

export type NotificationKind = 'success' | 'error' | 'info';

export interface NotificationOptions {
    title?: string;
    duration?: number;
}

interface Notification extends NotificationOptions {
    id: number;
    kind: NotificationKind;
    message: string;
}

export interface NotifyApi {
    success: (message: string, options?: NotificationOptions) => number;
    error: (message: string, options?: NotificationOptions) => number;
    info: (message: string, options?: NotificationOptions) => number;
    apiError: (error: unknown, fallback?: string) => number;
    dismiss: (id: number) => void;
}

const NotificationContext = createContext<NotifyApi | null>(null);

const DEFAULT_DURATION = 4500;

const ICONS: Record<NotificationKind, ReactNode> = {
    success: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
            />
        </svg>
    ),
    error: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
            />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z"
                clipRule="evenodd"
            />
        </svg>
    ),
};

const STYLES: Record<NotificationKind, string> = {
    success: 'border-emerald-300 bg-ok-soft text-emerald-900',
    error: 'border-orange-300 bg-danger-soft text-orange-900',
    info: 'border-brand-200 bg-brand-50 text-brand-800',
};

function mensajeApiError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        const campos = Object.values(error.errors).flat();

        if (campos.length > 0) {
            return campos.join(' ');
        }

        return error.message || fallback;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const counter = useRef(0);
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    const dismiss = useCallback((id: number) => {
        const timer = timers.current.get(id);

        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }

        setNotifications((current) => current.filter((item) => item.id !== id));
    }, []);

    const push = useCallback(
        (kind: NotificationKind, message: string, options?: NotificationOptions): number => {
            const id = ++counter.current;
            const duration = options?.duration ?? DEFAULT_DURATION;

            setNotifications((current) => [...current, { id, kind, message, ...options }]);

            if (duration > 0) {
                timers.current.set(
                    id,
                    setTimeout(() => dismiss(id), duration),
                );
            }

            return id;
        },
        [dismiss],
    );

    const api = useMemo<NotifyApi>(
        () => ({
            success: (message, options) => push('success', message, options),
            error: (message, options) => push('error', message, options),
            info: (message, options) => push('info', message, options),
            apiError: (error, fallback = 'Ocurrió un error inesperado.') =>
                push('error', mensajeApiError(error, fallback)),
            dismiss,
        }),
        [push, dismiss],
    );

    return (
        <NotificationContext.Provider value={api}>
            {children}
            {typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
                          aria-live="polite"
                          aria-atomic="false"
                      >
                          {notifications.map((item) => (
                              <div
                                  key={item.id}
                                  role="status"
                                  aria-live="polite"
                                  className={cn(
                                      'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
                                      STYLES[item.kind],
                                  )}
                              >
                                  <span className="mt-0.5 shrink-0">{ICONS[item.kind]}</span>
                                  <div className="min-w-0 flex-1">
                                      {item.title && <p className="text-sm font-semibold">{item.title}</p>}
                                      <p className="text-[13px] leading-snug break-words">{item.message}</p>
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => dismiss(item.id)}
                                      aria-label="Cerrar notificación"
                                      className="shrink-0 cursor-pointer rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                                  >
                                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                                          <path
                                              fillRule="evenodd"
                                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                              clipRule="evenodd"
                                          />
                                      </svg>
                                  </button>
                              </div>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </NotificationContext.Provider>
    );
}

export function useNotifications(): NotifyApi {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error('useNotifications debe usarse dentro de <NotificationProvider>');
    }

    return context;
}
