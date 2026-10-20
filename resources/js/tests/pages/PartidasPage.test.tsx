import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import PartidasPage from '../../pages/PartidasPage';
import { propsBase, catalogosFixture } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const partidas = [
    {
        id: 1,
        obra_id: 1,
        codigo: '01.01',
        descripcion: 'Trazo y replanteo',
        unidad: 'M2',
        metrado: 100,
        costo_unitario: 5,
        avance_pct: 40,
        obra: { id: 1, nombre: 'Vía Huancayo' },
    },
    {
        id: 2,
        obra_id: 2,
        codigo: '02.01',
        descripcion: 'Excavación masiva',
        unidad: 'M3',
        metrado: 10,
        costo_unitario: 20,
        avance_pct: 0,
        obra: null,
    },
];

describe('PartidasPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las partidas con avance y obra', () => {
        renderPagina(PartidasPage, { partidasDb: partidas });

        expect(screen.getByText('Partidas (2)')).toBeTruthy();
        expect(screen.getAllByText('Trazo y replanteo')[0]).toBeTruthy();
        expect(screen.getAllByText('Vía Huancayo')[0]).toBeTruthy();
        expect(screen.getAllByText('40%')[0]).toBeTruthy();
        expect(screen.getAllByText('Excavación masiva')[0]).toBeTruthy();
        expect(screen.getAllByText('#2')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin partidas', () => {
        renderPagina(PartidasPage, { partidasDb: [] });

        expect(screen.getByText('Sin partidas registradas')).toBeTruthy();
        expect(screen.getByText('Partidas (0)')).toBeTruthy();
    });

    it('filtra las partidas por obra', () => {
        setPageProps({
            ...propsBase(),
            catalogos: {
                ...catalogosFixture,
                obras: [
                    catalogosFixture.obras[0],
                    {
                        id: 2,
                        codigo: 'OB-02',
                        nombre: 'Obra Norte',
                        distrito: 'Jauja',
                        estado: 'activa',
                        avance_fisico_pct: 0,
                    },
                ],
            },
        });
        renderPagina(PartidasPage, { partidasDb: partidas });

        const filtro = screen.getAllByRole('combobox')[0];
        fireEvent.change(filtro, { target: { value: '2' } });

        expect(screen.queryAllByText('Trazo y replanteo')).toHaveLength(0);
        expect(screen.getAllByText('Excavación masiva')[0]).toBeTruthy();
        expect(screen.getByText('Partidas (1)')).toBeTruthy();
    });

    it('valida los campos obligatorios al registrar', () => {
        renderPagina(PartidasPage, { partidasDb: partidas });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Partida/ }),
        );

        expect(
            screen.getByText('Completa obra, código, descripción y unidad.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('valida metrado y costo antes de enviar', () => {
        renderPagina(PartidasPage, { partidasDb: partidas });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: '03.01' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: 'Encofrado' },
        });
        fireEvent.change(screen.getByLabelText(/^Unidad/), {
            target: { value: 'M2' },
        });
        fireEvent.change(screen.getByLabelText(/^Metrado/), {
            target: { value: '0' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Partida/ }),
        );

        expect(
            screen.getByText('Verifica el metrado y el costo unitario.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra una partida con los tipos numéricos correctos', () => {
        renderPagina(PartidasPage, { partidasDb: partidas });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Código/), {
            target: { value: '03.01' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción/), {
            target: { value: 'Encofrado' },
        });
        fireEvent.change(screen.getByLabelText(/^Unidad/), {
            target: { value: 'M2' },
        });
        fireEvent.change(screen.getByLabelText(/^Metrado/), {
            target: { value: '12.5' },
        });
        fireEvent.change(screen.getByLabelText(/^Costo Unit\./), {
            target: { value: '8.75' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Partida/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/partidas',
                datos: {
                    obra_id: 1,
                    codigo: '03.01',
                    descripcion: 'Encofrado',
                    unidad: 'M2',
                    metrado: 12.5,
                    costo_unitario: 8.75,
                    avance_pct: 0,
                },
            }),
        );
        expect(router.reload).toHaveBeenCalledWith({
            only: ['partidasDb'],
        });
    });
});
