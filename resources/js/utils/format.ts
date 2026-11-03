// Formato de números, fechas, moneda y cantidades (es-PE).

const FMT_NUM = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const FMT_MONEY = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

export function formatNum(n: number): string {
    return FMT_NUM.format(n);
}

export function formatMoneda(m: number): string {
    return FMT_MONEY.format(m);
}

export function formatKm(km: number): string {
    return `${Math.round(km * 10) / 10} km`;
}

export function formatCantidad(n: number, unidad?: string): string {
    const formatted = FMT_NUM.format(n);
    return unidad ? `${formatted} ${unidad}` : formatted;
}

export function formatFecha(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

/**
 * Fecha calendario sin desplazamiento de zona horaria. Se usa para campos
 * `date` que llegan como `YYYY-MM-DD` o como medianoche UTC.
 */
export function formatFechaCalendario(iso: string): string {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

    if (!coincidencia) {
        return formatFecha(iso);
    }

    const [, anio, mes, dia] = coincidencia;
    const date = new Date(Number(anio), Number(mes) - 1, Number(dia));

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export function formatFs(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Fecha exacta con hora para tooltips y pies de figura. Las fechas sin hora
 * (YYYY-MM-DD) se interpretan como hora local 00:00, sin desplazamiento UTC.
 */
export function formatFechaHora(iso: string): string {
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
    const date = new Date(soloFecha ? `${iso}T00:00:00` : iso);

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function iniciales(nombre: string): string {
    return nombre
        .replace(/^Ing\.\s*/i, '')
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
}
