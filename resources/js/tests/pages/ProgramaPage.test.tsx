import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ProgramaPage from '../../pages/ProgramaPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { setPageProps } from '../mocks/inertia';

const obras = [
    {
        id: 'OB-01',
        codigo: 'OB-01',
        nombre: 'Mejoramiento Vía Huancayo',
        distrito: 'Huancayo',
        responsable: 'Ing. Ana Torres',
        estado: 'activa',
        pctAvance: 62,
        presupuesto: 1250000,
    },
    {
        id: 'OB-02',
        codigo: 'OB-02',
        nombre: 'Ampliación IE Los Andes',
        distrito: 'El Tambo',
        responsable: 'Ing. Luis Paredes',
        estado: 'ejecucion',
        pctAvance: 45,
        presupuesto: 840000,
    },
    {
        id: 'OB-03',
        codigo: 'OB-03',
        nombre: 'Puente Cunas',
        distrito: 'Chupaca',
        responsable: 'Ing. Rosa Quispe',
        estado: 'cierre',
        pctAvance: 98,
        presupuesto: 500000,
    },
    {
        id: 'OB-04',
        codigo: 'OB-04',
        nombre: 'Conexión Chilca',
        distrito: 'Chilca',
        responsable: 'Ing. Marco Huamán',
        estado: 'liquidada',
        pctAvance: 100,
        presupuesto: 310000,
    },
];

const evmConsolidado = {
    totalObras: 4,
    totalBac: 2900000,
    totalPv: 2600000,
    totalEv: 2500000,
    totalAc: 2450000,
    cpi: 1.02,
    spi: 0.96,
    avanceFisicoPct: 76,
    ahorroObrasSoles: 50000,
};

describe('ProgramaPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('consolida el portafolio con los indicadores EVM', () => {
        renderPagina(ProgramaPage, { obrasDb: obras, evmConsolidado });

        expect(
            screen.getAllByText('Tablero Consolidado del Programa (PMU)')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('4')[0]).toBeTruthy();
        expect(screen.getAllByText(/2,900,000/)[0]).toBeTruthy();
        expect(screen.getAllByText('76%')[0]).toBeTruthy();
        expect(screen.getAllByText('0.96 / 1.02')[0]).toBeTruthy();
        expect(screen.getAllByText('OB-01')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('100%')[0]).toBeTruthy();
    });

    it('calcula los indicadores a partir de las obras y filtra por estado', () => {
        renderPagina(ProgramaPage, { obrasDb: obras });

        expect(screen.getAllByText('2 activas en ejecución')[0]).toBeTruthy();
        expect(screen.getAllByText('0.00 / 0.00')[0]).toBeTruthy();

        fireEvent.click(
            screen.getAllByRole('button', { name: 'ejecucion' })[0],
        );
        expect(screen.queryByText('OB-01')).toBeNull();
        expect(screen.getAllByText('OB-02')[0]).toBeTruthy();

        fireEvent.click(
            screen.getAllByRole('button', { name: 'liquidada' })[0],
        );
        expect(screen.getAllByText('OB-04')[0]).toBeTruthy();

        fireEvent.click(screen.getAllByRole('button', { name: 'todos' })[0]);
        expect(screen.getAllByText('OB-01')[0]).toBeTruthy();
    });

    it('informa cuando el filtro no encuentra coincidencias', () => {
        renderPagina(ProgramaPage, {
            obrasDb: obras.filter((o) => o.estado !== 'liquidada'),
        });

        fireEvent.click(
            screen.getAllByRole('button', { name: 'liquidada' })[0],
        );

        expect(
            screen.getAllByText('No hay obras que coincidan con el filtro.')[0],
        ).toBeTruthy();
    });

    it('muestra el estado vacío sin obras registradas', () => {
        renderPagina(ProgramaPage, { obrasDb: [] });

        expect(screen.getAllByText('Sin obras registradas')[0]).toBeTruthy();
        expect(screen.getAllByText('0%')[0]).toBeTruthy();
    });
});
