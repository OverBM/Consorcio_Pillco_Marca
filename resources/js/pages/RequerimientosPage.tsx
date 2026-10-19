// Requerimientos de Compra (Macroproceso MP-16).
// Solicitud de materiales por obra con validación de partida y flujo de aprobación.
// Datos desde props `requerimientosDb`; alta y evaluación vía `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import {
    Field,
    Input,
    Select,
    Textarea,
    FormPanel,
    FormSection,
    SubmitButton,
} from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import type { Catalogos } from '../types';
import { IconCheck, IconPlus, IconSearch, IconX } from '../components/icons';

interface MaterialRef {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface RequerimientoDetalleDb {
    id: number;
    material_id: number;
    cantidad: number | string;
    cantidad_atendida: number | string;
    material?: MaterialRef | null;
}

interface RequerimientoDb {
    id: number;
    codigo: string;
    obra_id: number;
    almacen_id: number;
    prioridad: string;
    estado: string;
    justificacion: string;
    fecha_requerida: string | null;
    motivo_rechazo?: string | null;
    created_at: string;
    obra?: { id: number; nombre: string } | null;
    almacen?: { id: number; nombre: string } | null;
    detalles?: RequerimientoDetalleDb[];
}

interface RequerimientosPageProps {
    requerimientosDb?: RequerimientoDb[];
}

type RequerimientoFila = Omit<RequerimientoDb, 'id'> & { id: string };

interface LineaReq {
    material_id: string;
    cantidad: string;
}

const ESTADO_META: Record<
    string,
    { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }
> = {
    solicitado: { tone: 'warn', label: 'Solicitado' },
    aprobado: { tone: 'ok', label: 'Aprobado' },
    rechazado: { tone: 'danger', label: 'Rechazado' },
};

const PRIORIDAD_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral'> = {
    urgente: 'danger',
    alta: 'warn',
    normal: 'neutral',
    baja: 'neutral',
};

