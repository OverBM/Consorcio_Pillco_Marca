import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as Iconos from '../../components/icons';

describe('icons', () => {
    const iconos = Object.entries(Iconos).filter(
        ([nombre, valor]) =>
            nombre.startsWith('Icon') && typeof valor === 'function',
    ) as Array<
        [
            string,
            (props: {
                size?: number;
                className?: string;
            }) => React.ReactElement,
        ]
    >;

    it('exporta el catálogo completo', () => {
        expect(iconos.length).toBeGreaterThan(30);
    });

    it.each(iconos)('renderiza %s con tamaño y clases', (nombre, Icono) => {
        const { container } = render(
            <Icono size={18} className="text-brand-600" />,
        );

        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        expect(svg?.getAttribute('width')).toBe('18');
        expect(svg?.getAttribute('class')).toContain('text-brand-600');
    });
});
