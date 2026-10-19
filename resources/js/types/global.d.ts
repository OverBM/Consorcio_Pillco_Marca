import type {
    Auth,
    Catalogos,
    Contexto,
    NotificacionesFeed,
} from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            catalogos: Catalogos;
            contexto: Contexto;
            notificacionesFeed: NotificacionesFeed;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
