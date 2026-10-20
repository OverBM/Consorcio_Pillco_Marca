import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CicloVidaPage from '../../pages/CicloVidaPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const obras = [
    { id: 1, nombre: 'Mejoramiento Vía Huancayo', distrito: 'Huancayo' },
    { id: 2, nombre: 'Ampliación Puente', distrito: null },
];

const fasesDb = [
    {
        id: 1,
        obra_id: 1,
        fase: 'inicio',
        estado: 'aprobada',
        aprobada_en: '2026-01-20T10:00:00.000Z',
    },
    { id: 2, obra_id: 1, fase: 'planificacion', estado: 'en_proceso' },
];

const requisitosDb = [
    {
        id: 1,
        fase: 'inicio',
        codigo: 'REQ-01',
        nombre: 'Acta de constitución',
        activo: true,
    },
    {
        id: 2,
        fase: 'inicio',
        codigo: 'REQ-02',
        nombre: 'Requisito inactivo',
        activo: false,
    },
];

const criteriosDb = [
    {
        id: 1,
        fase: 'inicio',
        codigo: 'CRI-01',
        nombre: 'Firma del acta',
        tipo: 'documento',
        obligatorio: true,
        activo: true,
    },
    {
        id: 2,
        fase: 'inicio',
        codigo: 'CRI-02',
        nombre: 'Criterio inactivo',
        tipo: 'metrica',
        obligatorio: false,
        activo: false,
    },
];

const evaluacionesDb = {
    '1': {
        inicio: [
            {
                criterio_id: 1,
                codigo: 'CRI-01',
                nombre: 'Firma del acta',
                tipo: 'documento',
                obligatorio: true,
                cumple: true,
                detalle: 'Documento verificado',
            },
        ],
    },
};

function props(datos: Record<string, unknown> = {}) {
    return {
        obrasDb: obras,
        fasesDb,
        requisitosDb,
        criteriosDb,
        evaluacionesDb,
        ...datos,
    };
}

describe('CicloVidaPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra las cinco fases con requisitos, criterios y evaluaciones', () => {
        renderPagina(CicloVidaPage, props());

        expect(
            screen.getAllByText('Ciclo de Vida de Obra (PMI / PMU)')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Fase 01')[0]).toBeTruthy();
        expect(screen.getAllByText('Fase 05')[0]).toBeTruthy();
        expect(screen.getAllByText('Cierre de Obra')[0]).toBeTruthy();
        expect(screen.getAllByText('Acta de constitución')[0]).toBeTruthy();
        expect(screen.queryAllByText('Requisito inactivo')).toHaveLength(0);
        expect(screen.getAllByText(/Firma del acta/)[0]).toBeTruthy();
        expect(screen.queryAllByText(/Criterio inactivo/)).toHaveLength(0);
        expect(screen.getAllByText('Documento verificado')[0]).toBeTruthy();
        expect(screen.getAllByText('aprobada')[0]).toBeTruthy();
        expect(screen.getAllByText('en proceso')[0]).toBeTruthy();
        expect(
            screen.getAllByText(/Requiere aprobar Planificación primero/)[0],
        ).toBeTruthy();
        expect(screen.getAllByText(/Aprobada:/)[0]).toBeTruthy();
    });

    it('muestra el vacío sin obras', () => {
        renderPagina(CicloVidaPage, { obrasDb: [] });

        expect(screen.getByText('Sin obras registradas')).toBeTruthy();
    });

    it('inicia una fase pendiente', () => {
        renderPagina(CicloVidaPage, {
            obrasDb: obras,
            fasesDb: [],
            requisitosDb: [],
            criteriosDb: [],
            evaluacionesDb: {},
        });

        fireEvent.click(screen.getAllByRole('button', { name: /Iniciar/ })[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/proyectos/1/fases',
                datos: {
                    fase: 'inicio',
                    estado: 'en_proceso',
                    observaciones: '',
                    justificaciones: {},
                },
            }),
        );
        expect(screen.getByText('Fase del proyecto actualizada.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['fasesDb', 'evaluacionesDb'],
        });
    });

    it('aprueba la fase inicial sin criterios pendientes', () => {
        renderPagina(CicloVidaPage, {
            obrasDb: obras,
            fasesDb: [],
            requisitosDb: [],
            criteriosDb: [],
            evaluacionesDb: {},
        });

        fireEvent.click(screen.getAllByRole('button', { name: /Aprobar/ })[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/proyectos/1/fases',
                datos: {
                    fase: 'inicio',
                    estado: 'aprobada',
                    observaciones: '',
                    justificaciones: {},
                },
            }),
        );
    });

    it('bloquea la aprobación con criterios obligatorios incumplidos', () => {
        renderPagina(CicloVidaPage, {
            obrasDb: obras,
            fasesDb: [],
            requisitosDb: [],
            criteriosDb,
            evaluacionesDb: {
                '1': {
                    inicio: [
                        {
                            criterio_id: 1,
                            codigo: 'CRI-01',
                            nombre: 'Firma del acta',
                            tipo: 'documento',
                            obligatorio: true,
                            cumple: false,
                            detalle: 'Falta firma',
                        },
                    ],
                },
            },
        });

        expect(
            (
                screen.getAllByRole('button', {
                    name: /Aprobar/,
                })[0] as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });

    it('cambia de obra y muestra sus fases pendientes', () => {
        renderPagina(CicloVidaPage, props());

        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: '2' },
        });

        expect(screen.getAllByText('pendiente').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('en proceso')).toHaveLength(0);
    });
});
