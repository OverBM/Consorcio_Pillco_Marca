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

export function iniciales(nombre: string): string {
    return nombre
        .replace(/^Ing\.\s*/i, '')
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
}
