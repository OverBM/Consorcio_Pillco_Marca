import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    useMediaQuery,
    useSimulatedTransit,
} from '../../hooks/useSimulatedTransit';

function prepararRaf() {
    const pendientes: FrameRequestCallback[] = [];
    const cancelar = vi.fn();

    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        pendientes.push(cb);
        return pendientes.length;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelar);

    return { pendientes, cancelar };
}

describe('useSimulatedTransit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(performance, 'now').mockReturnValue(0);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('no anima cuando el despacho no está activo', () => {
        const { pendientes } = prepararRaf();
        const alLlegar = vi.fn();

        const { result } = renderHook(() =>
            useSimulatedTransit({
                activo: false,
                pctInicial: 0.4,
                entregado: false,
                onLlegada: alLlegar,
            }),
        );

        expect(result.current).toBe(0);
        expect(pendientes).toHaveLength(0);
        expect(alLlegar).not.toHaveBeenCalled();
    });

    it('devuelve 1 cuando el despacho ya fue entregado', () => {
        const { pendientes } = prepararRaf();

        const { result } = renderHook(() =>
            useSimulatedTransit({
                activo: true,
                pctInicial: 0.2,
                entregado: true,
                onLlegada: vi.fn(),
            }),
        );

        expect(result.current).toBe(1);
        expect(pendientes).toHaveLength(0);
    });

    it('avanza por la ruta y notifica la llegada al 100%', () => {
        const { pendientes } = prepararRaf();
        const alLlegar = vi.fn();

        const { result } = renderHook(() =>
            useSimulatedTransit({
                activo: true,
                pctInicial: 0,
                entregado: false,
                speedFactor: 1,
                onLlegada: alLlegar,
            }),
        );

        expect(result.current).toBe(0);
        expect(pendientes).toHaveLength(1);

        act(() => {
            pendientes[0](6000);
        });

        expect(result.current).toBeCloseTo(0.5, 5);
        expect(pendientes).toHaveLength(2);

        act(() => {
            pendientes[1](12000);
        });

        expect(result.current).toBe(1);
        expect(alLlegar).toHaveBeenCalledTimes(1);
    });

    it('respeta el porcentaje inicial y el factor de velocidad', () => {
        const { pendientes } = prepararRaf();

        const { result } = renderHook(() =>
            useSimulatedTransit({
                activo: true,
                pctInicial: 0.25,
                entregado: false,
                speedFactor: 2,
                onLlegada: vi.fn(),
            }),
        );

        expect(result.current).toBe(0.25);

        act(() => {
            pendientes[0]((1 - 0.25) * 12000 * 2 * 0.5);
        });

        expect(result.current).toBeCloseTo(0.625, 5);
    });

    it('cancela la animación al desmontar', () => {
        const { cancelar } = prepararRaf();

        const { unmount } = renderHook(() =>
            useSimulatedTransit({
                activo: true,
                pctInicial: 0,
                entregado: false,
                onLlegada: vi.fn(),
            }),
        );

        unmount();

        expect(cancelar).toHaveBeenCalledTimes(1);
    });

    it('invoca siempre el callback de llegada más reciente', () => {
        const { pendientes } = prepararRaf();
        const primero = vi.fn();
        const segundo = vi.fn();

        const { rerender } = renderHook(
            ({ cb }: { cb: () => void }) =>
                useSimulatedTransit({
                    activo: true,
                    pctInicial: 0,
                    entregado: false,
                    onLlegada: cb,
                }),
            { initialProps: { cb: primero } },
        );

        rerender({ cb: segundo });

        act(() => {
            pendientes[0](12000);
        });

        expect(primero).not.toHaveBeenCalled();
        expect(segundo).toHaveBeenCalledTimes(1);
    });
});

function crearMatchMedia(matches: boolean) {
    const listeners: Array<() => void> = [];

    const mq = {
        matches,
        media: '(min-width: 768px)',
        onchange: null,
        addEventListener: vi.fn((_evento: string, cb: () => void) => {
            listeners.push(cb);
        }),
        removeEventListener: vi.fn((_evento: string, cb: () => void) => {
            const indice = listeners.indexOf(cb);

            if (indice >= 0) {
                listeners.splice(indice, 1);
            }
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    };

    window.matchMedia = vi.fn(() => mq) as unknown as typeof window.matchMedia;

    return { mq, listeners };
}

describe('useMediaQuery', () => {
    it('devuelve el match inicial y reacciona a los cambios', () => {
        const { mq, listeners } = crearMatchMedia(false);

        const { result } = renderHook(() =>
            useMediaQuery('(min-width: 768px)'),
        );
        expect(result.current).toBe(false);

        mq.matches = true;

        act(() => {
            for (const listener of listeners) {
                listener();
            }
        });

        expect(result.current).toBe(true);
    });

    it('registra y limpia el listener de cambio', () => {
        const { mq } = crearMatchMedia(true);

        const { result, unmount } = renderHook(() =>
            useMediaQuery('(max-width: 640px)'),
        );

        expect(result.current).toBe(true);
        expect(mq.addEventListener).toHaveBeenCalled();

        unmount();

        expect(mq.removeEventListener).toHaveBeenCalled();
    });
});
