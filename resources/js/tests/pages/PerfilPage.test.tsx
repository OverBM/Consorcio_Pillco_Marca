import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import PerfilPage from '../../pages/PerfilPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const perfil = {
    id: 1,
    name: 'Ana Torres',
    email: 'ana.torres@consorcio.test',
    dni: '70123456',
    telefono: '999888777',
    roles: [{ codigo: 'area_financiera', nombre: 'Área Financiera' }],
    obras: [{ id: 1, codigo: 'OB-01', nombre: 'Mejoramiento Vía Huancayo' }],
    almacenes: [{ id: 1, codigo: 'ALM-01', nombre: 'Almacén Central' }],
};

describe('PerfilPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('muestra la identidad y los alcances del usuario', () => {
        renderPagina(PerfilPage, { perfil });

        expect(screen.getAllByText('Mi Perfil')[0]).toBeTruthy();
        expect(
            screen.getAllByText('ana.torres@consorcio.test')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('70123456')[0]).toBeTruthy();
        expect(screen.getAllByText('Área Financiera')[0]).toBeTruthy();
        expect(screen.getAllByText('OB-01')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('ALM-01')[0]).toBeTruthy();
        expect(screen.getAllByText('Almacén Central')[0]).toBeTruthy();
        expect(
            (screen.getByLabelText(/^Nombre y Apellidos/) as HTMLInputElement)
                .value,
        ).toBe('Ana Torres');
    });

    it('muestra los vacíos de un perfil sin alcances', () => {
        renderPagina(PerfilPage, {
            perfil: {
                ...perfil,
                dni: null,
                roles: [],
                obras: [],
                almacenes: [],
            },
        });

        expect(screen.getAllByText('Sin rol asignado')[0]).toBeTruthy();
        expect(screen.getByText('Sin obras asignadas.')).toBeTruthy();
        expect(screen.getByText('Sin almacenes asignados.')).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('valida el nombre antes de guardar los datos', () => {
        renderPagina(PerfilPage, { perfil });

        fireEvent.change(screen.getByLabelText(/^Nombre y Apellidos/), {
            target: { value: '   ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Guardar cambios/ }),
        );

        expect(screen.getByText('Ingresa tu nombre.')).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('actualiza los datos de contacto', () => {
        renderPagina(PerfilPage, { perfil });

        fireEvent.change(screen.getByLabelText(/^Nombre y Apellidos/), {
            target: { value: '  Ana Torres Ríos  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Teléfono/), {
            target: { value: '   ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Guardar cambios/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'patch',
                url: '/perfil',
                datos: { name: 'Ana Torres Ríos', telefono: null },
            }),
        );
        expect(
            screen.getByText('Tus datos fueron actualizados.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({ only: ['perfil'] });
    });

    it('valida la contraseña actual y su confirmación', () => {
        renderPagina(PerfilPage, { perfil });

        const enviar = screen.getByRole('button', {
            name: /Actualizar contraseña/,
        });

        fireEvent.click(enviar);
        expect(
            screen.getByText('Ingresa tu contraseña actual.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Contraseña actual/), {
            target: { value: 'actual-123' },
        });
        fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), {
            target: { value: 'Nueva-1234' },
        });
        fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), {
            target: { value: 'Nueva-9999' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText(
                'La confirmación no coincide con la nueva contraseña.',
            ),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('cambia la contraseña cuando la confirmación coincide', () => {
        renderPagina(PerfilPage, { perfil });

        fireEvent.change(screen.getByLabelText(/^Contraseña actual/), {
            target: { value: 'actual-123' },
        });
        fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), {
            target: { value: 'Nueva-1234' },
        });
        fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), {
            target: { value: 'Nueva-1234' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Actualizar contraseña/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'patch',
                url: '/perfil/password',
                datos: {
                    current_password: 'actual-123',
                    password: 'Nueva-1234',
                    password_confirmation: 'Nueva-1234',
                },
            }),
        );
        expect(
            screen.getByText('Tu contraseña fue actualizada.'),
        ).toBeTruthy();
        expect(
            (screen.getByLabelText(/^Contraseña actual/) as HTMLInputElement)
                .value,
        ).toBe('');
    });
});
