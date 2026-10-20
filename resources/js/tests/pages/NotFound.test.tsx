import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NotFound from '../../pages/errors/NotFound';
import { renderPagina } from '../harness';

describe('NotFound', () => {
    it('muestra el error 404 y las acciones de regreso', () => {
        renderPagina(NotFound);

        expect(screen.getByText('Error 404')).toBeTruthy();
        expect(screen.getByText('Ir al panel')).toBeTruthy();
        expect(screen.getByText('Volver al inicio')).toBeTruthy();
        expect(screen.queryByText('/ruta/perdida')).toBeNull();
    });

    it('muestra la ruta solicitada cuando se recibe', () => {
        renderPagina(NotFound, { path: '/ruta/perdida' });

        expect(screen.getByText('/ruta/perdida')).toBeTruthy();
    });
});
