import { cn } from '../utils/cn';
import { formatNum } from '../utils/format';

/** Barras de movimientos últimos 7 días (ingresos vs salidas) del Panel General. */
export function BarChart7d({
    data,
    onBarClick,
}: {
    data: { etiqueta: string; ingreso: number; salida: number }[];
    onBarClick?: (etiqueta: string) => void;
}) {
    const max = Math.max(1, ...data.flatMap((d) => [d.ingreso, d.salida]));
    return (
        <div className="flex items-end gap-3">
            {data.map((d) => (
                <div
                    key={d.etiqueta}
                    className="flex flex-1 flex-col items-center gap-1.5"
                    title={`Ingresos ${formatNum(d.ingreso)} · Salidas ${formatNum(d.salida)}`}
                    onClick={() => onBarClick?.(d.etiqueta)}
                >
                    <div className="flex h-36 w-full max-w-9 items-end justify-center gap-1">
                        <div
                            className="w-3 rounded-t-md bg-brand-500 transition-[height] duration-300 hover:bg-brand-600"
                            style={{ height: `${Math.round((d.ingreso / max) * 100)}%` }}
                        />
                        <div
                            className="w-3 rounded-t-md bg-ok-soft transition-[height] duration-300"
                            style={{ height: `${Math.round((d.salida / max) * 100)}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-medium text-muted">{d.etiqueta}</span>
                </div>
            ))}
        </div>
    );
}

export function ChartLegend({ items }: { items: { label: string; className: string }[] }) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            {items.map((i) => (
                <span key={i.label} className="flex items-center gap-1.5 text-xs text-muted">
                    <span className={cn('h-2.5 w-2.5 rounded-sm', i.className)} />
                    {i.label}
                </span>
            ))}
        </div>
    );
}