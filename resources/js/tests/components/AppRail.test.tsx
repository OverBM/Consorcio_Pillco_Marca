import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detenerLectura } from '../../features/accesibilidad/preferencias';
import { NotificationProvider } from '../../components/notifications/NotificationProvider';
import { AppRail } from '../../design-system/AppRail';

const TODOS_LOS_PERMISOS = ['logistica.ver', 'compras.ver', 'admin.ver'];

describe('design-system/AppRail', () => {
    beforeEach(() => {
        window.localStorage.removeItem('cpm_accesibilidad');
        document.documentElement.removeAttribute('data-a11y-contraste');
        document.documentElement.removeAttribute('data-a11y-enlaces');
        document.documentElement.removeAttribute('data-a11y-movimiento');
        document.documentElement.style.removeProperty('font-size');
    });

    afterEach(() => {
        detenerLectura();
        window.localStorage.removeItem('cpm_accesibilidad');
        document.documentElement.removeAttribute('data-a11y-contraste');
        document.documentElement.removeAttribute('data-a11y-enlaces');
        document.documentElement.removeAttribute('data-a11y-movimiento');
        document.documentElement.style.removeProperty('font-size');
        delete (window as { speechSynthesis?: unknown }).speechSynthesis;
        delete (window as { SpeechSynthesisUtterance?: unknown })
            .SpeechSynthesisUtterance;
    });

    it('muestra las acciones base del riel', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />);

        expect(screen.getByLabelText('Buscar')).toBeTruthy();
        expect(screen.getByLabelText('Crear')).toBeTruthy();
        expect(screen.getByLabelText('Accesibilidad')).toBeTruthy();
        expect(screen.getByLabelText('Ajustes')).toBeTruthy();
        expect(screen.getByLabelText('Cambiar a modo oscuro')).toBeTruthy();
    });

    it('deshabilita la búsqueda cuando no hay disparador', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} />);

        const buscar = screen.getByLabelText('Buscar');

        expect(buscar).toHaveProperty('disabled', true);
        expect(buscar.getAttribute('title')).toContain('en construcción');
    });

    it('invoca el disparador de búsqueda al hacer clic', () => {
        const onSearch = vi.fn();
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={onSearch} />);

        fireEvent.click(screen.getByLabelText('Buscar'));

        expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('solo ofrece los accesos de creación permitidos', () => {
        render(<AppRail permisos={['logistica.ver']} onSearch={() => {}} />);

        fireEvent.click(screen.getByLabelText('Crear'));

        expect(screen.getByText('Solicitud de material')).toBeTruthy();
        expect(screen.getByText('Recepción de obra')).toBeTruthy();
        expect(screen.getByText('Despacho y rutas')).toBeTruthy();
        expect(screen.queryByText('Requerimiento de compra')).toBeNull();
    });

    it('oculta el botón crear cuando no hay permisos', () => {
        render(<AppRail permisos={[]} onSearch={() => {}} />);

        expect(screen.queryByLabelText('Crear')).toBeNull();
    });

    it('cierra el menú de creación con Escape', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />);

        fireEvent.click(screen.getByLabelText('Crear'));
        expect(screen.getByText('Solicitud de material')).toBeTruthy();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(screen.queryByText('Solicitud de material')).toBeNull();
    });

    it('lleva ajustes a parámetros con permiso de administración', () => {
        render(<AppRail permisos={['admin.ver']} onSearch={() => {}} />);

        expect(screen.getByLabelText('Ajustes').getAttribute('href')).toBe(
            '/admin/parametros',
        );
    });

    it('abre el menú de administración con sus submódulos', () => {
        render(
            <AppRail
                permisos={['admin.ver']}
                pathname="/admin/usuarios"
                onSearch={() => {}}
                adminItems={[
                    {
                        id: 'usuarios-roles',
                        label: 'Usuarios y Accesos',
                        href: '/admin/usuarios',
                        icon: 'users',
                    },
                    {
                        id: 'auditoria',
                        label: 'Bitácora',
                        href: '/admin/auditoria',
                        icon: 'shield',
                    },
                ]}
            />,
        );

        fireEvent.click(screen.getByLabelText('Administración'));

        expect(screen.getByText('Usuarios y Accesos')).toBeTruthy();
        expect(screen.getByText('Bitácora')).toBeTruthy();
    });

    it('lleva ajustes al perfil sin permiso de administración', () => {
        render(<AppRail permisos={['logistica.ver']} onSearch={() => {}} />);

        expect(screen.getByLabelText('Ajustes').getAttribute('href')).toBe(
            '/perfil',
        );
    });

    it('muestra los ajustes de accesibilidad en su panel', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />);

        fireEvent.click(screen.getByLabelText('Accesibilidad'));

        expect(
            screen.getByRole('dialog', { name: 'Accesibilidad' }),
        ).toBeTruthy();
        expect(screen.getByText('Leer la página')).toBeTruthy();
        expect(screen.getByText('Leer solo lo seleccionado')).toBeTruthy();
        expect(screen.getByLabelText('Voz de lectura')).toBeTruthy();
        expect(screen.getByText('Alto contraste')).toBeTruthy();
        expect(screen.getByText('Subrayar enlaces')).toBeTruthy();
        expect(screen.getByText('Reducir movimiento')).toBeTruthy();
        expect(screen.getByText(/Ctrl\/Cmd \+ K/)).toBeTruthy();
    });

    it('aplica y guarda alto contraste y tamaño de texto', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />);

        fireEvent.click(screen.getByLabelText('Accesibilidad'));
        fireEvent.click(screen.getByText('Alto contraste'));

        expect(
            document.documentElement.getAttribute('data-a11y-contraste'),
        ).toBe('alto');
        expect(
            JSON.parse(window.localStorage.getItem('cpm_accesibilidad') ?? '{}')
                .contraste,
        ).toBe(true);

        fireEvent.click(
            screen.getByLabelText('Tamaño de texto 112 por ciento'),
        );

        expect(document.documentElement.getAttribute('data-a11y-escala')).toBe(
            '112',
        );
        expect(
            screen
                .getByLabelText('Tamaño de texto 112 por ciento')
                .getAttribute('aria-pressed'),
        ).toBe('true');
    });

    it('restablece los ajustes y avisa del cambio', async () => {
        render(
            <NotificationProvider>
                <AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />
            </NotificationProvider>,
        );

        fireEvent.click(screen.getByLabelText('Accesibilidad'));
        fireEvent.click(screen.getByText('Alto contraste'));

        expect(
            document.documentElement.getAttribute('data-a11y-contraste'),
        ).toBe('alto');

        fireEvent.click(screen.getByText('Restablecer ajustes'));

        expect(
            document.documentElement.getAttribute('data-a11y-contraste'),
        ).toBeNull();
        expect(await screen.findByText('Ajustes restablecidos.')).toBeTruthy();
    });

    it('lee la página en voz alta y permite detener la lectura', () => {
        const hablar = vi.fn();
        const cancelar = vi.fn();

        Object.defineProperty(window, 'SpeechSynthesisUtterance', {
            configurable: true,
            value: class LocucionFalsa {
                public lang = '';
                public rate = 1;
                public pitch = 1;
                public voice: unknown = null;
                public onend: (() => void) | null = null;
                public onerror: (() => void) | null = null;

                public constructor(public text: string) {}
            },
        });
        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: {
                speak: hablar,
                cancel: cancelar,
                pause: vi.fn(),
                resume: vi.fn(),
                getVoices: () => [],
            },
        });

        render(
            <>
                <main>Contenido de prueba para la lectura por voz.</main>
                <AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />
            </>,
        );

        fireEvent.click(screen.getByLabelText('Accesibilidad'));
        fireEvent.click(screen.getByText('Leer la página'));

        expect(hablar).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Detener lectura')).toBeTruthy();

        fireEvent.click(screen.getByText('Detener lectura'));

        expect(cancelar).toHaveBeenCalled();
        expect(screen.getByText('Leer la página')).toBeTruthy();

        // Cambiar una opción de voz mientras se lee debe detener la lectura.
        fireEvent.click(screen.getByText('Leer la página'));
        expect(screen.getByText('Detener lectura')).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Velocidad de lectura'), {
            target: { value: '1.2' },
        });

        expect(screen.getByText('Leer la página')).toBeTruthy();
    });
});
