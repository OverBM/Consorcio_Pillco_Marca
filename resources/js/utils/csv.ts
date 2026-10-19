// Exportación CSV de la Matriz de Stock filtrada.

function aTexto(valor: unknown): string {
    if (valor === null || valor === undefined) {
        return '';
    }

    if (
        typeof valor === 'number' ||
        typeof valor === 'boolean' ||
        typeof valor === 'bigint'
    ) {
        return String(valor);
    }

    return typeof valor === 'string' ? valor : JSON.stringify(valor);
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
    if (rows.length === 0) {
        return '';
    }
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown): string => {
        const s = aTexto(v);
        if (/[",\n;]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const lineas = rows.map((r) => headers.map((h) => esc(r[h])).join(','));
    return [headers.join(','), ...lineas].join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
    const blob = new Blob(['\uFEFF' + content], {
        type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
