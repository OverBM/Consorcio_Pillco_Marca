import React from 'react';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
    isMono?: boolean;
    /** Oculta la columna en la vista de tarjetas (móvil). */
    hideOnCard?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
    emptyMessage?: string;
    className?: string;
}

function renderCell<T>(col: Column<T>, item: T): React.ReactNode {
    if (col.cell) {
        return col.cell(item);
    }

    if (col.accessorKey) {
        return (item[col.accessorKey] as React.ReactNode) ?? '';
    }

    return null;
}

export function DataTable<T>({
    data,
    columns,
    keyField,
    emptyMessage = 'No se encontraron registros.',
    className = '',
}: DataTableProps<T>) {
    const columnasTarjeta = columns.filter((col) => !col.hideOnCard);

    return (
        <div className={`overflow-x-auto rounded-[16px] border border-[#c6c6c6]/60 bg-white shadow-sm ${className}`}>
            {/* Vista de tabla (pantallas medianas y superiores) */}
            <table className="hidden w-full text-left border-collapse text-xs md:table">
                <thead>
                    <tr className="border-b border-[#c6c6c6] bg-[#f3f3f3] text-[#444444] font-mono text-[10px] uppercase tracking-wider">
                        {columns.map((col, idx) => (
                            <th key={idx} className={`py-3 px-4 font-semibold ${col.className || ''}`}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="py-8 text-center text-[#666666] font-mono text-xs">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((item) => (
                            <tr key={String(item[keyField])} className="hover:bg-[#fafafa] transition-colors">
                                {columns.map((col, cIdx) => (
                                    <td
                                        key={cIdx}
                                        className={`py-3 px-4 text-[#000000] ${
                                            col.isMono ? 'font-mono text-[11px]' : ''
                                        } ${col.className || ''}`}
                                    >
                                        {renderCell(col, item)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Vista de tarjetas (pantallas pequeñas) */}
            <div className="divide-y divide-[#e5e5e5] md:hidden">
                {data.length === 0 ? (
                    <div className="py-8 text-center text-[#666666] font-mono text-xs">{emptyMessage}</div>
                ) : (
                    data.map((item) => (
                        <div key={String(item[keyField])} className="space-y-2 p-4">
                            {columnasTarjeta.map((col, cIdx) => (
                                <div key={cIdx} className="flex items-start justify-between gap-3">
                                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#666666]">
                                        {col.header}
                                    </span>
                                    <span
                                        className={`min-w-0 text-right text-[#000000] ${
                                            col.isMono ? 'font-mono text-[11px]' : 'text-xs'
                                        }`}
                                    >
                                        {renderCell(col, item)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
