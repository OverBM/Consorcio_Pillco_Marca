import { cn } from '../utils/cn';

/**
 * Primitivas de carga (skeleton). Reservan el espacio del contenido para evitar
 * saltos de disposición mientras llegan los datos (props diferidos con Inertia).
 */
export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={cn('bg-line/60 animate-pulse rounded-md', className)}
        />
    );
}

export function SkeletonText({
    lines = 3,
    className,
}: {
    lines?: number;
    className?: string;
}) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton
                    key={index}
                    className={cn(
                        'h-3',
                        index === lines - 1 ? 'w-2/3' : 'w-full',
                    )}
                />
            ))}
        </div>
    );
}

export function SkeletonKpi({ className }: { className?: string }) {
    return (
        <div
            className={cn('card flex items-center gap-4 p-5', className)}
            aria-hidden="true"
        >
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );
}

export function SkeletonKpiGrid({
    count = 7,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label="Cargando indicadores"
            className={cn(
                'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7',
                className,
            )}
        >
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonKpi key={index} />
            ))}
        </div>
    );
}

export function SkeletonTable({
    rows = 6,
    className,
}: {
    rows?: number;
    className?: string;
}) {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label="Cargando registros"
            className={cn('space-y-2', className)}
        >
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: rows }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
            ))}
        </div>
    );
}

export function SkeletonCard({
    lines = 4,
    className,
    children,
}: {
    lines?: number;
    className?: string;
    children?: React.ReactNode;
}) {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label="Cargando contenido"
            className={cn('card p-5', className)}
        >
            <Skeleton className="mb-4 h-4 w-40" />
            {children ?? <SkeletonText lines={lines} />}
        </div>
    );
}
