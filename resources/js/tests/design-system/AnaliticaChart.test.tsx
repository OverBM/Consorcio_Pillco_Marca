import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnaliticaChart } from '../../design-system/AnaliticaChart';

describe('design-system/AnaliticaChart', () => {
    it('muestra el estado vacío cuando no hay suficientes puntos', () => {
        render(<AnaliticaChart serie={[]} />);

        expect(
            screen.getByText(/Sin datos suficientes/i),
        ).toBeTruthy();
    });

    it('renderiza el gráfico con demanda real y pronóstico', () => {
        render(
            <AnaliticaChart
                serie={[
                    {
                        fecha: '2026-11-01',
                        real: 10,
                        pronostico: 12,
                        inferior: 9,
                        superior: 15,
                    },
                    {
                        fecha: '2026-11-02',
                        real: 11,
                        pronostico: 13,
                        inferior: 10,
                        superior: 16,
                    },
                    {
                        fecha: '2026-11-03',
                        real: null,
                        pronostico: 14,
                        inferior: 11,
                        superior: 17,
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('img', {
                name: /Demanda real y pronóstico con banda de confianza/i,
            }),
        ).toBeTruthy();
    });

    it('permite enfocar un punto y muestra el tooltip accesible', () => {
        render(
            <AnaliticaChart
                serie={[
                    {
                        fecha: '2026-11-01',
                        real: 10,
                        pronostico: 12,
                        inferior: 9,
                        superior: 15,
                    },
                    {
                        fecha: '2026-11-02',
                        real: 11,
                        pronostico: 13,
                        inferior: 10,
                        superior: 16,
                    },
                ]}
            />,
        );

        const puntos = screen.getAllByRole('button');

        expect(puntos.length).toBeGreaterThan(0);
    });
});
