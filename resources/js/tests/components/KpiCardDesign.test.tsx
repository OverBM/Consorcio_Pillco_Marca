import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KpiCard } from '../../design-system/KpiCard';

describe('design-system/KpiCard', () => {
    it('renderiza la variante estándar con unidad, delta y nota', () => {
        const { container } = render(
            <KpiCard
                title="Avance físico"
                value={42}
                unit="%"
                delta="+3%"
                deltaType="positive"
                footNote="enero"
                iconGlyph="▲"
            />,
        );

        expect(screen.getByText('Avance físico')).toBeTruthy();
        expect(screen.getByText('42')).toBeTruthy();
        expect(screen.getByText('%')).toBeTruthy();
        expect(screen.getByText('+3%')).toBeTruthy();
        expect(screen.getByText('enero')).toBeTruthy();
        expect(screen.getByText('▲')).toBeTruthy();

        const tarjeta = container.firstElementChild as HTMLElement;
        expect(tarjeta.className).toContain('bg-white');
    });

    it('usa los estilos de delta negativo y neutral', () => {
        const { container, unmount } = render(
            <KpiCard title="Merma" value={5} delta="-1" deltaType="negative" />,
        );

        expect(container.querySelector('.text-rose-600')).toBeTruthy();
        unmount();

        const { container: neutro } = render(
            <KpiCard title="Stock" value={10} delta="=" />,
        );

        expect(neutro.querySelector('.opacity-70')).toBeTruthy();
    });

    it('renderiza las variantes oscura y de alerta', () => {
        const { container, unmount } = render(
            <KpiCard
                title="Total"
                value="1 200"
                variant="dark"
                delta="+10"
                deltaType="positive"
            />,
        );

        const oscura = container.firstElementChild as HTMLElement;
        expect(oscura.className).toContain('bg-[#000000]');
        expect(container.querySelector('.text-\\[\\#d1ffca\\]')).toBeTruthy();
        unmount();

        const { container: alerta } = render(
            <KpiCard
                title="Riesgo"
                value={3}
                variant="alert"
                iconGlyph="!"
                className="extra"
            />,
        );

        const tarjetaAlerta = alerta.firstElementChild as HTMLElement;
        expect(tarjetaAlerta.className).toContain('border-t-[#fff100]');
        expect(tarjetaAlerta.className).toContain('extra');
        expect(alerta.querySelector('.rounded-full')).toBeTruthy();
    });

    it('omite los elementos opcionales cuando no se envían', () => {
        const { container } = render(<KpiCard title="Solo" value={1} />);

        expect(container.querySelectorAll('span')).toHaveLength(2);
    });
});
