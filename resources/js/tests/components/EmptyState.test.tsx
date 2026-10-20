import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '../../components/EmptyState';

describe('components/EmptyState', () => {
    it('renderiza el icono por defecto con título y pista', () => {
        const { container } = render(
            <EmptyState title="Sin datos" hint="Agrega un registro" />,
        );

        expect(screen.getByText('Sin datos')).toBeTruthy();
        expect(screen.getByText('Agrega un registro')).toBeTruthy();
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('usa el icono personalizado y omite la pista', () => {
        const { container } = render(
            <EmptyState
                icon={<span data-testid="icono">★</span>}
                title="Vacío"
            />,
        );

        expect(screen.getByTestId('icono')).toBeTruthy();
        expect(container.querySelectorAll('p')).toHaveLength(1);
    });
});
