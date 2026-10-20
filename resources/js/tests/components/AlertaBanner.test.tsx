import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlertaBanner } from '../../components/AlertaBanner';

describe('components/AlertaBanner', () => {
    it('renderiza cada tipo con su contenido', () => {
        const kinds = ['sobrante', 'critico', 'info'] as const;

        for (const kind of kinds) {
            const { unmount } = render(
                <AlertaBanner
                    kind={kind}
                    title={`Título ${kind}`}
                    mensaje={`Mensaje ${kind}`}
                />,
            );

            expect(screen.getByText(`Título ${kind}`)).toBeTruthy();
            expect(screen.getByText(`Mensaje ${kind}`)).toBeTruthy();
            unmount();
        }
    });

    it('muestra las acciones cuando se envían', () => {
        render(
            <AlertaBanner
                kind="sobrante"
                title="Excedente"
                mensaje="Hay material sobrante"
                actions={<button>Redistribuir</button>}
            />,
        );

        expect(screen.getByText('Redistribuir')).toBeTruthy();
    });

    it('omite el contenedor de acciones cuando no se envían', () => {
        const { container } = render(
            <AlertaBanner kind="info" title="Info" mensaje="Todo en orden" />,
        );

        const fila = container.querySelector('.flex-wrap.items-start');

        expect(fila?.children).toHaveLength(1);
    });
});
