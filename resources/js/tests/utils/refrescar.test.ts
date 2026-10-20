import { describe, expect, it, vi } from 'vitest';

import { router } from '@inertiajs/react';
import { refrescarProps } from '../../utils/refrescar';

describe('utils/refrescar', () => {
    it('recarga solo los props indicados', () => {
        refrescarProps('excedentesDb', 'transferenciasAhpDb');

        expect(router.reload).toHaveBeenCalledWith({
            only: ['excedentesDb', 'transferenciasAhpDb'],
        });
    });

    it('no recarga cuando no se indican props', () => {
        refrescarProps();

        expect(router.reload).not.toHaveBeenCalled();
    });
});
