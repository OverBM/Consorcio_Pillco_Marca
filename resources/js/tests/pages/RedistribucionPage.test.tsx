import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import RedistribucionPage from '../../pages/RedistribucionPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, respuestaHttp, setPageProps } from '../mocks/inertia';

const excedentes = [
    {
        id: 1,
        obra_origen_id: 1,
        almacen_id: 1,
        material_id: 1,
        cantidad: 120,
        origen: 'cierre_obra',
        estado: 'detectado',
        detectado_en: '2026-01-12',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        almacen: { id: 1, nombre: 'Almacén Central' },
        material: {
            id: 1,
            nombre: 'Cemento Portland',
            unidad_medida: { codigo: 'bol' },
        },
    },
    {
        id: 2,
        obra_origen_id: 2,
        almacen_id: 2,
        material_id: 9,
        cantidad: '45.5',
        origen: 'liquidacion',
        estado: 'sugerido',
        detectado_en: null,
        obra: null,
        almacen: null,
        material: null,
    },
    {
        id: 3,
        obra_origen_id: 1,
        almacen_id: 2,
        material_id: 2,
        cantidad: 30,
        origen: 'devolucion',
        estado: 'redistribuido',
        detectado_en: '2026-01-08',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        almacen: { id: 2, nombre: 'Almacén Frente 2' },
        material: {
            id: 2,
            nombre: 'Acero corrugado 1/2"',
            unidad_medida: { codigo: 'kg' },
        },
    },
    {
        id: 4,
        obra_origen_id: 1,
        almacen_id: 1,
        material_id: 3,
        cantidad: 10,
        origen: 'manual',
        estado: 'descartado',
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
        almacen: { id: 1, nombre: 'Almacén Central' },
        material: { id: 3, nombre: 'Arena gruesa', unidad_medida: null },
    },
];

const transferenciasAhp = [
    {
        almacenOrigenId: 'alm-central',
        almacenOrigenNombre: 'Almacén Central',
        obraOrigenNombre: 'Frente El Tambo',
        materialId: 'mat-1',
        materialNombre: 'Cemento Portland',
        stockDisponible: 500,
        cantidadSugerida: 320,
        unidad: 'bol',
        distanciaKm: 12.4,
        tiempoEstimadoMin: 35,
        puntajeAhp: 0.9,
        ahorroEstimadoSoles: 1520.5,
        prioridad: 'alta' as const,
    },
    {
        almacenOrigenId: 'alm-frente',
        almacenOrigenNombre: 'Almacén Frente 2',
        obraOrigenNombre: 'Mejoramiento Vía Huancayo',
        materialId: 'mat-2',
        materialNombre: 'Acero corrugado 1/2"',
        stockDisponible: 120,
        cantidadSugerida: 60,
        unidad: 'kg',
        distanciaKm: 5.1,
        tiempoEstimadoMin: 15,
        puntajeAhp: 0.65,
        ahorroEstimadoSoles: 480,
        prioridad: 'media' as const,
    },
    {
        almacenOrigenId: 'alm-central',
        almacenOrigenNombre: 'Almacén Central',
        obraOrigenNombre: 'Mejoramiento Vía Huancayo',
        materialId: 'mat-3',
        materialNombre: 'Arena gruesa',
        stockDisponible: 20,
        cantidadSugerida: 15,
        unidad: 'm3',
        distanciaKm: 1.2,
        tiempoEstimadoMin: 5,
        puntajeAhp: 0.25,
        ahorroEstimadoSoles: 90,
        prioridad: 'baja' as const,
    },
];

const parametros = [
    {
        id: 1,
        clave: 'ahp.peso.distancia',
        valor: '0.4',
        descripcion: 'Peso del criterio geográfico',
    },
    { id: 2, clave: 'ahp.radio.km', valor: '35', descripcion: null },
];

