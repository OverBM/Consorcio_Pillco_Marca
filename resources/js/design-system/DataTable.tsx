import React from 'react';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
    isMono?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
    emptyMessage?: string;
    className?: string;
}

export function DataTable<T>({
    data,
    columns,
    keyField,
    emptyMessage = 'No se encontraron registros.',
    className = '',
}: DataTableProps<T>) {
    return (
        <div className={`overflow-x-auto rounded-[16px] border border-[#c6c6c6]/60 bg-white shadow-sm ${className}`}>
            <table className="w-full text-left border-collapse text-xs">
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
                                        {col.cell
                                            ? col.cell(item)
                                            : col.accessorKey
                                            ? (item[col.accessorKey] as React.ReactNode) ?? ''
                                            : null}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
