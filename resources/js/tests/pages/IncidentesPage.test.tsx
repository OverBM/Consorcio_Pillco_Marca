import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import IncidentesPage from '../../pages/IncidentesPage';
import { formatFs } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const incidentes = [
    {
        id: 1,
        codigo: 'INC-001',
        tipo: 'accidente',
        gravedad: 'grave',
        ocurrido_en: '2026-02-10T13:00:00.000Z',
        descripcion: 'Caída de operario desde andamio',
        estado: 'abierto',
        requiere_traslado: true,
        trabajador: { id: 1, nombres: 'Juan Ramos' },
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    },
    {
        id: 2,
        codigo: 'INC-002',
        tipo: 'incidente',
        gravedad: 'leve',
        ocurrido_en: '2026-02-11T09:30:00.000Z',
        descripcion: 'Derrame menor de aceite',
        estado: 'cerrado',
        requiere_traslado: false,
        trabajador: null,
        obra: null,
    },
];

const trabajadores = [
    { id: 1, nombres: 'Juan Ramos', cargo: 'Operario', obra_id: 1 },
    { id: 2, nombres: 'María Soto', cargo: null, obra_id: null },
];

describe('IncidentesPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    it('resume y lista los incidentes SST', () => {
        renderPagina(IncidentesPage, {
            incidentesDb: incidentes,
            trabajadoresDb: trabajadores,
        });

        expect(
            screen.getAllByText('Registro de Incidentes y Accidentes SST')[0],
        ).toBeTruthy();
        expect(
            screen.getByText('Eventos Registrados').closest('div')?.textContent,
        ).toContain('2');
        expect(
            screen.getByText('Eventos Graves / Fatales').closest('div')
                ?.textContent,
        ).toContain('1');
        expect(
            screen.getByText('Investigaciones Abiertas').closest('div')
                ?.textContent,
        ).toContain('1');
        expect(screen.getByText('Incidentes (2)')).toBeTruthy();
        expect(screen.getAllByText('INC-001')[0]).toBeTruthy();
        expect(
            screen.getAllByText(formatFs('2026-02-10T13:00:00.000Z'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('ACCIDENTE')[0]).toBeTruthy();
        expect(screen.getAllByText('INCIDENTE')[0]).toBeTruthy();
        expect(screen.getAllByText('Juan Ramos')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Caída de operario desde andamio')[0],
        ).toBeTruthy();
        expect(screen.getAllByText('GRAVE')[0]).toBeTruthy();
        expect(screen.getAllByText('LEVE')[0]).toBeTruthy();
        expect(screen.getAllByText('ABIERTO')[0]).toBeTruthy();
        expect(screen.getAllByText('CERRADO')[0]).toBeTruthy();
        expect(screen.getAllByText('—')[0]).toBeTruthy();
    });

    it('muestra el estado vacío', () => {
        renderPagina(IncidentesPage, {
            incidentesDb: [],
            trabajadoresDb: trabajadores,
        });

        expect(screen.getByText('Sin incidentes registrados')).toBeTruthy();
        expect(screen.getByText('Incidentes (0)')).toBeTruthy();
    });

    it('valida obra, descripción y fecha del evento', () => {
        renderPagina(IncidentesPage, {
            incidentesDb: incidentes,
            trabajadoresDb: trabajadores,
        });

        const enviar = screen.getByRole('button', {
            name: /Registrar Incidente/,
        });

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '' },
        });
        fireEvent.click(enviar);
        expect(screen.getByText('Selecciona la obra del evento.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción del Evento/), {
            target: { value: '   ' },
        });
        fireEvent.click(enviar);
        expect(screen.getByText('Describe el evento ocurrido.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Descripción del Evento/), {
            target: { value: 'Caída en escalera' },
        });
        fireEvent.click(enviar);
        expect(
            screen.getByText('Indica la fecha y hora del evento.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra el incidente con traslado y causas opcionales', () => {
        renderPagina(IncidentesPage, {
            incidentesDb: incidentes,
            trabajadoresDb: trabajadores,
        });

        fireEvent.change(screen.getByLabelText(/^Tipo/), {
            target: { value: 'cuasi' },
        });
        fireEvent.change(screen.getByLabelText(/^Gravedad/), {
            target: { value: 'fatal' },
        });
        fireEvent.change(screen.getByLabelText(/^Personal Involucrado/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Fecha y Hora/), {
            target: { value: '2026-05-01T10:30' },
        });
        fireEvent.change(screen.getByLabelText(/^Descripción del Evento/), {
            target: { value: '  Caída de material  ' },
        });
        fireEvent.change(screen.getByLabelText(/^Causas básicas/), {
            target: { value: '   ' },
        });
        fireEvent.click(
            screen.getByLabelText(/Requiere traslado a centro médico/),
        );
        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Incidente/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/sst/incidentes',
                datos: {
                    obra_id: 1,
                    trabajador_id: 2,
                    tipo: 'cuasi',
                    gravedad: 'fatal',
                    ocurrido_en: '2026-05-01T10:30',
                    descripcion: 'Caída de material',
                    requiere_traslado: true,
                    causas: null,
                },
            }),
        );
        expect(
            screen.getByText('Incidente de seguridad registrado.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['incidentesDb'],
        });
    });
});