const obras = [
    { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    { id: 2, nombre: 'Ampliación IE Los Andes' },
];

const almacenes = [
    {
        id: 1,
        nombre: 'Almacén Central',
        obra_id: 1,
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    },
    { id: 2, nombre: 'Almacén Frente 2', obra_id: 1, obra: null },
];

const materiales = [
    {
        id: 1,
        nombre: 'Cemento Portland',
        unidad_medida: { codigo: 'bol' },
    },
    { id: 2, nombre: 'Acero corrugado 1/2"', unidad_medida: null },
];

function propsRedistribucion() {
    return {
        excedentesDb: excedentes,
        transferenciasAhpDb: transferenciasAhp,
        parametrosDb: parametros,
        obrasDb: obras,
        almacenesDb: almacenes,
        materialesDb: materiales,
    };
}

describe('RedistribucionPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista excedentes, sugerencias AHP y parámetros', () => {
        renderPagina(RedistribucionPage, propsRedistribucion());

        expect(
            screen.getAllByText(
                'Redistribución de Excedentes Inter-Obras (AHP & GIS)',
            )[0],
        ).toBeTruthy();
        expect(screen.getAllByText('4 lotes')[0]).toBeTruthy();
        expect(screen.getAllByText(/205.5/)[0]).toBeTruthy();
        expect(screen.getAllByText('Cemento Portland')[0]).toBeTruthy();
        expect(screen.getAllByText(/1,520/)[0]).toBeTruthy();
        expect(screen.getAllByText('Material #9')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén #2')[0]).toBeTruthy();
        expect(screen.getAllByText('Obra #2')[0]).toBeTruthy();
        expect(screen.getAllByText('Arena gruesa')[0]).toBeTruthy();
        expect(screen.getAllByText('ahp.peso.distancia')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Peso del criterio geográfico')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('alta')[0]).toBeTruthy();
    });

    it('muestra estados vacíos cuando no hay registros', () => {
        renderPagina(RedistribucionPage, {
            excedentesDb: [],
            transferenciasAhpDb: [],
            parametrosDb: [],
            obrasDb: [],
            almacenesDb: [],
            materialesDb: [],
        });

        expect(
            screen.getAllByText('Sin transferencias sugeridas')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Sin excedentes registrados')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Sin parámetros configurados')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('0 lotes')[0]).toBeTruthy();
    });

    it('valida y registra un nuevo excedente', () => {
        renderPagina(RedistribucionPage, propsRedistribucion());

        fireEvent.click(screen.getAllByText('Nuevo excedente')[0]);
        expect(
            screen.getAllByText('Nuevo Excedente Detectado')[0],
        ).toBeTruthy();

        const formulario = screen
            .getByText('Registrar Excedente')
            .closest('form');
        expect(formulario).toBeTruthy();

        if (formulario) {
            fireEvent.submit(formulario);
        }
        expect(
            screen.getAllByText(
                /Selecciona obra, almacén, material e ingresa una cantidad/,
            )[0],
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);

        fireEvent.change(screen.getByLabelText('Almacén', { exact: false }), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Material', { exact: false }), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText('Cantidad', { exact: false }), {
            target: { value: '15' },
        });
        fireEvent.change(
            screen.getByLabelText('Procedencia', { exact: false }),
            { target: { value: 'inventario' } },
        );
        fireEvent.change(screen.getByLabelText('Estado', { exact: false }), {
            target: { value: 'detectado' },
        });

        fireEvent.click(screen.getAllByText('Registrar Excedente')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/excedentes',
                datos: expect.objectContaining({
                    cantidad: 15,
                    almacen_id: 1,
                    material_id: 1,
                    origen: 'inventario',
                }),
            }),
        );
    });

    it('edita un excedente existente', () => {
        renderPagina(RedistribucionPage, propsRedistribucion());

        fireEvent.click(screen.getAllByText('Editar')[0]);
        expect(
            screen.getAllByText('Modificar Excedente Detectado')[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Cantidad', { exact: false }), {
            target: { value: '99' },
        });
        fireEvent.click(screen.getAllByText('Guardar Cambios')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'put',
                url: '/api/v1/excedentes/1',
                datos: expect.objectContaining({ cantidad: 99 }),
            }),
        );
    });

    it('elimina un excedente con confirmación', () => {
        renderPagina(RedistribucionPage, propsRedistribucion());

        fireEvent.click(screen.getAllByText('Eliminar')[0]);
        expect(screen.getAllByText('Eliminar Excedente')[0]).toBeTruthy();

        const confirmar = screen.getAllByText('Eliminar').pop();
        expect(confirmar).toBeTruthy();

        if (confirmar) {
            fireEvent.click(confirmar);
        }

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'delete',
                url: '/api/v1/excedentes/1',
            }),
        );
    });

    it('redistribuye un excedente aplicando una sugerencia AHP', () => {
        respuestaHttp.data = {
            sugerencias: [
                {
                    almacenDestinoId: 2,
                    almacenDestinoNombre: 'Almacén Frente 2',
                    obraDestinoNombre: 'Mejoramiento Vía Huancayo',
                    cantidadSugerida: 50,
                    unidad: 'bol',
                    distanciaKm: 8.6,
                    puntajeAhp: 0.8,
                },
            ],
        };

        renderPagina(RedistribucionPage, propsRedistribucion());

        fireEvent.click(screen.getAllByText('Redistribuir')[0]);
        expect(screen.getAllByText('Redistribuir Excedente')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Receptores sugeridos (AHP)')[0],
        ).toBeTruthy();

        fireEvent.click(screen.getAllByText(/8.6 km/)[0]);
        fireEvent.click(screen.getAllByText('Generar Transferencia')[0]);

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/excedentes/1/transferencia',
                datos: expect.objectContaining({
                    almacen_destino_id: 2,
                    cantidad: 50,
                }),
            }),
        );
    });

    it('valida el destino antes de generar la transferencia', () => {
        renderPagina(RedistribucionPage, propsRedistribucion());

        fireEvent.click(screen.getAllByText('Redistribuir')[0]);
        fireEvent.change(
            screen.getByLabelText('Cantidad a Transferir', { exact: false }),
            { target: { value: '' } },
        );
        fireEvent.click(screen.getAllByText('Generar Transferencia')[0]);

        expect(
            screen.getAllByText(
                /Selecciona el almacén destino e ingresa una cantidad válida/,
            )[0],
        ).toBeTruthy();
        expect(
            llamadasHttp.filter((llamada) =>
                llamada.url.endsWith('/transferencia'),
            ),
        ).toHaveLength(0);
    });
});
