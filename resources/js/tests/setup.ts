import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { resetHttpMocks, resetPage } from './mocks/inertia';

function stubGlobal<T extends keyof typeof globalThis>(
    clave: T,
    valor: (typeof globalThis)[T],
): void {
    if (!globalThis[clave]) {
        globalThis[clave] = valor;
    }
}

stubGlobal(
    'ResizeObserver' as 'ResizeObserver',
    class ResizeObserverFalso {
        public observe(): void {}
        public unobserve(): void {}
        public disconnect(): void {}
    } as unknown as typeof ResizeObserver,
);

stubGlobal(
    'IntersectionObserver' as 'IntersectionObserver',
    class IntersectionObserverFalso {
        public observe(): void {}
        public unobserve(): void {}
        public disconnect(): void {}
        public takeRecords(): [] {
            return [];
        }
    } as unknown as typeof IntersectionObserver,
);

if (!window.matchMedia) {
    window.matchMedia = ((consulta: string) => ({
        matches: false,
        media: consulta,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

URL.createObjectURL = vi.fn(() => 'blob:test');
URL.revokeObjectURL = vi.fn();

if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}

globalThis.fetch = vi.fn(
    async () =>
        new Response(JSON.stringify({ data: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }),
) as unknown as typeof fetch;

beforeEach(() => {
    resetPage();
    resetHttpMocks();
});

afterEach(() => {
    cleanup();
});
