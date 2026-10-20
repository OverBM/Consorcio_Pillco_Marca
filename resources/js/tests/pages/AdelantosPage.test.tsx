import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdelantosPage from '../../pages/AdelantosPage';
import { renderPagina } from '../harness';

describe('AdelantosPage', () => {
    it('lista los adelantos con banco, garantía y estado', () => {
        renderPagina(AdelantosPage);

        expect(
            screen.getAllByText('Adelantos y Cuenta Fideicomitente')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('DIRECTO')[0]).toBeTruthy();
        expect(screen.getAllByText('MATERIALES')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Banco de Crédito del Perú (Fideicomiso)')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('BBVA Perú (Cuenta Fideicomitente)')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText('Carta Fianza N° CF-8812-BCP')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('En Amortización').length).toBeGreaterThan(
            1,
        );
    });

    it('muestra los encabezados de montos y saldo', () => {
        renderPagina(AdelantosPage);

        expect(screen.getAllByText('Monto Otorgado')[0]).toBeTruthy();
        expect(screen.getAllByText('Monto Amortizado')[0]).toBeTruthy();
        expect(screen.getAllByText('Saldo por Amortizar')[0]).toBeTruthy();
        expect(screen.getAllByText('Garantía / Fianza')[0]).toBeTruthy();
    });
});
