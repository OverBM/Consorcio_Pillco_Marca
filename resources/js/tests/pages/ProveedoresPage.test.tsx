import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import ProveedoresPage from '../../pages/ProveedoresPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const proveedores = [
    {
        id: 1,
        ruc: '20123456789',
        razon_social: 'Ferretería Andina SAC',
        contacto: 'Luis Quispe',
        telefono: '999888777',
        email: 'ventas@andina.pe',
        direccion: 'Av. Lima 123',
        calificacion: '4.5',
        activo: true,
    },
    {
        id: 2,
        ruc: '20987654321',
        razon_social: 'Aceros del Sur EIRL',
        contacto: null,
        telefono: null,
        email: null,
        direccion: null,
        calificacion: null,
        activo: false,
    },
];

const textoContenido = (esperado: string) => {
    return (_contenido: string, elemento: Element | null) =>
        elemento?.textContent === esperado;
};

describe('ProveedoresPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('resume los indicadores y lista los proveedores', () => {
        renderPagina(ProveedoresPage, { proveedoresDb: proveedores });

        expect(
            screen.getAllByText('Directorio y Homologación de Proveedores')[0],
        ).toBeTruthy();
        expect(
            screen.getByText('Proveedores Registrados').closest('div')
                ?.textContent,
        ).toContain('2');
        expect(screen.getAllByText('20123456789')[0]).toBeTruthy();
        expect(screen.getAllByText('Ferretería Andina SAC')[0]).toBeTruthy();
        expect(screen.getAllByText('Luis Quispe')[0]).toBeTruthy();
        expect(screen.getAllByText('★ 4.5')[0]).toBeTruthy();
        expect(screen.getAllByText('Homologado')[0]).toBeTruthy();
        expect(screen.getAllByText('Inactivo')[0]).toBeTruthy();
        expect(
            screen.getByText(textoContenido('4.50 / 5.0')),
        ).toBeTruthy();
    });

    it('muestra el estado vacío y promedio cero', () => {
        renderPagina(ProveedoresPage, { proveedoresDb: [] });

        expect(screen.getByText('Sin proveedores registrados')).toBeTruthy();
        expect(
            screen.getByText(textoContenido('0.00 / 5.0')),
        ).toBeTruthy();
    });

    it('busca por RUC, razón social o contacto', () => {
        renderPagina(ProveedoresPage, { proveedoresDb: proveedores });

        const buscador = screen.getByPlaceholderText(
            'Buscar por RUC, razón social o contacto…',
        );

        fireEvent.change(buscador, { target: { value: 'aceros' } });
        expect(screen.getAllByText('Aceros del Sur EIRL')[0]).toBeTruthy();
        expect(screen.queryAllByText('Ferretería Andina SAC')).toHaveLength(0);
        expect(
            screen.getByText(textoContenido('Mostrando 1 de 2 proveedores'), {
                selector: 'span',
            }),
        ).toBeTruthy();

        fireEvent.change(buscador, { target: { value: '20123456789' } });
        expect(screen.getAllByText('Ferretería Andina SAC')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'luis' } });
        expect(screen.getAllByText('Ferretería Andina SAC')[0]).toBeTruthy();

        fireEvent.change(buscador, { target: { value: 'inexistente' } });
        expect(
            screen.getByText(
                'No hay proveedores que coincidan con la búsqueda.',
            ),
        ).toBeTruthy();
    });

    it('valida RUC y razón social', () => {
        renderPagina(ProveedoresPage, { proveedoresDb: proveedores });

        fireEvent.click(
            screen.getByRole('button', { name: /Homologar Proveedor/ }),
        );
        expect(screen.getByText('Homologar Nuevo Proveedor')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Registrar/ }));
        expect(
            screen.getAllByText('El RUC debe tener 11 dígitos.')[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^RUC/), {
            target: { value: '2012345678' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Registrar/ }));
        expect(
            screen.getAllByText('El RUC debe tener 11 dígitos.')[0],
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^RUC/), {
            target: { value: '20-123456789' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Registrar/ }));
        expect(
            screen.getByText('Ingresa la razón social del proveedor.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra un proveedor limpio y cierra el modal', () => {
        renderPagina(ProveedoresPage, { proveedoresDb: proveedores });

        fireEvent.click(
            screen.getByRole('button', { name: /Homologar Proveedor/ }),
        );
        fireEvent.change(screen.getByLabelText(/^RUC/), {
            target: { value: '20123456789' },
        });
        fireEvent.change(screen.getByLabelText(/^Razón Social/), {
            target: { value: 'Aceros del Perú SAC' },
        });
        fireEvent.change(screen.getByLabelText(/^Teléfono/), {
            target: { value: '987654321' },
        });
        fireEvent.change(screen.getByLabelText(/^Dirección/), {
            target: { value: 'Av. Industrial 456' },
        });
        fireEvent.change(screen.getByLabelText(/^Calificación/), {
            target: { value: '4.2' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Registrar/ }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/proveedores',
                datos: {
                    ruc: '20123456789',
                    razon_social: 'Aceros del Perú SAC',
                    contacto: null,
                    telefono: '987654321',
                    email: null,
                    direccion: 'Av. Industrial 456',
                    calificacion: 4.2,
                },
            }),
        );
        expect(screen.getByText('Proveedor registrado.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['proveedoresDb'],
        });
        expect(screen.queryByText('Homologar Nuevo Proveedor')).toBeNull();
    });

    it('cierra el modal con Cancelar', () => {
        renderPagina(ProveedoresPage, { proveedoresDb: proveedores });

        fireEvent.click(
            screen.getByRole('button', { name: /Homologar Proveedor/ }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Homologar Nuevo Proveedor')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
