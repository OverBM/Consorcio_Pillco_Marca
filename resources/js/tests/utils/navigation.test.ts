import { describe, expect, it } from 'vitest';

import { resolveActiveHref } from '../../utils/navigation';

describe('utils/navigation', () => {
    const hrefs = ['/', '/programa', '/programa/redistribucion', '/stock'];

    it('prioriza la coincidencia exacta', () => {
        expect(resolveActiveHref('/stock', hrefs)).toBe('/stock');
        expect(resolveActiveHref('/programa/', hrefs)).toBe('/programa');
    });

    it('elige el prefijo más específico', () => {
        expect(resolveActiveHref('/programa/redistribucion/nueva', hrefs)).toBe(
            '/programa/redistribucion',
        );
        expect(resolveActiveHref('/programa/detalle', hrefs)).toBe('/programa');
    });

    it('ignora la query string', () => {
        expect(resolveActiveHref('/stock?almacen=2', hrefs)).toBe('/stock');
    });

    it('devuelve null cuando no hay coincidencias', () => {
        expect(resolveActiveHref('/otra-cosa', hrefs)).toBeNull();
        expect(resolveActiveHref('/', ['/stock'])).toBeNull();
    });
});
