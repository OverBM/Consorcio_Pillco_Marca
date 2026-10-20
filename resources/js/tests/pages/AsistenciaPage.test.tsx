import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AsistenciaPage from '../../pages/AsistenciaPage';
import { formatFs, formatNum } from '../../utils/format';
import { propsBase } from '../fixtures';
import { renderPagina } from '../harness';
import { llamadasHttp, router, setPageProps } from '../mocks/inertia';

const asistencias = [
    {
        id: 1,
        fecha: '2026-02-10T13:00:00.000Z',
        horas_trabajadas: 8,
        inconsistencia: null,
        estado: 'conforme',
        trabajador: { id: 1, nombres: 'Juan Ramos', cargo: 'Operario' },
        obra: { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    },
    {
        id: 2,
        fecha: '2026-02-11T13:00:00.000Z',
        horas_trabajadas: '7.5',
        inconsistencia: 'tardanza',
        estado: 'observada',
        trabajador: null,
        obra: null,
    },
];

const obras = [
    { id: 1, nombre: 'Mejoramiento Vía Huancayo' },
    { id: 2, nombre: 'Ampliación Puente' },
];

const trabajadores = [
    { id: 1, nombres: 'Juan Ramos', cargo: 'Operario', obra_id: 1 },
    { id: 2, nombres: 'María Soto', cargo: null, obra_id: null },
    { id: 3, nombres: 'Pedro León', cargo: 'Topógrafo', obra_id: 2 },
];

function props(datos: Record<string, unknown> = {}) {
    return {
        asistenciasDb: asistencias,
        obrasDb: obras,
        trabajadoresDb: trabajadores,
        ...datos,
    };
}

function conGeolocalizacion(
    getCurrentPosition: (ok: PositionCallback, error?: PositionErrorCallback) => void,
) {
    Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: { getCurrentPosition },
    });
}

describe('AsistenciaPage', () => {
    beforeEach(() => {
        setPageProps(propsBase());
    });

    afterEach(() => {
        delete (navigator as { geolocation?: unknown }).geolocation;
    });

    it('resume el consolidado y lista las marcaciones', () => {
        renderPagina(AsistenciaPage, props());

        expect(
            screen.getAllByText('Control de Asistencia con Geocerca Móvil (GPS)')[0],
        ).toBeTruthy();
        expect(screen.getByText('Asistencias Registradas').closest('div')?.textContent).toContain('2');
        expect(
            screen.getAllByText(formatNum(15.5))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Juan Ramos')[0]).toBeTruthy();
        expect(screen.getAllByText('Operario')[0]).toBeTruthy();
        expect(
            screen.getAllByText('Mejoramiento Vía Huancayo')[0],
        ).toBeTruthy();
        expect(
            screen.getAllByText(formatFs('2026-02-10T13:00:00.000Z'))[0],
        ).toBeTruthy();
        expect(screen.getAllByText('Conforme')[0]).toBeTruthy();
        expect(screen.getAllByText('TARDANZA')[0]).toBeTruthy();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('muestra el estado vacío', () => {
        renderPagina(AsistenciaPage, props({ asistenciasDb: [] }));

        expect(screen.getByText('Sin asistencias registradas')).toBeTruthy();
    });

    it('avisa cuando el navegador no expone geolocalización', () => {
        renderPagina(AsistenciaPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Marcar Asistencia GPS/ }),
        );

        expect(
            screen.getByText(
                'La geolocalización no está disponible en este navegador.',
            ),
        ).toBeTruthy();
        expect(screen.getByText('Registrar Marcación con Geocerca')).toBeTruthy();
        expect(
            screen.getByText(
                'Pulsa "Recalcular GPS" para capturar tu ubicación.',
            ),
        ).toBeTruthy();
    });

    it('informa el error al no poder capturar el GPS', () => {
        conGeolocalizacion((_ok, error) => error?.({
            code: 1,
            message: 'denegado',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
        } as GeolocationPositionError));
        renderPagina(AsistenciaPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Marcar Asistencia GPS/ }),
        );

        expect(
            screen.getByText(
                'No se pudo obtener la ubicación. Activa el GPS e inténtalo de nuevo.',
            ),
        ).toBeTruthy();
    });

    it('valida trabajador, obra y GPS', () => {
        renderPagina(AsistenciaPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Marcar Asistencia GPS/ }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: /Confirmar Marcación/ }),
        );
        expect(
            screen.getByText('Selecciona al trabajador que marca.'),
        ).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Trabajador/), {
            target: { value: '1' },
        });
        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Confirmar Marcación/ }),
        );
        expect(screen.getByText('Selecciona la obra.')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Confirmar Marcación/ }),
        );
        expect(
            screen.getByText('Captura tu ubicación GPS antes de confirmar.'),
        ).toBeTruthy();
        expect(llamadasHttp).toHaveLength(0);
    });

    it('registra la marcación con coordenadas capturadas', () => {
        conGeolocalizacion((ok) =>
            ok({
                coords: { latitude: -12.046374, longitude: -75.204586 },
            } as GeolocationPosition),
        );
        renderPagina(AsistenciaPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Marcar Asistencia GPS/ }),
        );
        expect(screen.getByText('Señal GPS capturada')).toBeTruthy();
        expect(screen.getByText('-12.046374')).toBeTruthy();
        expect(screen.getByText('-75.204586')).toBeTruthy();

        fireEvent.change(screen.getByLabelText(/^Trabajador/), {
            target: { value: '2' },
        });
        fireEvent.change(screen.getByLabelText(/^Tipo de Marcación/), {
            target: { value: 'salida' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /Confirmar Marcación/ }),
        );

        expect(llamadasHttp).toContainEqual(
            expect.objectContaining({
                metodo: 'post',
                url: '/api/v1/personal/marcaciones',
                datos: {
                    trabajador_id: 2,
                    obra_id: 1,
                    tipo: 'salida',
                    latitud: -12.046374,
                    longitud: -75.204586,
                },
            }),
        );
        expect(
            screen.getByText('Marcación registrada con validación de geocerca.'),
        ).toBeTruthy();
        expect(router.reload).toHaveBeenCalledWith({
            only: ['asistenciasDb'],
        });
        expect(screen.queryByText('Registrar Marcación con Geocerca')).toBeNull();
    });

    it('filtra trabajadores por la obra seleccionada', () => {
        renderPagina(AsistenciaPage, props());

        fireEvent.click(
            screen.getByRole('button', { name: /Marcar Asistencia GPS/ }),
        );
        const opciones = () =>
            Array.from(
                (screen.getByLabelText(/^Trabajador/) as HTMLSelectElement)
                    .options,
            ).map((o) => o.textContent);

        expect(opciones()).toContain('Juan Ramos — Operario');
        expect(opciones()).toContain('María Soto');
        expect(opciones()).not.toContain('Pedro León — Topógrafo');

        fireEvent.change(screen.getByLabelText(/^Obra/), {
            target: { value: '2' },
        });

        expect(opciones()).toContain('Pedro León — Topógrafo');
        expect(opciones()).toContain('María Soto');
        expect(opciones()).not.toContain('Juan Ramos — Operario');
    });
});