export default function RequerimientosPage({
    requerimientosDb = [],
}: RequerimientosPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props as unknown as {
        catalogos?: Catalogos;
    };
    const obras = catalogos?.obras ?? [];
    const almacenes = catalogos?.almacenes ?? [];
    const materiales = catalogos?.materiales ?? [];

    const crear = useHttp<{
        obra_id: string;
        almacen_id: string;
        prioridad: string;
        justificacion: string;
        fecha_requerida: string;
        detalles: LineaReq[];
    }>({
        obra_id: '',
        almacen_id: '',
        prioridad: 'normal',
        justificacion: '',
        fecha_requerida: '',
        detalles: [{ material_id: '', cantidad: '' }] as LineaReq[],
    });

    const evaluar = useHttp<{ estado: string; motivo_rechazo: string }>({
        estado: '',
        motivo_rechazo: '',
    });

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [rechazando, setRechazando] = useState<RequerimientoFila | null>(
        null,
    );

    const filas: RequerimientoFila[] = useMemo(
        () => requerimientosDb.map((r) => ({ ...r, id: String(r.id) })),
        [requerimientosDb],
    );

    const filtradas = useMemo(
        () =>
            filas.filter((r) => {
                if (filtroEstado !== 'todos' && r.estado !== filtroEstado)
                    return false;
                if (!busqueda.trim()) return true;
                const q = busqueda.toLowerCase();
                return (
                    r.codigo.toLowerCase().includes(q) ||
                    (r.obra?.nombre ?? '').toLowerCase().includes(q) ||
                    r.justificacion.toLowerCase().includes(q)
                );
            }),
        [filas, filtroEstado, busqueda],
    );

    const total = filas.length;
    const pendientes = filas.filter((r) => r.estado === 'solicitado').length;
    const aprobados = filas.filter((r) => r.estado === 'aprobado').length;
    const materialesTotales = filas.reduce(
        (acc, r) => acc + (r.detalles?.length ?? 0),
        0,
    );

    const almacenesObra = crear.data.obra_id
        ? almacenes.filter((a) => String(a.obra_id) === crear.data.obra_id)
        : almacenes;

    const setLinea = (indice: number, campo: keyof LineaReq, valor: string) =>
        crear.setData(
            'detalles',
            crear.data.detalles.map((l, i) =>
                i === indice ? { ...l, [campo]: valor } : l,
            ),
        );

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.obra_id || !crear.data.almacen_id) {
            notify.error('Selecciona la obra y el almacén.');
            return;
        }
        if (!crear.data.justificacion.trim()) {
            notify.error('Describe la justificación del requerimiento.');
            return;
        }

        const detalles = crear.data.detalles
            .filter((l) => l.material_id && Number(l.cantidad) > 0)
            .map((l) => ({
                material_id: Number(l.material_id),
                cantidad: Number(l.cantidad),
            }));

        if (detalles.length === 0) {
            notify.error(
                'Agrega al menos un material con cantidad mayor a cero.',
            );
            return;
        }

        crear.transform(() => ({
            obra_id: Number(crear.data.obra_id),
            almacen_id: Number(crear.data.almacen_id),
            prioridad: crear.data.prioridad,
            justificacion: crear.data.justificacion,
            fecha_requerida: crear.data.fecha_requerida || null,
            detalles,
        }));

        void crear.post('/api/v1/requerimientos', {
            onSuccess: () => {
                notify.success('Requerimiento registrado.');
                crear.setData({
                    obra_id: '',
                    almacen_id: '',
                    prioridad: 'normal',
                    justificacion: '',
                    fecha_requerida: '',
                    detalles: [{ material_id: '', cantidad: '' }],
                });
                refrescarProps('requerimientosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo registrar el requerimiento.',
                );
            },
        });
    };

    const aprobar = (fila: RequerimientoFila) => {
        evaluar.transform(() => ({ estado: 'aprobado', motivo_rechazo: '' }));
        void evaluar.post(`/api/v1/requerimientos/${fila.id}/evaluar`, {
            onSuccess: () => {
                notify.success('Requerimiento aprobado.');
                refrescarProps('requerimientosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo aprobar.',
                );
            },
        });
    };

    const rechazar = (event: FormEvent) => {
        event.preventDefault();
        if (!rechazando) return;
        if (!evaluar.data.motivo_rechazo.trim()) {
            notify.error('Indica el motivo del rechazo.');
            return;
        }

        evaluar.transform(() => ({
            estado: 'rechazado',
            motivo_rechazo: evaluar.data.motivo_rechazo,
        }));
        void evaluar.post(`/api/v1/requerimientos/${rechazando.id}/evaluar`, {
            onSuccess: () => {
                notify.success('Requerimiento rechazado.');
                setRechazando(null);
                evaluar.setData('motivo_rechazo', '');
                refrescarProps('requerimientosDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(
                    Object.values(errors).flat().join(' ') ||
                        'No se pudo rechazar.',
                );
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Requerimientos de Compra"
                subtitle="Solicitud de materiales por obra con flujo de aprobación de Jefatura de Logística"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Total
                    </span>
                    <p className="text-ink mt-1 font-mono text-2xl font-bold">
                        {total}
                    </p>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Pendientes
                    </span>
                    <p className="text-warn mt-1 font-mono text-2xl font-bold">
                        {pendientes}
                    </p>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Aprobados
                    </span>
                    <p className="text-ok mt-1 font-mono text-2xl font-bold">
                        {aprobados}
                    </p>
                </Card>
                <Card className="p-4">
                    <span className="text-muted font-mono text-xs uppercase">
                        Ítems solicitados
                    </span>
                    <p className="text-ink mt-1 font-mono text-2xl font-bold">
                        {materialesTotales}
                    </p>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[220px] flex-1">
                                <IconSearch
                                    size={16}
                                    className="text-muted absolute top-1/2 left-3 -translate-y-1/2"
                                />
                                <input
                                    type="text"
                                    placeholder="Buscar por código, obra o justificación…"
                                    value={busqueda}
                                    onChange={(e) =>
                                        setBusqueda(e.target.value)
                                    }
                                    className="border-line bg-canvas text-ink focus:ring-brand-500 w-full rounded-lg border py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:outline-none"
                                />
                            </div>
                            <Select
                                value={filtroEstado}
                                onChange={(e) =>
                                    setFiltroEstado(e.target.value)
                                }
                                aria-label="Filtrar estado"
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="solicitado">Solicitado</option>
                                <option value="aprobado">Aprobado</option>
                                <option value="rechazado">Rechazado</option>
                            </Select>
                            <span className="text-muted font-mono text-xs">
                                Mostrando {filtradas.length} de {total}
                            </span>
                        </div>
                    </Card>

                    <Card title={`Requerimientos (${filtradas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState
                                title="Sin requerimientos registrados"
                                hint="Crea el primero desde el panel lateral."
                            />
                        ) : (
                            <DataTable
                                emptyLabel="No hay requerimientos que coincidan con los filtros."
                                columns={[
                                    {
                                        key: 'codigo',
                                        header: 'Código',
                                        mono: true,
                                        cell: (r) => (
                                            <span className="text-ink font-semibold">
                                                {r.codigo}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'obra',
                                        header: 'Obra / Ítems',
                                        cell: (r) => (
                                            <div>
                                                <p className="text-ink text-xs font-semibold">
                                                    {r.obra?.nombre ??
                                                        `Obra #${r.obra_id}`}
                                                </p>
                                                <p className="text-muted text-[11px]">
                                                    {r.detalles?.length ?? 0}{' '}
                                                    ítem(s)
                                                </p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'prioridad',
                                        header: 'Prioridad',
                                        align: 'center',
                                        cell: (r) => (
                                            <Badge
                                                tone={
                                                    PRIORIDAD_TONE[
                                                        r.prioridad
                                                    ] ?? 'neutral'
                                                }
                                            >
                                                {r.prioridad}
                                            </Badge>
                                        ),
                                    },
                                    {
                                        key: 'fecha',
                                        header: 'Requerido para',
                                        mono: true,
                                        cell: (r) => r.fecha_requerida ?? '—',
                                    },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (r) => {
                                            const meta = ESTADO_META[
                                                r.estado
                                            ] ?? {
                                                tone: 'neutral' as const,
                                                label: r.estado,
                                            };
                                            return (
                                                <Badge tone={meta.tone}>
                                                    {meta.label}
                                                </Badge>
                                            );
                                        },
                                    },
                                    {
                                        key: 'acciones',
                                        header: 'Acciones',
                                        align: 'right',
                                        cell: (r) =>
                                            r.estado === 'solicitado' ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() =>
                                                            aprobar(r)
                                                        }
                                                        className="btn-secondary !px-2 !py-1 text-xs"
                                                        title="Aprobar requerimiento"
                                                    >
                                                        <IconCheck size={13} />{' '}
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setRechazando(r)
                                                        }
                                                        className="btn-secondary !text-danger !px-2 !py-1 text-xs"
                                                        title="Rechazar requerimiento"
                                                    >
                                                        <IconX size={13} />{' '}
                                                        Rechazar
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-muted text-[11px]">
                                                    {r.motivo_rechazo ?? '—'}
                                                </span>
                                            ),
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel
                    title="Nuevo Requerimiento"
                    subtitle="Solicitud de materiales por obra"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Destino" columns={1}>
                        <Field label="Obra" required>
                            <Select
                                value={crear.data.obra_id}
                                onChange={(e) => {
                                    crear.setData('obra_id', e.target.value);
                                    crear.setData('almacen_id', '');
                                }}
                            >
                                <option value="">Selecciona obra…</option>
                                {obras.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Almacén destino" required>
                            <Select
                                value={crear.data.almacen_id}
                                onChange={(e) =>
                                    crear.setData('almacen_id', e.target.value)
                                }
                            >
                                <option value="">Selecciona almacén…</option>
                                {almacenesObra.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Prioridad">
                                <Select
                                    value={crear.data.prioridad}
                                    onChange={(e) =>
                                        crear.setData(
                                            'prioridad',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="baja">Baja</option>
                                    <option value="normal">Normal</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </Select>
                            </Field>
                            <Field label="Requerido para">
                                <Input
                                    type="date"
                                    value={crear.data.fecha_requerida}
                                    onChange={(e) =>
                                        crear.setData(
                                            'fecha_requerida',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="Materiales" columns={1}>
                        <div className="space-y-2">
                            {crear.data.detalles.map((linea, i) => (
                                <div key={i} className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={linea.material_id}
                                            onChange={(e) =>
                                                setLinea(
                                                    i,
                                                    'material_id',
                                                    e.target.value,
                                                )
                                            }
                                            className="!py-1.5"
                                            aria-label="Material"
                                        >
                                            <option value="">Material…</option>
                                            {materiales.map((m) => (
                                                <option
                                                    key={m.id}
                                                    value={String(m.id)}
                                                >
                                                    {m.nombre} (
                                                    {m.unidad?.codigo ?? ''})
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={linea.cantidad}
                                        onChange={(e) =>
                                            setLinea(
                                                i,
                                                'cantidad',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Cant."
                                        className="field !w-24 !py-1.5"
                                        aria-label="Cantidad"
                                    />
                                    {crear.data.detalles.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                crear.setData(
                                                    'detalles',
                                                    crear.data.detalles.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                            aria-label="Quitar material"
                                            className="text-muted hover:bg-danger-soft hover:text-danger rounded p-2"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    crear.setData('detalles', [
                                        ...crear.data.detalles,
                                        { material_id: '', cantidad: '' },
                                    ])
                                }
                                className="text-brand-600 text-[11px] font-bold hover:underline"
                            >
                                + Añadir material
                            </button>
                        </div>
                    </FormSection>

                    <FormSection title="Justificación" columns={1}>
                        <Field label="Sustento técnico" required>
                            <Textarea
                                value={crear.data.justificacion}
                                onChange={(e) =>
                                    crear.setData(
                                        'justificacion',
                                        e.target.value,
                                    )
                                }
                                rows={3}
                                placeholder="Sustento de obra, partidas involucradas y condiciones especiales…"
                            />
                        </Field>
                    </FormSection>

                    <SubmitButton
                        status={crear.processing ? 'submitting' : 'idle'}
                        className="w-full"
                    >
                        <IconPlus size={15} />
                        Generar Requerimiento
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal
                open={Boolean(rechazando)}
                onClose={() => setRechazando(null)}
                title={`Rechazar ${rechazando?.codigo ?? ''}`}
            >
                <form onSubmit={rechazar} className="space-y-4 text-xs">
                    <Field label="Motivo del rechazo" required>
                        <Textarea
                            value={evaluar.data.motivo_rechazo}
                            onChange={(e) =>
                                evaluar.setData(
                                    'motivo_rechazo',
                                    e.target.value,
                                )
                            }
                            rows={3}
                            placeholder="Explica por qué se rechaza el requerimiento…"
                        />
                    </Field>
                    <div className="border-line flex justify-end gap-2 border-t pt-2">
                        <button
                            type="button"
                            onClick={() => setRechazando(null)}
                            className="border-line text-ink hover:bg-soft rounded-lg border px-3 py-1.5 text-xs font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-danger rounded-lg px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                        >
                            Confirmar rechazo
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
