import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KpiCard } from '../../components/KpiCard';

describe('components/KpiCard', () => {
    it('renderiza etiqueta, valor, unidad y pista', () => {
        render(
            <KpiCard
                icon={<span>ICONO</span>}
                label="Materiales"
                value={18}
                unit="ítems"
                hint="En almacén central"
            />,
        );

        expect(screen.getByText('Materiales')).toBeTruthy();
        expect(screen.getByText('18')).toBeTruthy();
        expect(screen.getByText('ítems')).toBeTruthy();
        expect(screen.getByText('En almacén central')).toBeTruthy();
        expect(screen.getByText('ICONO')).toBeTruthy();
    });

    it('aplica cada tono disponible', () => {
        const tonos = ['indigo', 'ok', 'danger', 'violet'] as const;

        for (const tone of tonos) {
            const { container, unmount } = render(
                <KpiCard
                    icon={<span>i</span>}
                    label={`Tono ${tone}`}
                    value={tone}
                    tone={tone}
                />,
            );

            expect(screen.getByText(`Tono ${tone}`)).toBeTruthy();
            expect(container.querySelector('.card')).toBeTruthy();
            unmount();
        }
    });

    it('omite unidad y pista cuando no se envían', () => {
        const { container } = render(
            <KpiCard icon={<span>i</span>} label="Solo" value={'x'} />,
        );

        expect(screen.getByText('Solo')).toBeTruthy();
        expect(container.querySelectorAll('p')).toHaveLength(2);
    });
});
