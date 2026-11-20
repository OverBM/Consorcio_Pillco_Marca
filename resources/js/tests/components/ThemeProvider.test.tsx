import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from '../../components/theme/ThemeProvider';

function BotonTema() {
    const { tema, alternarTema } = useTheme();

    return (
        <button type="button" onClick={alternarTema}>
            {tema}
        </button>
    );
}

describe('theme/ThemeProvider', () => {
    beforeEach(() => {
        window.localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('theme-changing');
    });

    afterEach(() => {
        Reflect.deleteProperty(document, 'startViewTransition');
        vi.restoreAllMocks();
    });

    it('alterna el tema y lo persiste en localStorage', () => {
        render(
            <ThemeProvider>
                <BotonTema />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('button').textContent).toBe('oscuro');
        expect(document.documentElement.dataset.theme).toBe('oscuro');
        expect(
            document.documentElement.classList.contains('theme-changing'),
        ).toBe(true);
        expect(window.localStorage.getItem('cpm_tema')).toBe('oscuro');
    });

    it('usa View Transitions cuando el navegador las soporta', () => {
        const transicion = vi.fn((callback: () => void) => callback());

        Object.defineProperty(document, 'startViewTransition', {
            configurable: true,
            value: transicion,
        });

        render(
            <ThemeProvider>
                <BotonTema />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(transicion).toHaveBeenCalledTimes(1);
        expect(document.documentElement.dataset.theme).toBe('oscuro');
    });

    it('respeta prefers-reduced-motion y no anima', () => {
        const original = window.matchMedia;

        window.matchMedia = vi.fn((consulta: string) => ({
            matches: consulta.includes('reduced-motion'),
            media: consulta,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as unknown as typeof window.matchMedia;

        render(
            <ThemeProvider>
                <BotonTema />
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(document.documentElement.dataset.theme).toBe('oscuro');
        expect(
            document.documentElement.classList.contains('theme-changing'),
        ).toBe(false);

        window.matchMedia = original;
    });
});
