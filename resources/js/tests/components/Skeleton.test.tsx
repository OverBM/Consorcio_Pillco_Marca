import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    Skeleton,
    SkeletonCard,
    SkeletonKpi,
    SkeletonKpiGrid,
    SkeletonTable,
    SkeletonText,
} from '../../components/Skeleton';

describe('components/Skeleton', () => {
    it('renderiza un bloque simple con clase adicional', () => {
        const { container } = render(<Skeleton className="h-8 w-8" />);

        const bloque = container.firstElementChild as HTMLElement;

        expect(bloque.getAttribute('aria-hidden')).toBe('true');
        expect(bloque.className).toContain('h-8');
    });

    it('genera varias líneas de texto', () => {
        const { container } = render(<SkeletonText lines={5} />);

        expect(container.querySelectorAll('div')).toHaveLength(6);
    });

    it('usa 3 líneas por defecto', () => {
        const { container } = render(<SkeletonText />);

        expect(container.querySelectorAll('div')).toHaveLength(4);
    });

    it('renderiza el esqueleto de KPI', () => {
        const { container } = render(<SkeletonKpi className="extra" />);

        expect(container.querySelector('.extra')).toBeTruthy();
    });

    it('renderiza la grilla de KPI con el conteo indicado', () => {
        const { container } = render(<SkeletonKpiGrid count={4} />);

        expect(container.querySelector('[role="status"]')).toBeTruthy();
        expect(container.querySelectorAll('.card')).toHaveLength(4);
    });

    it('renderiza la tabla con filas y encabezado', () => {
        const { container } = render(<SkeletonTable rows={2} />);

        expect(
            container.querySelector('[aria-label="Cargando registros"]'),
        ).toBeTruthy();
        expect(container.querySelectorAll('.h-11')).toHaveLength(2);
    });

    it('renderiza la tarjeta con hijos personalizados', () => {
        const { container } = render(
            <SkeletonCard>
                <span>contenido</span>
            </SkeletonCard>,
        );

        expect(container.textContent).toContain('contenido');
    });
});
