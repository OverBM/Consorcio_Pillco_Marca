import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from '../../components/PageHeader';

describe('components/PageHeader', () => {
    it('renderiza título, subtítulo y acciones', () => {
        render(
            <PageHeader
                title="Transferencias"
                subtitle="Órdenes activas"
                actions={<button>Nuevo</button>}
            />,
        );

        expect(screen.getByText('Transferencias')).toBeTruthy();
        expect(screen.getByText('Órdenes activas')).toBeTruthy();
        expect(screen.getByText('Nuevo')).toBeTruthy();
    });

    it('usa la prop action cuando no hay actions', () => {
        render(<PageHeader title="Stock" action={<span>Exportar</span>} />);

        expect(screen.getByText('Exportar')).toBeTruthy();
    });

    it('prioriza actions sobre action', () => {
        render(
            <PageHeader
                title="Compras"
                actions={<span>Primero</span>}
                action={<span>Segundo</span>}
            />,
        );

        expect(screen.getByText('Primero')).toBeTruthy();
        expect(screen.queryByText('Segundo')).toBeNull();
    });

    it('omite subtítulo y acciones cuando no se envían', () => {
        const { container } = render(<PageHeader title="Solo título" />);

        expect(screen.getByText('Solo título')).toBeTruthy();
        expect(container.querySelectorAll('p')).toHaveLength(0);
    });
});
