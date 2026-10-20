import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ResiduosPage from '../../pages/ResiduosPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const residuos = [
    {
        id: 1,
        clase: 'reutilizable',
        descripcion: 'Retazos de madera',
        volumen: 12.5,
        unidad: 'M3',
        destino: 'reutilizacion',
        estado: 'dispuesto',
        obra: { id: 1, nombre: 'Vía Huancayo' },
        almacen: { id: 1, nombre: 'Almacén Central' },
        material: { id: 1, nombre: 'Cemento Portland' },
        eors: { id: 1, razon_social: 'EcoAndes SAC' },
    },
    {
        id: 2,
        clase: 'peligroso',
        descripcion: 'Envases de solvente',
        volumen: '3',
        unidad: 'KG',
        destino: null,
        estado: 'en_acopio',
        obra: null,
        almacen: null,
        material: null,
        eors: null,
    },
];

const eors = [{ id: 1, razon_social: 'EcoAndes SAC' }];

describe('ResiduosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista los residuos con clasificación, destino y EO-RS', () => {
        renderPagina(ResiduosPage, { residuosDb: residuos, eorsDb: eors });

        expect(
            screen.getAllByText('Gestión Integral de Residuos y Desmonte')[0],
        ).toBeTruthy();
        expect(screen.getByText('Residuos y Excedentes (2)')).toBeTruthy();
        expect(screen.getAllByText('Retazos de madera')[0]).toBeTruthy();
        expect(screen.getAllByText('REUTILIZABLE')[0]).toBeTruthy();
        expect(screen.getAllByText('PELIGROSO')[0]).toBeTruthy();
        expect(screen.getAllByText('DISPUESTO')[0]).toBeTruthy();
        expect(screen.getAllByText('EcoAndes SAC')[0]).toBeTruthy();
        expect(screen.getAllByText('Uso interno').length).toBeGreaterThan(0);
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('muestra el estado vacío sin residuos', () => {
        renderPagina(ResiduosPage, { residuosDb: [], eorsDb: eors });

        expect(screen.getByText('Sin residuos registrados')).toBeTruthy();
        expect(screen.getByText('Residuos y Excedentes (0)')).toBeTruthy();
    });

    it('valida la descripción y el volumen', () => {
        renderPagina(ResiduosPage, { residuosDb: residuos, eorsDb: eors });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Residuo/ }),
        );
        expect(
            screen.getByText('Describe el residuo o material.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: 'Desmonte' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Residuo/ }),
        );
        expect(
            screen.getByText('El volumen debe ser mayor a cero.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra un residuo con material y EO-RS', () => {
        renderPagina(ResiduosPage, { residuosDb: residuos, eorsDb: eors });

        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: '  Desmonte limpio  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Material Asociado/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Volumen/), {
            target: { value: '8.25' },
        });
        fireEvent.change(screen.getByLabelText(/^Unidad/), {
            target: { value: 'TN' },
        });
        fireEvent.change(screen.getByLabelText(/^Destino/), {
            target: { value: 'reciclaje' },
        });
        fireEvent.change(screen.getByLabelText(/^Empresa EO-RS/), {
            target: { value: '1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Residuo/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/ambiente/residuos',
                datos: {
                    obra_id: 1,
                    almacen_id: 1,
                    clase: 'reutilizable',
                    descripcion: 'Desmonte limpio',
                    material_id: 1,
                    volumen: 8.25,
                    unidad: 'TN',
                    destino: 'reciclaje',
                    eors_id: 1,
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({ only: ['residuosDb'] });
    });

    it('registra un residuo sin material ni EO-RS', () => {
        renderPagina(ResiduosPage, { residuosDb: residuos, eorsDb: eors });

        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: 'Envases vacíos' },
        });
        fireEvent.change(screen.getByLabelText(/^Clasificación/), {
            target: { value: 'peligroso' },
        });
        fireEvent.change(screen.getByLabelText(/^Volumen/), {
            target: { value: '2' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Residuo/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/ambiente/residuos',
                datos: expect.objectContaining({
                    clase: 'peligroso',
                    material_id: null,
                    eors_id: null,
                }),
            }),
        );
    });
});
