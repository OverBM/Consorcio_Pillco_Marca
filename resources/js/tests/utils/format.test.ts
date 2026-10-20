import { describe, expect, it } from 'vitest';

import {
    formatCantidad,
    formatFecha,
    formatFs,
    formatKm,
    formatMoneda,
    formatNum,
    iniciales,
} from '../../utils/format';

describe('utils/format', () => {
    it('formatea números y moneda en es-PE', () => {
        expect(formatNum(1234.56)).toContain('1');
        expect(formatMoneda(1500)).toContain('S/');
        expect(formatCantidad(10)).toContain('10');
        expect(formatCantidad(10, 'bol')).toContain('bol');
        expect(formatKm(12.34)).toBe('12.3 km');
    });

    it('formatea fechas válidas e inválidas', () => {
        expect(formatFecha('2026-01-15T10:00:00.000Z')).not.toBe(
            '2026-01-15T10:00:00.000Z',
        );
        expect(formatFs('2026-01-15T10:00:00.000Z')).toContain('2026');
        expect(formatFecha('no-es-fecha')).toBe('no-es-fecha');
        expect(formatFs('no-es-fecha')).toBe('no-es-fecha');
    });

    it('calcula iniciales ignorando el tratamiento de ingeniero', () => {
        expect(iniciales('Ing. Ana Torres')).toBe('AT');
        expect(iniciales('Juan Pérez')).toBe('JP');
        expect(iniciales('')).toBe('');
    });
});
