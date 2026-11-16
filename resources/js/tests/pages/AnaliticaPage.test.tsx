import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AnaliticaPage from '../../pages/AnaliticaPage';
import { renderPagina } from '../harness';

const props = {
    resumen: {
        parametros_vigentes: 2,
        alertas_vigentes: 2,
        alertas_criticas: 1,
        quiebres_7d: 1,
        eoq_promedio_a: 95.5,
        demanda_media_total: 18.4,
        ultima_ejecucion: {
            id: 1,
            origen: 'scheduler',
            estado: 'completada',
            inicio: '2026-11-02T10:00:00Z',
            fin: '2026-11-02T10:00:02Z',
            duracion_ms: 1800,
            series: 2,
            calculadas: 2,
            alertas: 1,
            errores: 0,
            mensaje: null,
        },
    },
    parametrosDb: [
        {
            id: 1,
            almacen_id: 1,
            material_id: 1,
            eoq: 100,
            stock_seguridad: 10,
            punto_reorden: 20,
            demanda_media_diaria: 8.5,
            clase_abc: 'A',
            clase_xyz: 'X',
            clase_combinada: 'AX',
            estado: 'vigente',
            lead_time_dias: 5,
            modelo_version: 'v1',
            calculado_en: '2026-11-02T10:00:00Z',
            almacen: { nombre: 'Almacén Central' },
            material: { codigo: 'MAT-01', nombre: 'Cemento Portland' },
        },
    ],
    pronosticosDb: [
        {
            id: 1,
            fecha: '2026-11-03',
            cantidad: 10,
            limite_inferior: 8,
            limite_superior: 12,
            mape: 7.5,
            rmse: 1.2,
            metodo_usado: 'holt_winters',
            baja_confianza: false,
            almacen: { nombre: 'Almacén Central' },
            material: { codigo: 'MAT-01', nombre: 'Cemento Portland' },
        },
    ],
    alertasDb: [
        {
            id: 1,
            tipo: 'quiebre',
            severidad: 'critica',
            fecha_estimada: '2026-11-05',
            cantidad_sugerida: 20,
            detalle: 'Stock bajo el mínimo',
            estado: 'vigente',
            almacen: { nombre: 'Almacén Central' },
            material: { codigo: 'MAT-01', nombre: 'Cemento Portland' },
        },
    ],
    ejecucionesDb: [
        {
            id: 1,
            origen: 'scheduler',
            estado: 'completada',
            inicio: '2026-11-02T10:00:00Z',
            fin: '2026-11-02T10:00:02Z',
            duracion_ms: 1800,
            series: 2,
            calculadas: 2,
            alertas: 1,
            errores: 0,
            mensaje: null,
        },
    ],
    cuotaRuteo: {
        fecha: '2026-11-02',
        limite: 1500,
        usadas: 120,
        restantes: 1380,
        porcentaje: 8,
        geocodificaciones: 100,
        fallos: 2,
        actualizado_en: '2026-11-02T10:00:00Z',
    },
    cuotaRuteoSemana: [
        {
            fecha: '2026-11-01',
            llamadas: 10,
            exitos: 9,
            fallos: 1,
            geocodificaciones: 8,
        },
    ],
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
        quiebres_7d: 1,
        alertas: 2,
        demanda_media: 18.4,
    },
};

describe('pages/AnaliticaPage', () => {
    it('renderiza el resumen y permite navegar entre pestañas', () => {
        renderPagina(AnaliticaPage, props);

        expect(screen.getByText('Analítica Predictiva')).toBeTruthy();
        expect(screen.getByText('Cuota de ruteo ORS · hoy')).toBeTruthy();
        expect(screen.getByText('Alertas por severidad')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
        expect(
            screen.getByPlaceholderText('Buscar material o almacén…'),
        ).toBeTruthy();

        fireEvent.change(
            screen.getByPlaceholderText('Buscar material o almacén…'),
            { target: { value: 'cemento' } },
        );
        expect(screen.getAllByText('Cemento Portland').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: 'Pronóstico' }));
        expect(screen.getByText('Demanda y pronóstico')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Alertas' }));
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1);

        fireEvent.click(screen.getByRole('button', { name: 'Ejecuciones' }));
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    });

    it('muestra estados vacíos cuando no hay parámetros', () => {
        renderPagina(AnaliticaPage, {
            ...props,
            parametrosDb: [],
            pronosticosDb: [],
            alertasDb: [],
            ejecucionesDb: [],
        });

        fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
        expect(screen.getByText('Sin parámetros calculados.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Pronóstico' }));
        expect(
            screen.getByText('Sin pronósticos en los próximos días.'),
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Alertas' }));
        expect(screen.getByText('No hay alertas vigentes.')).toBeTruthy();
    });
});
