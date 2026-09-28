import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface Column<T> {
    key: string;
    header: string;
    align?: 'left' | 'right' | 'center';
    cell?: (row: T) => ReactNode;
    mono?: boolean;
    className?: string;
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
    return (
        <div className="overflow-x-auto">
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
                                    {c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '-')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}