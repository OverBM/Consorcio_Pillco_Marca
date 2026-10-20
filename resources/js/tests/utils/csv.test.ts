import { describe, expect, it, vi } from 'vitest';

import { downloadCsv, toCsv } from '../../utils/csv';

describe('utils/csv', () => {
    it('devuelve cadena vacía sin filas', () => {
        expect(toCsv([])).toBe('');
    });

    it('serializa filas escapando comas, comillas y saltos', () => {
        const csv = toCsv([
            { material: 'Cemento', cantidad: 10 },
            { material: 'Acero, 1/2"', cantidad: null },
            { material: 'Arena\nfina', cantidad: true },
        ]);

        const lineas = csv.split('\r\n');

        expect(lineas[0]).toBe('material,cantidad');
        expect(lineas[1]).toBe('Cemento,10');
        expect(lineas[2]).toBe('"Acero, 1/2""",');
        expect(lineas[3]).toBe('"Arena\nfina",true');
    });

    it('serializa valores complejos como JSON', () => {
        expect(toCsv([{ meta: { a: 1 } }])).toBe('meta\r\n"{""a"":1}"');
    });

    it('descarga el CSV creando y revocando la URL del blob', () => {
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);

        downloadCsv('stock.csv', 'a,b');

        expect(URL.createObjectURL).toHaveBeenCalledOnce();
        expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
        expect(click).toHaveBeenCalledOnce();

        click.mockRestore();
    });
});
