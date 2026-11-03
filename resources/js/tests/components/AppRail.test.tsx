import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRail } from '../../design-system/AppRail';

const TODOS_LOS_PERMISOS = ['logistica.ver', 'compras.ver', 'admin.ver'];

describe('design-system/AppRail', () => {
    it('muestra las acciones base del riel', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />);

        expect(screen.getByLabelText('Buscar')).toBeTruthy();
        expect(screen.getByLabelText('Crear')).toBeTruthy();
        expect(screen.getByLabelText('Ayuda')).toBeTruthy();
        expect(screen.getByLabelText('Ajustes')).toBeTruthy();
        expect(screen.getByLabelText('Modo oscuro próximamente')).toBeTruthy();
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

    it('muestra los atajos en la ayuda', () => {
        render(<AppRail permisos={TODOS_LOS_PERMISOS} onSearch={() => {}} />);

        fireEvent.click(screen.getByLabelText('Ayuda'));

        expect(
            screen.getByRole('dialog', { name: 'Ayuda y atajos' }),
        ).toBeTruthy();
        expect(screen.getByText('Ctrl/Cmd + K')).toBeTruthy();
        expect(screen.getAllByText('Esc').length).toBeGreaterThan(0);
    });
});
