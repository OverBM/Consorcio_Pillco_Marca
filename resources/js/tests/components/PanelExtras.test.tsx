import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SaludAlmacen } from '../../design-system/SaludAlmacen';
import { TendenciasChart } from '../../design-system/TendenciasChart';
import {
    AccesosRapidos,
    TilesCognitivos,
} from '../../design-system/PanelExtras';

const SERIE = Array.from({ length: 30 }, (_, indice) => ({
    fecha: `2026-10-${String(indice + 1).padStart(2, '0')}`,
    ingreso: indice * 2,
    salida: indice,
}));

describe('design-system/TendenciasChart', () => {
    it('renderiza el gráfico y cambia de serie', () => {
        render(<TendenciasChart serie={SERIE} />);

        expect(
            screen.getByRole('img', { name: /Tendencia de ingresos/ }),
        ).toBeTruthy();

        expect(screen.getAllByText('Salidas')).toHaveLength(2);

        fireEvent.click(screen.getByRole('tab', { name: 'Ingresos' }));

        expect(
            screen
                .getByRole('tab', { name: 'Ingresos' })
                .getAttribute('aria-selected'),
        ).toBe('true');
        expect(screen.getAllByText('Salidas')).toHaveLength(1);
    });

    it('muestra estado vacío sin movimientos', () => {
        render(<TendenciasChart serie={[]} />);

        expect(
            screen.getByText('Sin movimientos en los últimos 30 días'),
        ).toBeTruthy();
    });
});

describe('design-system/SaludAlmacen', () => {
    it('lista almacenes con su proporción de críticos', () => {
        render(
            <SaludAlmacen
                almacenes={[
                    {
                        almacenId: 1,
                        nombre: 'Almacén Central',
                        criticos: 3,
                        total: 10,
                        pctCritico: 30,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Almacén Central')).toBeTruthy();
        expect(screen.getByText('3/10')).toBeTruthy();
    });

    it('muestra estado vacío sin almacenes', () => {
        render(<SaludAlmacen almacenes={[]} />);

        expect(
            screen.getByText('Sin almacenes con stock registrado'),
        ).toBeTruthy();
    });
});

describe('design-system/PanelExtras', () => {
    it('reserva los tiles cognitivos en sin datos', () => {
        render(<TilesCognitivos />);

        expect(screen.getByText('Cobertura de stock')).toBeTruthy();
        expect(screen.getByText('Quiebres proyectados')).toBeTruthy();
        expect(screen.getByText('SKUs bajo ROP')).toBeTruthy();
        expect(screen.getByText('EOQ sugerido')).toBeTruthy();
        expect(screen.getAllByText('sin datos')).toHaveLength(4);
    });

    it('renderiza los accesos rápidos como chips', () => {
        render(
            <AccesosRapidos
                accesos={[
                    { href: '/stock', label: 'Matriz de Stock' },
                    { href: '/compras', label: 'Compras' },
                ]}
            />,
        );

        expect(
            screen.getByRole('navigation', { name: 'Accesos rápidos' }),
        ).toBeTruthy();
        expect(screen.getByText('Matriz de Stock')).toBeTruthy();
        expect(screen.getByText('Compras')).toBeTruthy();
    });
});
