// Módulo de Transferencias entre Almacenes (Macroprocesos Bizagi 27 y 28).
// Órdenes de transferencia por almacenero de origen, autorización por Logística,
// transporte inter-obra y confirmación de recepción en destino.
// Datos desde props `transferenciasDb`; escrituras vía `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Button, Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFs } from '../utils/format';
import type { CatalogoAlmacen, CatalogoMaterial } from '../types';
import { IconBoxes, IconCheck, IconPlus, IconSearch, IconX } from '../components/icons';

interface MaterialDb {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface TransferenciaDetalleDb {
    id: number;
    material_id: number;
    cantidad_solicitada: number | string;
    cantidad_despachada: number | string | null;
    cantidad_recibida: number | string | null;
    material?: MaterialDb | null;
}

interface AlmacenDb {
    id: number;
    nombre: string;
}

interface TransferenciaDb {
    id: number;
    codigo: string;
    motivo: string;
    estado: string;
    generada_automaticamente: boolean;
    distancia_m: number | string | null;
    eta_min: number | string | null;
    created_at: string;
    almacen_origen_id: number;
    almacen_destino_id: number;
    almacen_origen?: AlmacenDb | null;
    almacen_destino?: AlmacenDb | null;
    detalles?: TransferenciaDetalleDb[];
}

interface TransferenciasPageProps {
    transferenciasDb?: TransferenciaDb[];
}

type TransferenciaFila = Omit<TransferenciaDb, 'id'> & { id: string };

const ESTADO_META: Record<string, { tone: 'ok' | 'warn' | 'violet' | 'danger' | 'neutral'; label: string }> = {
    solicitada: { tone: 'warn', label: 'Solicitada' },
    aprobada: { tone: 'violet', label: 'Aprobada' },
    en_transito: { tone: 'violet', label: 'En tránsito' },
    completada: { tone: 'ok', label: 'Completada' },
    anulada: { tone: 'neutral', label: 'Anulada' },
};

interface LineaCrear {
    material_id: string;
    cantidad_solicitada: string;
}

interface LineaRecepcion {
    id: number;
    material: string;
    unidad: string;
    esperada: number;
    recibida: string;
}

function origenNombre(t: { almacen_origen?: AlmacenDb | null; almacen_origen_id: number }): string {
    return t.almacen_origen?.nombre ?? `Almacén #${t.almacen_origen_id}`;
}

function destinoNombre(t: { almacen_destino?: AlmacenDb | null; almacen_destino_id: number }): string {
    return t.almacen_destino?.nombre ?? `Almacén #${t.almacen_destino_id}`;
}

function materialPrincipal(t: { detalles?: TransferenciaDetalleDb[] }): string {
    const detalles = t.detalles ?? [];
    if (detalles.length === 0) return '—';
    const primero = detalles[0].material?.nombre ?? `Material #${detalles[0].material_id}`;
    return detalles.length > 1 ? `${primero} (+${detalles.length - 1})` : primero;
}

function totalSolicitado(t: { detalles?: TransferenciaDetalleDb[] }): number {
    return (t.detalles ?? []).reduce((acc, d) => acc + Number(d.cantidad_solicitada), 0);
}

export default function TransferenciasPage({ transferenciasDb = [] }: TransferenciasPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props;

    const almacenes: CatalogoAlmacen[] = catalogos.almacenes;
    const materiales: CatalogoMaterial[] = catalogos.materiales;

    const crear = useHttp<{
        almacen_origen_id: string;
        almacen_destino_id: string;
        motivo: string;
        detalles: LineaCrear[];
    }>({
        almacen_origen_id: '',
        almacen_destino_id: '',
        motivo: '',
        detalles: [{ material_id: '', cantidad_solicitada: '' }] as LineaCrear[],
    });

    const accion = useHttp<Record<string, string>>({});
    const confirmar = useHttp<Record<string, string>>({});

    const [modalCrear, setModalCrear] = useState(false);
    const [recibiendo, setRecibiendo] = useState<TransferenciaFila | null>(null);
    const [receptoras, setReceptoras] = useState<LineaRecepcion[]>([]);
    const [observaciones, setObservaciones] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const filas: TransferenciaFila[] = useMemo(
        () => transferenciasDb.map((t) => ({ ...t, id: String(t.id) })),
        [transferenciasDb],
    );

    const filtradas = useMemo(() => {
        return filas.filter((t) => {
            if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false;
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const hay =
                    t.codigo.toLowerCase().includes(q) ||
                    t.motivo.toLowerCase().includes(q) ||
                    materialPrincipal(t).toLowerCase().includes(q);
                if (!hay) return false;
            }
            return true;
        });
    }, [filas, filtroEstado, busqueda]);

