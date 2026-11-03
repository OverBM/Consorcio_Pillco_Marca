import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import 'leaflet/dist/leaflet.css';

import { createInertiaApp, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import type { Auth } from '@/types/auth';

const appName = 'Consorcio Pillco Marca';

function AppShell({ children }: { children: ReactNode }) {
    const { props } = usePage();
    const auth = (props as { auth?: Auth | null }).auth;

    return (
        <NotificationProvider>
            {auth?.user ? <AppLayout>{children}</AppLayout> : children}
            <OfflineIndicator />
        </NotificationProvider>
    );
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js');
    });
}

void createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    progress: {
        color: '#5468ff',
    },
    layout: () => AppShell,
});
