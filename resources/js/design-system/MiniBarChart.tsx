// Gráfico de barras horizontales para los resúmenes de módulo.
// Mantiene el mismo lenguaje visual de Analítica y del Panel General.

export interface BarraModulo {
    label: string;
    valor: number;
    detalle?: string;
    tono?: 'brand' | 'ok' | 'warn' | 'danger';
}

interface MiniBarChartProps {
    items: BarraModulo[];
    titulo: string;
    subtitulo?: string;
    prefijo?: string;
    sufijo?: string;
    vacio?: string;
}

const TONOS: Record<NonNullable<BarraModulo['tono']>, string> = {
    brand: 'bg-brand-500',
    ok: 'bg-exito',
    warn: 'bg-atencion',
    danger: 'bg-critico',
};

export function MiniBarChart({
    items,
    titulo,
    subtitulo,
    prefijo = '',
    sufijo = '',
    vacio = 'Sin datos para graficar.',
}: MiniBarChartProps) {
    const maximo = Math.max(...items.map((item) => item.valor), 1);

    return (
        <section className="border-line bg-surface rounded-xl border p-4">
            <header className="mb-3">
                <h3 className="text-ink text-sm font-bold">{titulo}</h3>
                {subtitulo && (
                    <p className="text-muted text-[11px]">{subtitulo}</p>
                )}
            </header>

            {items.length === 0 ? (
                <p className="text-muted py-4 text-center text-xs">{vacio}</p>
            ) : (
                <ul className="space-y-3">
                    {items.map((item, indice) => (
                        <li
                            key={`${item.label}-${indice}`}
                            className="group"
                            title={`${item.label}: ${item.valor}${sufijo}`}
                        >
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                                <span className="text-ink truncate font-medium">
                                    {item.label}
                                </span>
                                <span className="text-muted font-mono">
                                    {prefijo}
                                    {item.valor.toLocaleString('es-PE', {
                                        maximumFractionDigits: 1,
                                    })}
                                    {sufijo}
                                </span>
                            </div>
                            <div className="bg-soft mt-1 h-2 overflow-hidden rounded-full">
                                <div
                                    className={`cpm-bar-grow h-full rounded-full transition-all duration-300 group-hover:brightness-110 ${
                                        TONOS[item.tono ?? 'brand']
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (item.valor / maximo) * 100,
                                        )}%`,
                                    }}
                                />
                            </div>
                            {item.detalle && (
                                <p className="text-muted mt-0.5 text-[10px]">
                                    {item.detalle}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
