import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import 'leaflet/dist/leaflet.css';

import { createInertiaApp } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

const appName = 'Consorcio Pillco Marca';

function AppShell({ children }: { children: ReactNode }) {
    return (
        <NotificationProvider>
            <AppLayout>{children}</AppLayout>
        </NotificationProvider>
    );
}

void createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    progress: {
        color: '#5468ff',
    },
    layout: () => AppShell,
});