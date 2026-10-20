import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import FasesAdminPage from '../../pages/FasesAdminPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const requisitos = [
    {
        id: 1,
        fase: 'inicio',
        codigo: 'REQ-01',
        nombre: 'Acta de constitución',
        descripcion: 'Documento firmado',
        orden: 1,
        activo: true,
    },
    {
        id: 2,
        fase: 'inicio',
        codigo: 'REQ-02',
        nombre: 'Presupuesto base',
        descripcion: null,
        orden: 2,
        activo: false,
    },
    {
        id: 3,
        fase: 'planificacion',
        codigo: 'REQ-03',
        nombre: 'Plan de obra',
        orden: 1,
        activo: true,
    },
];

const criterios = [
    {
        id: 1,
        fase: 'inicio',
        codigo: 'CRI-01',
        nombre: 'Avance inicial',
        tipo: 'metrica',
        parametros: { metrica: 'avance_fisico_pct' },
        umbral: '100',
        obligatorio: true,
        orden: 1,
        activo: true,
    },
    {
        id: 2,
        fase: 'inicio',
        codigo: 'CRI-02',
        nombre: 'Informe firmado',
        tipo: 'documento',
        parametros: null,
        umbral: null,
        obligatorio: false,
        orden: 2,
        activo: false,
    },
];

function props(datos: Record<string, unknown> = {}) {
    return {
        requisitosDb: requisitos,
        criteriosDb: criterios,
        tiposCriterioDb: ['metrica', 'documento', 'aprobacion'],
        ...datos,
    };
}

