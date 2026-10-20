import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import AuditoriaPage from '../../pages/AuditoriaPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { router, setPageProps } from '../mocks/inertia';

const paginador = {
    data: [
        {
            id: 1,
            accion: 'CREATE',
            entidad: 'material',
            entidad_id: 5,
            ip: '10.0.0.1',
            antes: null,
            despues: { nombre: 'Cemento Portland' },
            created_at: '2026-01-15T10:00:00.000Z',
            usuario: { name: 'Ana Torres', email: 'ana@consorcio.test' },
        },
        {
            id: 2,
            accion: 'UPDATE',
            entidad: 'obra',
            entidad_id: null,
            ip: null,
            antes: { descripcion: 'x'.repeat(200) },
            despues: null,
            created_at: '2026-01-16T10:00:00.000Z',
            usuario: null,
        },
    ],
    current_page: 1,
    last_page: 2,
    per_page: 20,
    total: 40,
    from: 1,
    to: 2,
};

const usuarios = [
    { id: '7', nombre: 'Ana Torres', email: 'ana@consorcio.test' },
];
const modulos = [{ codigo: 'materiales', nombre: 'Materiales' }];

describe('AuditoriaPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista los registros con usuario, entidad e IP', () => {
        renderPagina(AuditoriaPage, {
            auditoriaDb: paginador,
            usuariosDb: usuarios,
            modulosDb: modulos,
        });

        expect(
            screen.getAllByText('Bitácora y Trazabilidad de Auditoría')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('ana@consorcio.test')[0]).toBeTruthy();
        expect(screen.getAllByText('Sistema')[0]).toBeTruthy();
        expect(screen.getAllByText('CREATE')[0]).toBeTruthy();
        expect(screen.getAllByText('UPDATE')[0]).toBeTruthy();
        expect(screen.getAllByText('material #5')[0]).toBeTruthy();
        expect(screen.getAllByText('obra')[0]).toBeTruthy();
        expect(screen.getAllByText('10.0.0.1')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        expect(
            screen.getAllByText((contenido) => contenido.endsWith('…')).length,
        ).toBeGreaterThan(0);
    });

    it('muestra el estado vacío sin registros', () => {
        renderPagina(AuditoriaPage, {
            auditoriaDb: { ...paginador, data: [], total: 0 },
        });

        expect(screen.getByText('Sin registros de auditoría')).toBeTruthy();
    });

    it('navega a la página siguiente y deshabilita Anterior en la primera', () => {
        renderPagina(AuditoriaPage, { auditoriaDb: paginador });

        expect(screen.getByText('Página 1 de 2')).toBeTruthy();
        expect(screen.getByText('Mostrando 1–2 de 40 registros')).toBeTruthy();
        expect(
            (
                screen.getByRole('button', {
                    name: 'Anterior',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

        expect(router.get).toHaveBeenCalledWith(
            '/admin/auditoria',
            { usuario_id: '', modulo: '', page: 2 },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['auditoriaDb'],
            },
        );
    });

    it('filtra por usuario y limpia los filtros', () => {
        renderPagina(AuditoriaPage, {
            auditoriaDb: paginador,
            usuariosDb: usuarios,
            modulosDb: modulos,
        });

        fireEvent.change(screen.getByLabelText('Usuario'), {
            target: { value: '7' },
        });
        expect(router.get).toHaveBeenCalledWith(
            '/admin/auditoria',
            { usuario_id: '7', modulo: '', page: 1 },
            expect.objectContaining({ only: ['auditoriaDb'] }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Limpiar filtros' }),
        );

        expect(router.get).toHaveBeenLastCalledWith(
            '/admin/auditoria',
            { usuario_id: '', modulo: '', page: 1 },
            expect.objectContaining({ only: ['auditoriaDb'] }),
        );
    });

    it('arranca con los filtros recibidos y muestra las opciones', () => {
        renderPagina(AuditoriaPage, {
            auditoriaDb: paginador,
            usuariosDb: usuarios,
            modulosDb: modulos,
            filtros: { usuario_id: '7', modulo: 'materiales' },
        });

        expect(screen.getAllByText('Ana Torres')[0]).toBeTruthy();
        expect(screen.getAllByText('Materiales')[0]).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Limpiar filtros' }),
        ).toBeTruthy();
        expect(
            (screen.getByLabelText('Usuario') as HTMLSelectElement).value,
        ).toBe('7');
        expect(
            (screen.getByLabelText('Módulo') as HTMLSelectElement).value,
        ).toBe('materiales');
    });
});
