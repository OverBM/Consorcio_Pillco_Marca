import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type Column } from '../../components/DataTable';

interface Fila {
    id: string;
    nombre: string;
    cantidad: number | null;
    estado: string;
}

const filas: Fila[] = [
    { id: 'a', nombre: 'Cemento', cantidad: 12, estado: 'ok' },
    { id: 'b', nombre: 'Acero', cantidad: null, estado: 'bajo' },
];

const columnas: Column<Fila>[] = [
    { key: 'nombre', header: 'Material' },
    {
        key: 'cantidad',
        header: 'Cantidad',
        align: 'right',
        mono: true,
        cell: (fila) => fila.cantidad ?? '—',
    },
    { key: 'estado', header: 'Estado', hideOnCard: true },
    { key: 'centro', header: 'Centro', align: 'center' },
];

describe('components/DataTable', () => {
    it('renderiza filas, columnas y alineaciones', () => {
        const { container } = render(
            <DataTable columns={columnas} rows={filas} />,
        );

        expect(screen.getAllByText('Cemento')[0]).toBeTruthy();
        expect(screen.getAllByText('12')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
        expect(screen.getAllByRole('columnheader')).toHaveLength(4);
        expect(container.querySelector('.num')).toBeTruthy();
    });

    it('muestra el mensaje vacío por defecto y personalizado', () => {
        const { rerender } = render(<DataTable columns={columnas} rows={[]} />);

        expect(screen.getByText('Sin registros.')).toBeTruthy();

        rerender(
            <DataTable columns={columnas} rows={[]} emptyLabel="Nada aquí" />,
        );

        expect(screen.getByText('Nada aquí')).toBeTruthy();
    });

    it('invoca onRowClick desde la tabla y desde las tarjetas', () => {
        const alClic = vi.fn();
        const { container } = render(
            <DataTable columns={columnas} rows={filas} onRowClick={alClic} />,
        );

        const filaTabla = container.querySelector('tbody tr');
        const filaTarjeta = container.querySelector('li');

        expect(filaTabla).toBeTruthy();
        expect(filaTarjeta).toBeTruthy();

        fireEvent.click(filaTabla as HTMLElement);
        fireEvent.click(filaTarjeta as HTMLElement);

        expect(alClic).toHaveBeenCalledTimes(2);
        expect(alClic).toHaveBeenCalledWith(filas[0]);
    });

    it('muestra los valores sin formato cuando no hay celda', () => {
        render(
            <DataTable
                columns={[{ key: 'nombre', header: 'Nombre' }]}
                rows={[
                    { id: 'x', nombre: 'Grava', cantidad: null, estado: '' },
                ]}
            />,
        );

        expect(screen.getAllByText('Grava')[0]).toBeTruthy();
    });
});
