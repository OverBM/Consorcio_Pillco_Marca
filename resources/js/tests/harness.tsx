import { render, type RenderResult } from '@testing-library/react';
import type { ComponentType, ReactElement } from 'react';

import { NotificationProvider } from '../components/notifications/NotificationProvider';

/**
 * Renderiza una página Inertia dentro del `NotificationProvider` real
 * y con props sueltas (los tipos de cada página se validan en la propia página).
 */
export function renderPagina(
    componente: unknown,
    props: Record<string, unknown> = {},
): RenderResult {
    const Pagina = componente as ComponentType<Record<string, unknown>>;

    const elemento: ReactElement = (
        <NotificationProvider>
            <Pagina {...props} />
        </NotificationProvider>
    );

    return render(elemento);
}
