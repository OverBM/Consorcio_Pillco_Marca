import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SolicitudesAccesoPage from '../../pages/SolicitudesAccesoPage';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import {
    llamadasHttp,
    respuestaHttp,
    router,
    setPageProps,
} from '../mocks/inertia';

const solicitudes = [
    {
        id: '11',
        nombre_completo: 'Luis Paredes',
        email: 'luis@externo.test',
        dni: '70111222',
        telefono: '999888777',
        empresa: 'Constructora Andina',
        ruc: '20555666777',
        cargo: 'Residente',
        rol_solicitado: 'supervisor',
        motivo: 'Apoyo en supervisión de obra',
        estado: 'pendiente',
        notas_revision: null,
        revisado_por: null,
        revisado_en: null,
        creada_en: '2026-01-10 09:00',
    },
    {
        id: '12',
        nombre_completo: 'Rosa Quispe',
        email: 'rosa@externo.test',
        dni: null,
        telefono: null,
        empresa: null,
        ruc: null,
        cargo: null,
        rol_solicitado: 'almacenero',
        motivo: 'Control de almacén',
        estado: 'aprobada',
        notas_revision: 'Documentación completa',
        revisado_por: 'Ana Torres',
        revisado_en: '2026-01-11 10:00',
        creada_en: '2026-01-09 08:00',
    },
];

describe('SolicitudesAccesoPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('lista las solicitudes y el conteo de pendientes', () => {
        renderPagina(SolicitudesAccesoPage, { solicitudesDb: solicitudes });

        expect(screen.getByText('Solicitudes de Acceso')).toBeTruthy();
        expect(
            screen.getByText('Solicitudes Recibidas (2) · 1 pendientes'),
        ).toBeTruthy();
        expect(screen.getAllByText('Luis Paredes')[0]).toBeTruthy();
        expect(screen.getAllByText('luis@externo.test')[0]).toBeTruthy();
        expect(screen.getAllByText('999888777')[0]).toBeTruthy();
        expect(screen.getAllByText('DNI 70111222')[0]).toBeTruthy();
        expect(screen.getAllByText('Constructora Andina')[0]).toBeTruthy();
        expect(screen.getAllByText('RUC 20555666777')[0]).toBeTruthy();
        expect(screen.getAllByText('Sin DNI')[0]).toBeTruthy();
        expect(screen.getAllByText('Sin RUC')[0]).toBeTruthy();
        expect(screen.getAllByText('por Ana Torres')[0]).toBeTruthy();
        expect(screen.getAllByText('Revisar')[0]).toBeTruthy();
        expect(screen.getAllByText('Revisada')[0]).toBeTruthy();
    });

    it('muestra el estado vacío sin solicitudes', () => {
        renderPagina(SolicitudesAccesoPage, { solicitudesDb: [] });

        expect(screen.getByText('Sin solicitudes registradas')).toBeTruthy();
        expect(
            screen.getByText('Solicitudes Recibidas (0) · 0 pendientes'),
        ).toBeTruthy();
    });

    it('aprueba una solicitud y muestra la contraseña temporal', async () => {
        const escribir = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: escribir },
            configurable: true,
        });
        respuestaHttp.data = {
            password_temporal: 'Temp-9981',
            usuario: { email: 'luis@externo.test', rol: 'supervisor' },
        };

        renderPagina(SolicitudesAccesoPage, { solicitudesDb: solicitudes });

        fireEvent.click(screen.getAllByText('Revisar')[0]);
        expect(screen.getByText('Revisar solicitud de acceso')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Notas de revisión/), {
            target: { value: 'Verificado con RRHH' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Aprobar y crear cuenta' }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes-acceso/11/aprobar',
                datos: { notas_revision: 'Verificado con RRHH' },
            }),
        );
        expect(
            screen.getByText('Solicitud aprobada y cuenta creada.'),
        ).toBeTruthy();
        expect(
            screen.getByText('Cuenta creada — contraseña temporal'),
        ).toBeTruthy();
        expect(screen.getByText('Temp-9981')).toBeTruthy();
        expect(screen.getAllByText('luis@externo.test')[0]).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Copiar contraseña' }),
        );
        expect(escribir).toHaveBeenCalledWith('Temp-9981');
        expect(
            await screen.findByText('Contraseña temporal copiada.'),
        ).toBeTruthy();

        fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[1]);
        expect(
            screen.queryByText('Cuenta creada — contraseña temporal'),
        ).toBeNull();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['solicitudesDb'],
        });
    });

    it('avisa cuando no se puede copiar la contraseña', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        respuestaHttp.data = { password_temporal: 'Temp-1' };

        renderPagina(SolicitudesAccesoPage, { solicitudesDb: solicitudes });

        fireEvent.click(screen.getAllByText('Revisar')[0]);
        fireEvent.click(
            screen.getByRole('button', { name: 'Aprobar y crear cuenta' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Copiar contraseña' }),
        );

        expect(
            await screen.findByText(
                'No se pudo copiar automáticamente. Selecciona y copia la contraseña.',
            ),
        ).toBeTruthy();
    });

    it('rechaza una solicitud desde el modal', () => {
        renderPagina(SolicitudesAccesoPage, { solicitudesDb: solicitudes });

        fireEvent.click(screen.getAllByText('Revisar')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/solicitudes-acceso/11/rechazar',
                datos: { notas_revision: undefined },
            }),
        );
        expect(screen.getByText('Solicitud rechazada.')).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['solicitudesDb'],
        });
    });

    it('cierra el modal de revisión con Cancelar', () => {
        renderPagina(SolicitudesAccesoPage, { solicitudesDb: solicitudes });

        fireEvent.click(screen.getAllByText('Revisar')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByText('Revisar solicitud de acceso')).toBeNull();
        expect(llamadasHttp).toHaveLength(0);
    });
});
