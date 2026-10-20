import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BarChart7d, ChartLegend } from '../../components/charts';

const datos = [
    { etiqueta: 'Lun', ingreso: 10, salida: 4 },
    { etiqueta: 'Mar', ingreso: 0, salida: 12 },
];

describe('components/charts', () => {
    it('dibuja las barras sin interacción cuando no hay callback', () => {
        const { container } = render(<BarChart7d data={datos} />);

        expect(screen.getByText('Lun')).toBeTruthy();
        expect(screen.getByText('Mar')).toBeTruthy();
        expect(container.querySelectorAll('button')).toHaveLength(0);
    });

    it('invoca onBarClick con la etiqueta de la barra', () => {
        const alClic = vi.fn();

        render(<BarChart7d data={datos} onBarClick={alClic} />);

        const barras = screen.getAllByRole('button');

        expect(barras).toHaveLength(2);

        fireEvent.click(barras[1]);

        expect(alClic).toHaveBeenCalledWith('Mar');
    });

    it('renderiza la leyenda con todos los ítems', () => {
        const { container } = render(
            <ChartLegend
                items={[
                    { label: 'Ingresos', className: 'bg-brand-500' },
                    { label: 'Salidas', className: 'bg-ok-soft' },
                ]}
            />,
        );

        expect(screen.getByText('Ingresos')).toBeTruthy();
        expect(screen.getByText('Salidas')).toBeTruthy();
        expect(container.querySelectorAll('span')).toHaveLength(4);
    });
});
