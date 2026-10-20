import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import RiesgosPage from '../../pages/RiesgosPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const riesgos = [
    {
        id: 1,
        obra_id: 1,
        descripcion: 'Deslizamiento en talud norte',
        categoria: 'tecnico',
        probabilidad: 4,
        impacto: 5,
        severidad: 20,
        respuesta: 'Monitoreo topográfico semanal',
        estado: 'mitigado',
        obra: { id: 1, nombre: 'Vía Huancayo' },
    },
    {
        id: 2,
        obra_id: 1,
        descripcion: 'Retraso de proveedor de acero',
        categoria: 'logistico',
        probabilidad: 2,
        impacto: 3,
        severidad: 6,
        respuesta: null,
        estado: 'abierto',
        obra: null,
    },
];

describe('RiesgosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('resume la matriz y lista los riesgos', () => {
        renderPagina(RiesgosPage, { riesgosDb: riesgos });

        expect(
            screen.getAllByText('Matriz de Riesgos y Alertas Tempranas')[0],
        ).toBeTruthy();
        expect(screen.getByText('Matriz de Riesgos (2)')).toBeTruthy();
        expect(screen.getByText('Riesgos Críticos (≥ 15)')).toBeTruthy();
        expect(screen.getByText('Riesgos Mitigados')).toBeTruthy();
        expect(screen.getAllByText('20')[0]).toBeTruthy();
        expect(screen.getAllByText('6')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Deslizamiento en talud norte')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('mitigado')[0]).toBeTruthy();
        expect(screen.getAllByText('abierto')[0]).toBeTruthy();
        expect(screen.getAllByText('logistico')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin riesgos', () => {
        renderPagina(RiesgosPage, { riesgosDb: [] });

        expect(screen.getByText('Sin riesgos registrados')).toBeTruthy();
        expect(screen.getByText('Matriz de Riesgos (0)')).toBeTruthy();
    });

    it('valida obra y descripción al registrar', () => {
        renderPagina(RiesgosPage, { riesgosDb: riesgos });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Riesgo/ }),
        );

        expect(
            screen.getByText('Selecciona la obra y describe el riesgo.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra un riesgo con los tipos numéricos correctos', () => {
        renderPagina(RiesgosPage, { riesgosDb: riesgos });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: 'Falta de certificados' },
        });
        fireEvent.change(screen.getByLabelText(/^Categoría/), {
            target: { value: 'legal' },
        });
        fireEvent.change(screen.getByLabelText(/^Probabilidad/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Impacto/), {
            target: { value: '4' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Riesgo/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/riesgos',
                datos: {
                    obra_id: 1,
                    descripcion: 'Falta de certificados',
                    categoria: 'legal',
                    probabilidad: 2,
                    impacto: 4,
                    respuesta: null,
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({ only: ['riesgosDb'] });
    });

    it('actualiza estado y plan de respuesta desde el modal', () => {
        renderPagina(RiesgosPage, { riesgosDb: riesgos });

        fireEvent.click(screen.getAllByText('Actualizar')[0]);

        expect(screen.getByText('Actualizar Riesgo')).toBeTruthy();
        expect(
            screen.getAllByText('Deslizamiento en talud norte')[0],
        ).toBeTruthy();
        expect(
            (screen.getByLabelText('Estado') as HTMLSelectElement).value,
        ).toBe('mitigado');
        expect(
            (
                screen.getAllByLabelText(
                    /^Plan de respuesta/,
                )[1] as HTMLTextAreaElement
            ).value,
        ).toBe('Monitoreo topográfico semanal');

        fireEvent.change(screen.getByLabelText('Estado'), {
            target: { value: 'cerrado' },
        });
        fireEvent.change(screen.getAllByLabelText(/^Plan de respuesta/)[1], {
            target: { value: 'Riesgo cerrado tras inspección' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'put',
                url: '/api/v1/riesgos/1',
                datos: {
                    respuesta: 'Riesgo cerrado tras inspección',
                    estado: 'cerrado',
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({ only: ['riesgosDb'] });
    });

    it('cierra el modal sin guardar', () => {
        renderPagina(RiesgosPage, { riesgosDb: riesgos });

        fireEvent.click(screen.getAllByText('Actualizar')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Actualizar Riesgo')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
