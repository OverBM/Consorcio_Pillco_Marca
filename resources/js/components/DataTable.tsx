import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface Column<T> {
    key: string;
    header: string;
    align?: 'left' | 'right' | 'center';
    cell?: (row: T) => ReactNode;
    mono?: boolean;
    className?: string;
    /** Oculta la columna en la vista de tarjetas (móvil). */
    hideOnCard?: boolean;
}

function renderValue<T>(column: Column<T>, row: T): ReactNode {
    if (column.cell) {
        return column.cell(row);
    }

    const value = (row as Record<string, unknown>)[column.key];

    return value !== null && value !== undefined ? (value as ReactNode) : '-';
}

export function DataTable<T extends { id: string }>({
    columns,
    rows,
    onRowClick,
    emptyLabel = 'Sin registros.',
}: {
    columns: Column<T>[];
    rows: T[];
    onRowClick?: (row: T) => void;
    emptyLabel?: string;
}) {
    if (rows.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-muted">{emptyLabel}</div>
        );
    }

    const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
    const cardColumns = columns.filter((c) => !c.hideOnCard);

    return (
        <div>
            {/* Vista de tabla (pantallas medianas y superiores) */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-line text-left">
                            {columns.map((c) => (
                                <th
                                    key={c.key}
                                    className={cn(
                                        'whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted',
                                        alignCls[c.align ?? 'left'],
                                        c.className,
                                    )}
                                >
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick?.(row)}
                                className={cn(
                                    'border-b border-line/70 transition-colors last:border-0',
                                    onRowClick && 'cursor-pointer hover:bg-brand-50/40',
                                )}
                            >
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={cn(
                                            'whitespace-nowrap px-3 py-2.5 align-middle',
                                            alignCls[c.align ?? 'left'],
                                            c.mono && 'num',
                                            c.className,
                                        )}
                                    >
                                        {renderValue(c, row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista de tarjetas (pantallas pequeñas) */}
            <ul className="divide-y divide-line/70 md:hidden">
                {rows.map((row) => (
                    <li
                        key={row.id}
                        onClick={() => onRowClick?.(row)}
                        className={cn('space-y-2 py-3', onRowClick && 'cursor-pointer')}
                    >
                        {cardColumns.map((c, idx) => (
                            <div key={c.key} className="flex items-start justify-between gap-3">
                                <span
                                    className={cn(
                                        'shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted',
                                        idx === 0 && 'sr-only',
                                    )}
                                >
                                    {c.header}
                                </span>
                                <span
                                    className={cn(
                                        'min-w-0 text-right text-sm text-ink',
                                        idx === 0 && 'w-full text-left font-semibold',
                                        alignCls[c.align ?? 'left'],
                                        c.mono && 'num',
                                        c.className,
                                    )}
                                >
                                    {renderValue(c, row)}
                                </span>
                            </div>
                        ))}
                    </li>
                ))}
            </ul>
        </div>
    );
}
