import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnaliticaResumen } from '../../design-system/AnaliticaResumen';

const propsConDatos = {
    serieAnalitica: {
        serie: [
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
        ],
        cobertura_dias: 18,
        mape: 8.4,
        quiebres_7d: 2,
        alertas: 4,
        demanda_media: 22.5,
    },
    parametrosDb: [
        {
            almacen_id: 1,
            clase_abc: 'A',
            demanda_media_diaria: 10,
            eoq: 100,
            almacen: { nombre: 'Almacén Central' },
        },
        {
            almacen_id: 2,
            clase_abc: 'B',
            demanda_media_diaria: 5,
            eoq: 50,
            almacen: { nombre: 'Almacén de Obra' },
        },
    ],
    alertasDb: [
        { severidad: 'critica', tipo: 'quiebre' },
        { severidad: 'alta', tipo: 'stock' },
        { severidad: 'media', tipo: 'demora' },
        { severidad: 'baja', tipo: 'aviso' },
    ],
    ejecucionesDb: [
        {
            id: 2,
            estado: 'completada',
            inicio: '2026-11-02T10:00:00Z',
            duracion_ms: 1500,
        },
        {
            id: 1,
            estado: 'fallida',
            inicio: '2026-11-01T10:00:00Z',
            duracion_ms: 800,
        },
    ],
    resumen: {
        parametros_vigentes: 2,
        alertas_vigentes: 4,
        alertas_criticas: 1,
        quiebres_7d: 2,
        eoq_promedio_a: 100,
        demanda_media_total: 15,
    },
};

describe('design-system/AnaliticaResumen', () => {
    it('muestra los KPI, distribución de alertas, demanda y ejecuciones', () => {
        render(<AnaliticaResumen {...propsConDatos} />);

        expect(screen.getByText('Demanda media diaria')).toBeTruthy();
        expect(screen.getByText('Alertas por severidad')).toBeTruthy();
        expect(screen.getByText('Demanda por almacén')).toBeTruthy();
        expect(screen.getByText('Clasificación ABC')).toBeTruthy();
        expect(screen.getByText('Ejecuciones del motor')).toBeTruthy();
        expect(screen.getByText('Almacén Central')).toBeTruthy();
        expect(screen.getAllByText(/materiales/).length).toBeGreaterThan(0);
    });

    it('muestra estados vacíos cuando no hay parámetros ni ejecuciones', () => {
        render(
            <AnaliticaResumen
                {...propsConDatos}
                parametrosDb={[]}
                ejecucionesDb={[]}
                alertasDb={[]}
            />,
        );

        expect(screen.getByText('Sin parámetros calculados.')).toBeTruthy();
        expect(screen.getByText('Sin ejecuciones registradas.')).toBeTruthy();
    });
});
