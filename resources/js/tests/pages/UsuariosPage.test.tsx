import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import UsuariosPage from '../../pages/UsuariosPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const roles = [
    { codigo: 'admin', nombre: 'Administrador' },
    { codigo: 'residente', nombre: 'Residente de Obra' },
];

const usuarios = [
    {
        id: '1',
        nombre: 'Ana Torres',
        email: 'ana@consorcio.test',
        dni: '70123456',
        telefono: null,
        rol: 'Administrador',
        rol_codigo: 'admin',
        obra: 'Mejoramiento Vía Huancayo',
        obra_id: 1,
        activo: true,
        estado: 'activo',
    },
    {
        id: '2',
        nombre: 'Luis Paredes',
        email: 'luis@consorcio.test',
        dni: null,
        telefono: '999888777',
        rol: 'Residente',
        rol_codigo: 'residente',
        obra: 'Todas',
        obra_id: null,
        activo: false,
        estado: 'inactivo',
    },
];

describe('UsuariosPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista los usuarios con rol y estado', () => {
        renderPagina(UsuariosPage, {
            usuariosDb: usuarios,
            rolesDb: roles,
        });

        expect(
            screen.getAllByText('Usuarios y Control de Acceso (RBAC)')[0],
        ).toBeTruthy();
        expect(screen.getByText('Usuarios Registrados (2)')).toBeTruthy();
        expect(screen.getAllByText('Ana Torres')[0]).toBeTruthy();
        expect(screen.getAllByText('ana@consorcio.test')[0]).toBeTruthy();
        expect(screen.getAllByText('Administrador')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Activo')[0]).toBeTruthy();
        expect(screen.getAllByText('Inactivo')[0]).toBeTruthy();
        expect(screen.getAllByText('Todas')[0]).toBeTruthy();
        expect(screen.getAllByText('Editar')[0]).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(UsuariosPage, { usuariosDb: [], rolesDb: roles });

        expect(screen.getByText('Sin usuarios registrados')).toBeTruthy();
        expect(screen.getByText('Usuarios Registrados (0)')).toBeTruthy();
    });

    it('valida nombre, correo y contraseña', () => {
        renderPagina(UsuariosPage, {
            usuariosDb: usuarios,
            rolesDb: roles,
        });

        const enviar = screen.getByRole('button', {
            name: /Registrar Usuario/,
        });

        fireEvent.click(enviar);
        expect(
            screen.getByText('Ingresa el nombre del usuario.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Nombre y Apellidos/), {
            target: { value: 'Carlos Mendoza' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('Ingresa el correo corporativo.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Correo Corporativo/), {
            target: { value: 'carlos@pillco.pe' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('La contraseña debe tener al menos 8 caracteres.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('valida que se seleccione un rol', () => {
        renderPagina(UsuariosPage, { usuariosDb: [], rolesDb: [] });

        fireEvent.change(screen.getByLabelText(/^Nombre y Apellidos/), {
            target: { value: 'Carlos Mendoza' },
        });
        fireEvent.change(screen.getByLabelText(/^Correo Corporativo/), {
            target: { value: 'carlos@pillco.pe' },
        });
        fireEvent.change(screen.getByLabelText(/^Contraseña/), {
            target: { value: 'secreto123' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Usuario/ }),
        );

        expect(screen.getByText('Selecciona el rol asignado.')).toBeTruthy();
    });

    it('registra un usuario con los campos opcionales en null', () => {
        renderPagina(UsuariosPage, {
            usuariosDb: usuarios,
            rolesDb: roles,
        });

        fireEvent.change(screen.getByLabelText(/^Nombre y Apellidos/), {
            target: { value: '  Carlos Mendoza  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Correo Corporativo/), {
            target: { value: ' carlos@pillco.pe ' },
        });
        fireEvent.change(screen.getByLabelText(/^Contraseña/), {
            target: { value: 'secreto123' },
        });
        fireEvent.change(screen.getByLabelText(/^DNI/), {
            target: { value: ' 70123456 ' },
        });
        fireEvent.change(screen.getByLabelText(/^Rol Asignado/), {
            target: { value: 'residente' },
        });
        fireEvent.change(screen.getByLabelText(/^Obra \/ Alcance/), {
            target: { value: '' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Usuario/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/usuarios',
                datos: {
                    name: 'Carlos Mendoza',
                    email: 'carlos@pillco.pe',
                    password: 'secreto123',
                    dni: '70123456',
                    telefono: null,
                    rol_codigo: 'residente',
                    obra_id: null,
                    activo: true,
                },
            }),
        );
        expect(
            screen.getByText('Usuario registrado exitosamente.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({ only: ['usuariosDb'] });
    });

    it('edita un usuario conservando la contraseña si se deja vacía', () => {
        renderPagina(UsuariosPage, {
            usuariosDb: usuarios,
            rolesDb: roles,
        });

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        expect(screen.getByText('Editar Usuario')).toBeTruthy();
        expect(
            screen.getAllByText('ana@consorcio.test').length,
        ).toBeGreaterThan(0);

        fireEvent.change(screen.getAllByLabelText(/^Nombre y Apellidos/).at(-1) as HTMLElement, {
            target: { value: 'Ana Torres Ríos' },
        });
        fireEvent.change(screen.getAllByLabelText(/^Estado/).at(-1) as HTMLElement, {
            target: { value: 'inactivo' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Guardar Cambios/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'put',
                url: '/api/v1/usuarios/1',
                datos: {
                    name: 'Ana Torres Ríos',
                    email: 'ana@consorcio.test',
                    password: null,
                    rol_codigo: 'admin',
                    obra_id: 1,
                    activo: false,
                },
            }),
        );
        expect(
            screen.getByText('Usuario actualizado exitosamente.'),
        ).toBeTruthy();
        expect(screen.queryByText('Editar Usuario')).toBeNull();
        expect(router.reload).toHaveBeenCalledWith({ only: ['usuariosDb'] });
    });

    it('cierra la edición con Cancelar', () => {
        renderPagina(UsuariosPage, {
            usuariosDb: usuarios,
            rolesDb: roles,
        });

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Editar Usuario')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
