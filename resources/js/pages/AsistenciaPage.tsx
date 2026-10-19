// Control de Asistencia con Geocerca Móvil (GPS).
// Lista `asistenciasDb` (consolidado) y registra marcaciones vía `useHttp`
// contra `/api/v1/personal/marcaciones` con validación geodésica del backend.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Select } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatFs, formatNum } from '../utils/format';
import { IconCheckCircle, IconMapPin, IconRefresh } from '../components/icons';

interface AsistenciaDb {
    id: number;
    fecha: string;
    horas_trabajadas: number | string;
    inconsistencia: string | null;
    estado: string;
    trabajador?: { id: number; nombres: string; cargo: string | null } | null;
    obra?: { id: number; nombre: string } | null;
}

interface ObraDb {
    id: number;
    nombre: string;
}

interface TrabajadorDb {
    id: number;
    nombres: string;
    cargo: string | null;
    obra_id: number | null;
}

interface AsistenciaPageProps {
    asistenciasDb?: AsistenciaDb[];
    obrasDb?: ObraDb[];
    trabajadoresDb?: TrabajadorDb[];
}

type AsistenciaFila = Omit<AsistenciaDb, 'id'> & { id: string };

export default function AsistenciaPage({
    asistenciasDb = [],
    obrasDb = [],
    trabajadoresDb = [],
}: AsistenciaPageProps) {
    const notify = useNotifications();
    const [modal, setModal] = useState(false);
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsCargando, setGpsCargando] = useState(false);

    const marcar = useHttp<{
        trabajador_id: string;
        obra_id: string;
        tipo: 'entrada' | 'salida';
    }>({
        trabajador_id: '',
        obra_id: obrasDb[0] ? String(obrasDb[0].id) : '',
        tipo: 'entrada',
    });

    const filas: AsistenciaFila[] = useMemo(
        () => asistenciasDb.map((a) => ({ ...a, id: String(a.id) })),
        [asistenciasDb],
    );

    const totalHoras = useMemo(
        () =>
            filas.reduce((acc, a) => acc + Number(a.horas_trabajadas ?? 0), 0),
        [filas],
    );
    const inconsistencias = useMemo(
        () => filas.filter((a) => a.inconsistencia).length,
        [filas],
    );

    const trabajadoresFiltrados = useMemo(() => {
        if (!marcar.data.obra_id) return trabajadoresDb;
        return trabajadoresDb.filter(
            (t) => !t.obra_id || String(t.obra_id) === marcar.data.obra_id,
        );
    }, [trabajadoresDb, marcar.data.obra_id]);

    const capturarGps = () => {
        if (!('geolocation' in navigator)) {
            notify.error(
                'La geolocalización no está disponible en este navegador.',
            );
            return;
        }

        setGpsCargando(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsCargando(false);
            },
            () => {
                setGpsCargando(false);
                notify.error(
                    'No se pudo obtener la ubicación. Activa el GPS e inténtalo de nuevo.',
                );
            },
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    const abrirModal = () => {
        setModal(true);
        setGps(null);
        capturarGps();
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!marcar.data.trabajador_id) {
            notify.error('Selecciona al trabajador que marca.');
            return;
        }
        if (!marcar.data.obra_id) {
            notify.error('Selecciona la obra.');
            return;
        }
        if (!gps) {
            notify.error('Captura tu ubicación GPS antes de confirmar.');
            return;
        }

        marcar.transform(() => ({
            trabajador_id: Number(marcar.data.trabajador_id),
            obra_id: Number(marcar.data.obra_id),
            tipo: marcar.data.tipo,
            latitud: gps.lat,
            longitud: gps.lng,
        }));

        void marcar.post('/api/v1/personal/marcaciones', {
            onSuccess: () => {
                notify.success(
                    'Marcación registrada con validación de geocerca.',
                );
                setModal(false);
                setGps(null);
                marcar.setData({
                    trabajador_id: '',
                    obra_id: obrasDb[0] ? String(obrasDb[0].id) : '',
                    tipo: 'entrada',
                });
                refrescarProps('asistenciasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo registrar la marcación.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Control de Asistencia con Geocerca Móvil (GPS)"
                subtitle="Validación geodésica de marcaciones en tiempo real dentro del radio perimetral (500m) del frente de obra"
                actions={
                    <Button variant="mint" onClick={abrirModal}>
                        <IconMapPin size={16} />
                        Marcar Asistencia GPS
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Asistencias Registradas
                    </span>
                    <p className="text-ink mt-1 font-mono text-2xl font-bold">
                        {filas.length}
                    </p>
                    <span className="text-muted text-xs">
                        Consolidado de los últimos 50 registros
                    </span>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Horas-Hombre Acumuladas
                    </span>
                    <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
                        {formatNum(totalHoras)}
                    </p>
                    <span className="text-muted text-xs">
                        Total de horas trabajadas registradas
                    </span>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Inconsistencias
                    </span>
                    <p className="mt-1 font-mono text-2xl font-bold text-amber-600">
                        {inconsistencias}
                    </p>
                    <span className="text-muted text-xs">
                        Requieren corrección del residente
                    </span>
                </Card>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-ink text-base font-bold">
                            Bitácora de Asistencia Consolidada
                        </h3>
                        <p className="text-muted text-xs">
                            Validación georreferenciada contra el radio
                            perimetral de obra
                        </p>
                    </div>
                </div>

                {filas.length === 0 ? (
                    <EmptyState
                        title="Sin asistencias registradas"
                        hint="Las marcaciones procesadas aparecerán aquí."
                    />
                ) : (
                    <DataTable
                        emptyLabel="Sin asistencias registradas."
                        columns={[
                            {
                                key: 'trabajador',
                                header: 'Trabajador / Personal',
                                cell: (a) => (
                                    <span className="text-ink font-bold">
                                        {a.trabajador?.nombres ?? '—'}
                                    </span>
                                ),
                            },
                            {
                                key: 'cargo',
                                header: 'Cargo',
                                cell: (a) => a.trabajador?.cargo ?? '—',
                            },
                            {
                                key: 'obra',
                                header: 'Obra',
                                cell: (a) => a.obra?.nombre ?? '—',
                            },
                            {
                                key: 'fecha',
                                header: 'Fecha',
                                mono: true,
                                cell: (a) => formatFs(a.fecha),
                            },
                            {
                                key: 'horas',
                                header: 'Horas',
                                align: 'right',
                                mono: true,
                                cell: (a) =>
                                    formatNum(Number(a.horas_trabajadas ?? 0)),
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                align: 'center',
                                cell: (a) =>
                                    a.inconsistencia ? (
                                        <Badge tone="warn">
                                            {a.inconsistencia.toUpperCase()}
                                        </Badge>
                                    ) : (
                                        <Badge tone="ok">Conforme</Badge>
                                    ),
                            },
                        ]}
                        rows={filas}
                    />
                )}
            </Card>

            <Modal
                open={modal}
                onClose={() => setModal(false)}
                title="Registrar Marcación con Geocerca"
            >
                <form onSubmit={enviar} className="space-y-4">
                    <Field label="Trabajador" required>
                        <Select
                            value={marcar.data.trabajador_id}
                            onChange={(e) =>
                                marcar.setData('trabajador_id', e.target.value)
                            }
                        >
                            <option value="">Selecciona trabajador…</option>
                            {trabajadoresFiltrados.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                    {t.nombres}
                                    {t.cargo ? ` — ${t.cargo}` : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Obra" required>
                            <Select
                                value={marcar.data.obra_id}
                                onChange={(e) =>
                                    marcar.setData('obra_id', e.target.value)
                                }
                            >
                                <option value="">Selecciona obra…</option>
                                {obrasDb.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Tipo de Marcación" required>
                            <Select
                                value={marcar.data.tipo}
                                onChange={(e) =>
                                    marcar.setData(
                                        'tipo',
                                        e.target.value as 'entrada' | 'salida',
                                    )
                                }
                            >
                                <option value="entrada">
                                    Entrada (Inicio de Jornada)
                                </option>
                                <option value="salida">
                                    Salida (Fin de Jornada)
                                </option>
                            </Select>
                        </Field>
                    </div>

                    <div className="bg-canvas border-line space-y-2 rounded-lg border p-3 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-ink font-bold">
                                Geolocalización del Dispositivo:
                            </span>
                            <button
                                type="button"
                                onClick={capturarGps}
                                className="text-brand-600 flex cursor-pointer items-center gap-1 font-bold hover:underline"
                            >
                                <IconRefresh
                                    size={12}
                                    className={
                                        gpsCargando ? 'animate-spin' : ''
                                    }
                                />
                                Recalcular GPS
                            </button>
                        </div>
                        {gps ? (
                            <div className="text-muted space-y-0.5 font-mono text-[11px]">
                                <p>
                                    Latitud:{' '}
                                    <span className="text-ink font-bold">
                                        {gps.lat.toFixed(6)}
                                    </span>
                                </p>
                                <p>
                                    Longitud:{' '}
                                    <span className="text-ink font-bold">
                                        {gps.lng.toFixed(6)}
                                    </span>
                                </p>
                                <span className="text-ok bg-ok-soft border-line mt-1 inline-block rounded border px-2 py-0.5 font-semibold">
                                    Señal GPS capturada
                                </span>
                            </div>
                        ) : (
                            <p className="text-muted italic">
                                {gpsCargando
                                    ? 'Obteniendo coordenadas…'
                                    : 'Pulsa "Recalcular GPS" para capturar tu ubicación.'}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => setModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="mint"
                            type="submit"
                            disabled={marcar.processing || gpsCargando}
                        >
                            <IconCheckCircle size={14} />
                            Confirmar Marcación
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
