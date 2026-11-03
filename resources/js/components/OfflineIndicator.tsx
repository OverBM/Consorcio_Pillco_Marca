import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { cn } from '../utils/cn';

export function OfflineIndicator() {
    const { online, pendientes, sincronizando } = useOfflineQueue();

    if (online && pendientes === 0 && !sincronizando) {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed bottom-4 left-4 z-[2000] rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold shadow-lg',
                online
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-amber-300 bg-amber-50 text-amber-700',
            )}
            role="status"
            aria-live="polite"
        >
            {!online
                ? `Sin conexión · ${pendientes} pendientes`
                : sincronizando
                  ? 'Sincronizando eventos…'
                  : `${pendientes} eventos por sincronizar`}
        </div>
    );
}
