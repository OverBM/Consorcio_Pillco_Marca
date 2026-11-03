import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GlobalSearch } from '../../design-system/GlobalSearch';

function respuestaCon(items: { titulo: string }[]) {
    return {
        ok: true,
        json: async () => ({
            grupos: [
                {
                    tipo: 'materiales',
                    etiqueta: 'Materiales',
                    items: items.map((item, indice) => ({
                        id: String(indice + 1),
                        titulo: item.titulo,
                        subtitulo: 'Material',
                        href: '/stock',
                    })),
                },
            ],
        }),
    } as Response;
}

describe('design-system/GlobalSearch', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('no renderiza nada cuando está cerrado', () => {
        render(<GlobalSearch abierto={false} onCerrar={() => {}} />);

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('se abre como diálogo con el campo enfocado', () => {
        render(<GlobalSearch abierto onCerrar={() => {}} />);

        expect(
            screen.getByRole('dialog', { name: 'Búsqueda global' }),
        ).toBeTruthy();
        expect(screen.getByLabelText('Término de búsqueda')).toBeTruthy();
    });

    it('consulta y muestra resultados agrupados', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            respuestaCon([
                { titulo: 'Cemento Portland' },
                { titulo: 'Cemento Blanco' },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        render(<GlobalSearch abierto onCerrar={() => {}} />);

        fireEvent.change(screen.getByLabelText('Término de búsqueda'), {
            target: { value: 'cemento' },
        });

        expect(await screen.findByText('Cemento Portland')).toBeTruthy();
        expect(screen.getByText('Materiales')).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/v1/buscar?q=cemento',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
    });

    it('muestra el estado vacío cuando no hay resultados', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(respuestaCon([])),
        );

        render(<GlobalSearch abierto onCerrar={() => {}} />);

        fireEvent.change(screen.getByLabelText('Término de búsqueda'), {
            target: { value: 'zzzz' },
        });

        expect(await screen.findByText(/Sin resultados/)).toBeTruthy();
    });

    it('muestra error y permite reintentar', async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new Error('red'))
            .mockResolvedValue(respuestaCon([{ titulo: 'Acero' }]));
        vi.stubGlobal('fetch', fetchMock);

        render(<GlobalSearch abierto onCerrar={() => {}} />);

        fireEvent.change(screen.getByLabelText('Término de búsqueda'), {
            target: { value: 'acero' },
        });

        expect(
            await screen.findByText('No se pudo completar la búsqueda.'),
        ).toBeTruthy();

        fireEvent.click(screen.getByText('Reintentar'));

        expect(await screen.findByText('Acero')).toBeTruthy();
    });

    it('cierra con Escape', async () => {
        const onCerrar = vi.fn();

        render(<GlobalSearch abierto onCerrar={onCerrar} />);

        fireEvent.keyDown(window, { key: 'Escape' });

        await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    });
});
