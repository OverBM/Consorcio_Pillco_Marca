import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '../../design-system/StatusBadge';

describe('design-system/StatusBadge', () => {
    it('renderiza la etiqueta con el tono por defecto y el punto', () => {
        const { container } = render(<StatusBadge label="Activo" />);

        expect(screen.getByText('Activo')).toBeTruthy();
        expect(container.querySelectorAll('span')).toHaveLength(3);
    });

    it('aplica cada tono disponible', () => {
        const tonos = ['mint', 'yellow', 'dark', 'smoke', 'danger'] as const;

        for (const tone of tonos) {
            const { unmount } = render(
                <StatusBadge label={`Tono ${tone}`} tone={tone} />,
            );

            expect(screen.getByText(`Tono ${tone}`)).toBeTruthy();
            unmount();
        }
    });

    it('omite el punto y acepta una clase adicional', () => {
        const { container } = render(
            <StatusBadge label="Sin punto" dot={false} className="extra" />,
        );

        const badge = container.firstElementChild as HTMLElement;

        expect(badge.className).toContain('extra');
        expect(badge.querySelectorAll('span')).toHaveLength(1);
    });
});
