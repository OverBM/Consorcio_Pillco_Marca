import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KpiTile } from '../../design-system/KpiTile';
import { PanelAside } from '../../design-system/PanelAside';
import { PanelHero } from '../../design-system/PanelHero';

describe('design-system/PanelHero', () => {
    it('resume el estado operativo del día', () => {
        render(
            <PanelHero
                obrasActivas={3}
                almacenes={12}
                despachosEnRuta={2}
                requerimientosUrgentes={4}
            />,
        );

        expect(screen.getByText(/3/)).toBeTruthy();
        expect(screen.getByText(/obras activas/)).toBeTruthy();
        expect(screen.getByText(/12/)).toBeTruthy();
        expect(screen.getByText(/requerimientos urgentes/)).toBeTruthy();
        expect(screen.getByText('Abrir mapa')).toBeTruthy();
        expect(screen.getByText('Ver requerimientos')).toBeTruthy();
    });

    it('muestra el estado vacío cuando no hay eventos', () => {
        render(
            <PanelHero
                obrasActivas={0}
                almacenes={0}
                despachosEnRuta={0}
                requerimientosUrgentes={0}
                eventos={[]}
            />,
        );

        expect(
            screen.getByText(/Sin datos de analítica todavía/),
        ).toBeTruthy();
        expect(
            screen.getByText(/Sin requerimientos urgentes/),
        ).toBeTruthy();
    });
});

describe('design-system/KpiTile', () => {
    it('formatea moneda y muestra el delta con signo', async () => {
        render(
            <KpiTile
                label="Valor de inventario"
                value={1250000}
                formato="moneda"
                delta={-3.4}
            />,
        );

        expect(await screen.findByText(/1,250,000/)).toBeTruthy();
        expect(screen.getByText(/-3.4%/)).toBeTruthy();
    });

    it('muestra sin datos cuando el valor es nulo', () => {
        render(<KpiTile label="Nivel de servicio" value={null} />);

        expect(screen.getByText('sin datos')).toBeTruthy();
    });
});

describe('design-system/PanelAside', () => {
    it('lista críticos, rutas y actividad', () => {
        render(
            <PanelAside
                criticos={[
                    {
                        material: 'Cemento Portland',
                        almacen: 'Almacén Central',
                        disponible: 4,
                        minimo: 10,
                    },
                ]}
                rutas={[
                    {
                        codigo: 'TR-001',
                        origen: 'Almacén Central',
                        destino: 'Obra Norte',
                    },
                ]}
                eventos={[
                    {
                        hora: '09:30',
                        tipo: 'despacho',
                        etiqueta: 'Despacho TR-001',
                    },
                ]}
            />,
        );

        expect(screen.getByText('Cemento Portland')).toBeTruthy();
        expect(screen.getByText('TR-001')).toBeTruthy();
        expect(screen.getByText('09:30')).toBeTruthy();
    });

    it('muestra estados vacíos por bloque', () => {
        render(<PanelAside criticos={[]} rutas={[]} eventos={[]} />);

        expect(screen.getByText('Ningún material bajo mínimo')).toBeTruthy();
        expect(screen.getByText('Sin transferencias en tránsito')).toBeTruthy();
        expect(screen.getByText('Sin movimientos registrados')).toBeTruthy();
    });
});
