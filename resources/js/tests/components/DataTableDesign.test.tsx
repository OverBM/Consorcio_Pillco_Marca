import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable, type Column } from '../../design-system/DataTable';

interface Fila {
    id: number;
    nombre: string;
    monto: number | null;
    estado: string;
}

const filas: Fila[] = [
    { id: 1, nombre: 'Cemento', monto: 1250.5, estado: 'ok' },
    { id: 2, nombre: 'Acero', monto: null, estado: 'bajo' },
];

const columnas: Column<Fila>[] = [
    { header: 'Material', accessorKey: 'nombre' },
    { header: 'Monto', accessorKey: 'monto', isMono: true },
    { header: 'Estado', cell: (fila) => <strong>{fila.estado}</strong> },
    { header: 'Oculta', accessorKey: 'estado', hideOnCard: true },
    { header: 'Solo encabezado' },
];

describe('design-system/DataTable', () => {
    it('renderiza columnas, accesorios, celdas y mono', () => {
        const { container } = render(
            <DataTable
                data={filas}
                columns={columnas}
                keyField="id"
                className="extra"
            />,
        );

        expect(screen.getAllByText('Cemento')[0]).toBeTruthy();
        expect(screen.getAllByText('Acero')[0]).toBeTruthy();
        expect(screen.getAllByText('ok')[0]).toBeTruthy();
        expect(container.querySelector('.font-mono')).toBeTruthy();
        expect(container.querySelector('.extra')).toBeTruthy();

        const encabezados = screen.getAllByRole('columnheader');

        expect(encabezados).toHaveLength(5);
    });

    it('empieza vacío con el mensaje por defecto', () => {
        render(<DataTable data={[]} columns={columnas} keyField="id" />);

        expect(
            screen.getAllByText('No se encontraron registros.'),
        ).toHaveLength(2);
    });

    it('usa un mensaje vacío personalizado', () => {
        render(
            <DataTable
                data={[]}
                columns={columnas}
                keyField="id"
                emptyMessage="Sin materiales"
            />,
        );

        expect(screen.getAllByText('Sin materiales')).toHaveLength(2);
    });

    it('omite los valores nulos del accesorio', () => {
        const { container } = render(
            <DataTable data={filas} columns={columnas} keyField="id" />,
        );

        expect(screen.getAllByText('1250.5')[0]).toBeTruthy();
        expect(container.textContent).not.toContain('null');
    });
});
