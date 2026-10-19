// Refresco parcial de props de Inertia tras una mutación.
// Regla del proyecto: toda mutación debe refrescar TODOS los props
// dependientes (listados e indicadores derivados), sin recargar la página.
//
// Uso: `refrescarProps('excedentesDb', 'transferenciasAhpDb')`

import { router } from '@inertiajs/react';

export function refrescarProps(...props: string[]): void {
    if (props.length === 0) return;

    router.reload({ only: props });
}
