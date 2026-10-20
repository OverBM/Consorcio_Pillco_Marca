import { describe, expect, it, type Mock } from 'vitest';

import { router } from '@inertiajs/react';
import { refrescarProps } from '../../utils/refrescar';

const routerMock = router as unknown as { reload: Mock };

describe('utils/refrescar', () => {
    it('recarga solo los props indicados', () => {
        refrescarProps('excedentesDb', 'transferenciasAhpDb');

        expect(routerMock.reload).toHaveBeenCalledWith({
            only: ['excedentesDb', 'transferenciasAhpDb'],
        });
    });

    it('no recarga cuando no se indican props', () => {
        refrescarProps();

        expect(routerMock.reload).not.toHaveBeenCalled();
    });
});
