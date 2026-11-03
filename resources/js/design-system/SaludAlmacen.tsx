export interface SaludAlmacenItem {
    almacenId: number;
    nombre: string;
    criticos: number;
    total: number;
    pctCritico: number;
}

function color(pct: number): string {
    if (pct >= 30) {
        return 'bg-critico';
    }

    if (pct >= 15) {
        return 'bg-atencion';
    }

    return 'bg-exito';
}

/** Barras horizontales de criticidad por almacén, ordenadas de mayor a menor. */
export function SaludAlmacen({ almacenes }: { almacenes: SaludAlmacenItem[] }) {
    if (almacenes.length === 0) {
        return (
            <p className="rounded-tile bg-soft text-muted px-4 py-10 text-center text-sm">
                Sin almacenes con stock registrado
            </p>
        );
    }

    return (
        <ul className="space-y-3">
            {almacenes.slice(0, 8).map((almacen) => (
                <li key={almacen.almacenId}>
                    <div className="text-label flex items-baseline justify-between gap-2">
                        <span className="text-ink truncate font-medium">
                            {almacen.nombre}
                        </span>
                        <span className="text-muted text-micro shrink-0 font-mono">
                            {almacen.criticos}/{almacen.total}
                        </span>
                    </div>
                    <div className="rounded-pill bg-soft mt-1 h-2 overflow-hidden">
                        <div
                            className={`rounded-pill h-full ${color(almacen.pctCritico)}`}
                            style={{
                                width: `${Math.min(100, Math.max(2, almacen.pctCritico))}%`,
                            }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}