    const setLineaCrear = (indice: number, campo: keyof LineaCrear, valor: string) =>
        crear.setData(
            'detalles',
            crear.data.detalles.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)),
        );

    const agregarLineaCrear = () =>
        crear.setData('detalles', [...crear.data.detalles, { material_id: '', cantidad_solicitada: '' }]);

    const quitarLineaCrear = (indice: number) =>
        crear.setData('detalles', crear.data.detalles.filter((_, i) => i !== indice));

    const abrirCrear = () => {
        crear.setData('almacen_origen_id', '');
        crear.setData('almacen_destino_id', '');
        crear.setData('motivo', '');
        crear.setData('detalles', [{ material_id: '', cantidad_solicitada: '' }]);
        setModalCrear(true);
    };

    const enviarCrear = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.almacen_origen_id || !crear.data.almacen_destino_id) {
            notify.error('Selecciona el almacén de origen y el de destino.');
            return;
        }
        if (crear.data.almacen_origen_id === crear.data.almacen_destino_id) {
            notify.error('El origen y el destino deben ser distintos.');
            return;
        }
        if (!crear.data.motivo.trim()) {
            notify.error('Indica el motivo del traslado.');
            return;
        }

        const detalles = crear.data.detalles
            .filter((l) => l.material_id && Number(l.cantidad_solicitada) > 0)
            .map((l) => ({ material_id: Number(l.material_id), cantidad_solicitada: Number(l.cantidad_solicitada) }));

        if (detalles.length === 0) {
            notify.error('Agrega al menos un material con cantidad mayor a cero.');
            return;
        }

        crear.transform(() => ({
            almacen_origen_id: Number(crear.data.almacen_origen_id),
            almacen_destino_id: Number(crear.data.almacen_destino_id),
            motivo: crear.data.motivo,
            detalles,
        }));

        crear.post('/api/v1/transferencias', {
            onSuccess: () => {
                notify.success('Orden de transferencia registrada.');
                setModalCrear(false);
                refrescarProps('transferenciasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la transferencia.');
            },
        });
    };

    const aprobar = (t: TransferenciaFila) => {
        accion.post(`/api/v1/transferencias/${t.id}/aprobar`, {
            onSuccess: () => {
                notify.success('Transferencia aprobada y stock reservado en origen.');
                refrescarProps('transferenciasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo aprobar la transferencia.');
            },
        });
    };

    const abrirRecepcion = (t: TransferenciaFila) => {
        setRecibiendo(t);
        setObservaciones('');
        setReceptoras(
            (t.detalles ?? []).map((det) => {
                const esperada = Number(det.cantidad_despachada ?? det.cantidad_solicitada);
                return {
                    id: det.id,
                    material: det.material?.nombre ?? `Material #${det.material_id}`,
                    unidad: det.material?.unidad_medida?.codigo ?? 'und',
                    esperada,
                    recibida: String(esperada),
                };
            }),
        );
    };

    const setRecibida = (id: number, valor: string) =>
        setReceptoras((actual) => actual.map((l) => (l.id === id ? { ...l, recibida: valor } : l)));

    const enviarRecepcion = (event: FormEvent) => {
        event.preventDefault();
        if (!recibiendo) return;

        const detalles = receptoras.map((l) => ({ id: l.id, cantidad_recibida: Number(l.recibida) }));
        const hayDiferencias = receptoras.some((l) => Number(l.recibida) !== l.esperada);

        confirmar.transform(() => ({
            hay_diferencias: hayDiferencias,
            observaciones,
            detalles,
        }));

        confirmar.post(`/api/v1/transferencias/${recibiendo.id}/confirmar-recepcion`, {
            onSuccess: () => {
                notify.success('Recepción confirmada e inventario actualizado en destino.');
                setRecibiendo(null);
                refrescarProps('transferenciasDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo confirmar la recepción.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Transferencias entre Almacenes"
                subtitle="Órdenes, autorización de Logística, transporte y confirmación de recepción"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card className="p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-2 rounded-field border border-line bg-canvas px-3 py-2 text-muted">
                                <IconSearch size={16} />
                                <input
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar código, motivo o material…"
                                    className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted/70"
                                />
                            </div>
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar estado">
                                <option value="todos">Todos los estados</option>
                                <option value="solicitada">Solicitada</option>
                                <option value="aprobada">Aprobada</option>
                                <option value="en_transito">En tránsito</option>
                                <option value="completada">Completada</option>
                            </Select>
                        </div>
                    </Card>

                    <Card title={`Órdenes de Transferencia (${filtradas.length})`}>
                        {filtradas.length === 0 ? (
                            <EmptyState
                                title="Sin órdenes de transferencia"
                                hint="Registra una nueva transferencia para mover materiales entre almacenes."
                            />
                        ) : (
                            <DataTable
                                emptyLabel="Sin transferencias."
                                columns={[
                                    {
                                        key: 'codigo',
                                        header: 'N° Orden',
                                        mono: true,
                                        cell: (t) => (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-ink">{t.codigo}</span>
                                                {t.generada_automaticamente && (
                                                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-800">
                                                        Automática
                                                    </span>
                                                )}
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'ruta',
                                        header: 'Origen → Destino',
                                        cell: (t) => (
                                            <div className="max-w-56">
                                                <p className="truncate text-xs font-semibold text-ink">{origenNombre(t)}</p>
                                                <p className="truncate text-[11px] text-muted">→ {destinoNombre(t)}</p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'material',
                                        header: 'Material y Cantidad',
                                        cell: (t) => (
                                            <div>
                                                <p className="text-xs font-bold text-ink">{materialPrincipal(t)}</p>
                                                <p className="font-mono text-[11px] font-semibold text-brand-700">
                                                    {formatCantidad(totalSolicitado(t))}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    { key: 'motivo', header: 'Motivo', cell: (t) => <span className="block max-w-56 truncate text-xs text-muted">{t.motivo}</span> },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        cell: (t) => {
                                            const meta = ESTADO_META[t.estado] ?? { tone: 'neutral' as const, label: t.estado };
                                            return <Badge tone={meta.tone}>{meta.label}</Badge>;
                                        },
                                    },
                                    {
                                        key: 'acciones',
                                        header: 'Acciones',
                                        align: 'right',
                                        cell: (t) => (
                                            <div className="flex items-center justify-end gap-1.5">
                                                {t.estado === 'solicitada' && (
                                                    <button
                                                        onClick={() => aprobar(t)}
                                                        disabled={accion.processing}
                                                        className="btn-primary !px-2.5 !py-1 text-xs"
                                                        title="Autorizar orden (Logística)"
                                                    >
                                                        <IconCheck size={13} />
                                                        Autorizar
                                                    </button>
                                                )}
                                                {t.estado === 'en_transito' && (
                                                    <button
                                                        onClick={() => abrirRecepcion(t)}
                                                        className="btn-primary !bg-emerald-600 !px-2.5 !py-1 text-xs hover:!bg-emerald-700"
                                                        title="Confirmar recepción física en destino"
                                                    >
                                                        <IconBoxes size={13} />
                                                        Recibir
                                                    </button>
                                                )}
                                                {t.estado === 'aprobada' && (
                                                    <span className="text-[11px] text-muted">Pendiente de despacho</span>
                                                )}
                                                {(t.estado === 'completada' || t.estado === 'anulada') && (
                                                    <span className="text-[11px] text-muted">{formatFs(t.created_at)}</span>
                                                )}
                                            </div>
                                        ),
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Nueva Orden de Transferencia" subtitle="Traslado entre almacenes" onSubmit={enviarCrear} className="text-xs">
                    <FormSection title="Ruta" columns={1}>
                        <Field label="Almacén de origen" required>
                            <Select value={crear.data.almacen_origen_id} onChange={(e) => crear.setData('almacen_origen_id', e.target.value)}>
                                <option value="">Selecciona origen…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Almacén de destino" required>
                            <Select value={crear.data.almacen_destino_id} onChange={(e) => crear.setData('almacen_destino_id', e.target.value)}>
                                <option value="">Selecciona destino…</option>
                                {almacenes
                                    .filter((a) => String(a.id) !== crear.data.almacen_origen_id)
                                    .map((a) => (
                                        <option key={a.id} value={String(a.id)}>
                                            {a.nombre}
                                        </option>
                                    ))}
                            </Select>
                        </Field>
                    </FormSection>

                    <FormSection title="Materiales" columns={1}>
                        <div className="space-y-2">
                            {crear.data.detalles.map((linea, i) => (
                                <div key={i} className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={linea.material_id}
                                            onChange={(e) => setLineaCrear(i, 'material_id', e.target.value)}
                                            className="!py-1.5"
                                            aria-label="Material"
                                        >
                                            <option value="">Material…</option>
                                            {materiales.map((m) => (
                                                <option key={m.id} value={String(m.id)}>
                                                    {m.nombre}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={linea.cantidad_solicitada}
                                        onChange={(e) => setLineaCrear(i, 'cantidad_solicitada', e.target.value)}
                                        placeholder="Cant."
                                        className="field !w-24 !py-1.5"
                                        aria-label="Cantidad solicitada"
                                    />
                                    {crear.data.detalles.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => quitarLineaCrear(i)}
                                            aria-label="Quitar material"
                                            className="rounded p-2 text-muted hover:bg-danger-soft hover:text-danger"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={agregarLineaCrear} className="text-[11px] font-bold text-brand-600 hover:underline">
                                + Añadir material
                            </button>
                        </div>
                    </FormSection>

                    <FormSection title="Justificación" columns={1}>
                        <Field label="Motivo" hint="Máximo 25 caracteres." required>
                            <Input
                                value={crear.data.motivo}
                                onChange={(e) => crear.setData('motivo', e.target.value.slice(0, 25))}
                                maxLength={25}
                                placeholder="Rebalance de stock"
                            />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Generar Orden
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal
                open={!!recibiendo}
                onClose={() => setRecibiendo(null)}
                title={`Confirmar Recepción — ${recibiendo?.codigo ?? ''}`}
                wide
            >
                {recibiendo && (
                    <form onSubmit={enviarRecepcion} className="space-y-4 text-xs">
                        <div className="rounded-xl bg-soft/60 p-3">
                            <p className="text-muted">
                                {origenNombre(recibiendo)} → <strong className="text-ink">{destinoNombre(recibiendo)}</strong>
                            </p>
                        </div>

                        <div className="space-y-2">
                            {receptoras.map((l) => (
                                <div key={l.id} className="flex items-center gap-2 rounded-lg border border-line p-2.5">
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-ink">{l.material}</p>
                                        <p className="text-[11px] text-muted">Esperado: {formatCantidad(l.esperada, l.unidad)}</p>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={l.recibida}
                                        onChange={(e) => setRecibida(l.id, e.target.value)}
                                        className="field !w-24 !py-1.5"
                                        aria-label={`Cantidad recibida de ${l.material}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {receptoras.some((l) => Number(l.recibida) !== l.esperada) && (
                            <p className="rounded-lg bg-warn-soft/70 px-3 py-2 text-[11px] font-semibold text-ink">
                                Hay diferencias respecto a lo despachado; se registrará como recepción con incidencia.
                            </p>
                        )}

                        <Field label="Observaciones">
                            <Textarea
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                rows={2}
                                placeholder="Incidencias, bultos dañados, faltantes…"
                            />
                        </Field>

                        <div className="flex justify-end gap-2 border-t border-line pt-2">
                            <Button type="button" variant="secondary" onClick={() => setRecibiendo(null)}>
                                Cancelar
                            </Button>
                            <SubmitButton status={confirmar.processing ? 'submitting' : 'idle'}>
                                <IconCheck size={15} />
                                Confirmar Recepción
                            </SubmitButton>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