describe('FasesAdminPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra requisitos y criterios de la fase activa', () => {
        renderPagina(FasesAdminPage, props());

        expect(
            screen.getAllByText('Requisitos y Criterios por Fase')[0],
        ).toBeTruthy();
        expect(screen.getByText('Requisitos de Inicio')).toBeTruthy();
        expect(
            screen.getByText('Criterios de aprobación de Inicio'),
        ).toBeTruthy();
        expect(screen.getAllByText('REQ-01')[0]).toBeTruthy();
        expect(screen.getAllByText('Acta de constitución')[0]).toBeTruthy();
        expect(screen.getAllByText('Documento firmado')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        expect(screen.getAllByText('CRI-01')[0]).toBeTruthy();
        expect(screen.getAllByText('metrica')[0]).toBeTruthy();
        expect(screen.getAllByText('100')[0]).toBeTruthy();
        expect(screen.getAllByText('Sí')[0]).toBeTruthy();
        expect(screen.getAllByText('No')[0]).toBeTruthy();
        expect(screen.getAllByText('Inactivo')[0]).toBeTruthy();
    });

    it('cambia de fase y muestra los vacíos', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: '02 · Planificación' }),
        );
        expect(screen.getByText('Requisitos de Planificación')).toBeTruthy();
        expect(screen.getAllByText('REQ-03')[0]).toBeTruthy();
        expect(screen.queryAllByText('REQ-01')).toHaveLength(0);
        expect(screen.getByText('Sin criterios')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: '03 · Ejecución' }));
        expect(screen.getByText('Sin requisitos')).toBeTruthy();
        expect(screen.getByText('Sin criterios')).toBeTruthy();
    });

    it('valida el código y nombre del requisito', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Nuevo requisito/ }),
        );
        expect(
            screen.getByText('Nuevo requisito', { selector: 'h3' }),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: '   ' },
        });
        fireEvent.change(screen.getByLabelText(/^Nombre/), {
            target: { value: '   ' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(
            screen.getByText('Completa el código y el nombre del requisito.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('crea un requisito con descripción opcional en null', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Nuevo requisito/ }),
        );
        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: '  REQ-09  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Nombre/), {
            target: { value: '  Nuevo documento  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Orden/), {
            target: { value: '4' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/admin/fases/requisitos',
                datos: {
                    fase: 'inicio',
                    codigo: 'REQ-09',
                    nombre: 'Nuevo documento',
                    descripcion: null,
                    orden: 4,
                    activo: true,
                },
            }),
        );
        expect(screen.getByText('Requisito creado.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['requisitosDb', 'criteriosDb'],
        });
        expect(
            screen.queryByText('Nuevo requisito', { selector: 'h3' }),
        ).toBeNull();
    });

    it('edita un requisito existente', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        expect(screen.getByText('Editar requisito')).toBeTruthy();
        expect(
            (screen.getByLabelText(/^Descripción/) as HTMLTextAreaElement)
                .value,
        ).toBe('Documento firmado');

        fireEvent.change(screen.getByLabelText(/^Nombre/), {
            target: { value: 'Acta actualizada' },
        });
        fireEvent.change(screen.getByLabelText(/^Activo/), {
            target: { value: '0' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'put',
                url: '/api/v1/admin/fases/requisitos/1',
                datos: expect.objectContaining({
                    nombre: 'Acta actualizada',
                    activo: false,
                }),
            }),
        );
        expect(screen.getByText('Requisito actualizado.')).toBeTruthy();
    });

    it('elimina un requisito tras confirmar', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        expect(screen.getByText('Eliminar registro')).toBeTruthy();

        fireEvent.click(
            screen
                .getAllByRole('button', { name: 'Eliminar' })
                .at(-1) as HTMLElement,
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'delete',
                url: '/api/v1/admin/fases/requisitos/1',
            }),
        );
        expect(screen.getByText('Registro eliminado.')).toBeTruthy();
        expect(screen.queryByText('Eliminar registro')).toBeNull();
    });

    it('valida el JSON y los campos del criterio', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(screen.getByRole('button', { name: /Nuevo criterio/ }));
        expect(
            screen.getByText('Nuevo criterio', { selector: 'h3' }),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: 'CRI-09' },
        });
        fireEvent.change(screen.getByLabelText(/^Nombre/), {
            target: { value: 'Criterio nuevo' },
        });
        fireEvent.change(screen.getByLabelText(/^Parámetros/), {
            target: { value: '{invalido' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
        expect(
            screen.getByText('Los parámetros deben ser un JSON válido.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Parámetros/), {
            target: { value: '{}' },
        });
        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: '   ' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
        expect(
            screen.getByText('Completa el código, nombre y tipo del criterio.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('crea un criterio con parámetros, umbral y obligatoriedad', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(screen.getByRole('button', { name: /Nuevo criterio/ }));
        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: '  CRI-09  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Nombre/), {
            target: { value: '  Validación final  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Tipo de verificación/), {
            target: { value: 'documento' },
        });
        fireEvent.change(screen.getByLabelText(/^Parámetros/), {
            target: { value: '{"tipo_documento":"informe"}' },
        });
        fireEvent.change(screen.getByLabelText(/^Umbral/), {
            target: { value: '95' },
        });
        fireEvent.change(screen.getByLabelText(/^Obligatorio/), {
            target: { value: '0' },
        });
        fireEvent.change(screen.getByLabelText(/^Orden/), {
            target: { value: '5' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/admin/fases/criterios',
                datos: {
                    fase: 'inicio',
                    codigo: 'CRI-09',
                    nombre: 'Validación final',
                    tipo: 'documento',
                    parametros: { tipo_documento: 'informe' },
                    umbral: 95,
                    obligatorio: false,
                    orden: 5,
                    activo: true,
                },
            }),
        );
        expect(screen.getByText('Criterio creado.')).toBeTruthy();
    });

    it('edita un criterio y permite dejar el umbral vacío', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[4]);
        expect(screen.getByText('Editar criterio')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Umbral/), {
            target: { value: '' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'put',
                url: '/api/v1/admin/fases/criterios/1',
                datos: expect.objectContaining({
                    umbral: null,
                    parametros: { metrica: 'avance_fisico_pct' },
                }),
            }),
        );
        expect(screen.getByText('Criterio actualizado.')).toBeTruthy();
    });

    it('elimina un criterio y cierra el modal con Cancelar', () => {
        renderPagina(FasesAdminPage, props());

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[4]);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.queryByText('Eliminar registro')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[4]);
        fireEvent.click(
            screen
                .getAllByRole('button', { name: 'Eliminar' })
                .at(-1) as HTMLElement,
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'delete',
                url: '/api/v1/admin/fases/criterios/1',
            }),
        );
    });
});
