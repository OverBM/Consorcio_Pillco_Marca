// Devoluciones y Rechazos a Proveedor (Macroproceso MP-19 / Bizagi 26).
// Registro de actas de no conformidad sobre una recepción y egreso de stock.
// Datos desde props `devolucionesDb` y `recepcionesDb`; escrituras vía `useHttp`.

import { useMemo, useState, type FormEvent } from 'react';
import { router, useHttp } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFs } from '../utils/format';
import { IconPlus, IconSearch, IconX } from '../components/icons';

interface MaterialDb {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface DevolucionDetalleDb {
    id: number;
    material_id: number;
    cantidad: number | string;
    material?: MaterialDb | null;
}

interface RecepcionDetalleDb {
    id: number;
    material_id: number;
    material?: MaterialDb | null;
}

interface RecepcionDb {
    id: number;
    codigo: string;
    almacen_id: number;
    orden_compra_id: number;
    almacen?: { id: number; nombre: string } | null;
    orden_compra?: { id: number; codigo: string; proveedor?: { id: number; razon_social: string } | null } | null;
    detalles?: RecepcionDetalleDb[];
}

interface DevolucionDb {
    id: number;
    codigo: string;
    recepcion_id: number;
    proveedor_id: number;
    motivo: string;
    estado: string;
    created_at: string;
    proveedor?: { id: number; razon_social: string } | null;
    recepcion?: { id: number; codigo: string; almacen?: { id: number; nombre: string } | null } | null;
    detalles?: DevolucionDetalleDb[];
}

interface DevolucionesPageProps {
    devolucionesDb?: DevolucionDb[];
    recepcionesDb?: RecepcionDb[];
}

type DevolucionFila = Omit<DevolucionDb, 'id'> & { id: string };

const ESTADO_META: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = {
    registrada: { tone: 'warn', label: 'Registrada' },
    aprobada: { tone: 'ok', label: 'Aprobada' },
    anulada: { tone: 'neutral', label: 'Anulada' },
};

interface LineaDev {
    material_id: string;
    cantidad: string;
}

function materialPrincipal(d: { detalles?: DevolucionDetalleDb[] }): string {
    const detalles = d.detalles ?? [];
    if (detalles.length === 0) return '—';
    const primero = detalles[0].material?.nombre ?? `Material #${detalles[0].material_id}`;
    return detalles.length > 1 ? `${primero} (+${detalles.length - 1})` : primero;
}

function cantidadTotal(d: { detalles?: DevolucionDetalleDb[] }): number {
    return (d.detalles ?? []).reduce((acc, det) => acc + Number(det.cantidad), 0);
}

export default function DevolucionesPage({ devolucionesDb = [], recepcionesDb = [] }: DevolucionesPageProps) {
    const notify = useNotifications();

    const crear = useHttp<{
        recepcion_id: string;
        proveedor_id: string;
        motivo: string;
        detalles: LineaDev[];
    }>({
        recepcion_id: '',
        proveedor_id: '',
        motivo: '',
        detalles: [{ material_id: '', cantidad: '' }] as LineaDev[],
    });

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const filas: DevolucionFila[] = useMemo(
        () => devolucionesDb.map((d) => ({ ...d, id: String(d.id) })),
        [devolucionesDb],
    );

    const filtradas = useMemo(
        () =>
            filas.filter((d) => {
                if (filtroEstado !== 'todos' && d.estado !== filtroEstado) return false;
                if (!busqueda.trim()) return true;
                const q = busqueda.toLowerCase();
                return (
                    d.codigo.toLowerCase().includes(q) ||
                    (d.proveedor?.razon_social ?? '').toLowerCase().includes(q) ||
                    materialPrincipal(d).toLowerCase().includes(q)
                );
            }),
        [filas, filtroEstado, busqueda],
    );

    const recepcionSel = recepcionesDb.find((r) => String(r.id) === crear.data.recepcion_id) ?? null;

    const seleccionarRecepcion = (valor: string) => {
        crear.setData('recepcion_id', valor);
        const recepcion = recepcionesDb.find((r) => String(r.id) === valor);
        crear.setData('proveedor_id', recepcion?.orden_compra?.proveedor ? String(recepcion.orden_compra.proveedor.id) : '');
        crear.setData('detalles', [{ material_id: '', cantidad: '' }]);
    };

    const setLinea = (indice: number, campo: keyof LineaDev, valor: string) =>
        crear.setData(
            'detalles',
            crear.data.detalles.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)),
        );

    const agregarLinea = () => crear.setData('detalles', [...crear.data.detalles, { material_id: '', cantidad: '' }]);

    const quitarLinea = (indice: number) => crear.setData('detalles', crear.data.detalles.filter((_, i) => i !== indice));

    const reiniciar = () => {
        crear.setData('recepcion_id', '');
        crear.setData('proveedor_id', '');
        crear.setData('motivo', '');
        crear.setData('detalles', [{ material_id: '', cantidad: '' }]);
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!crear.data.recepcion_id) {
            notify.error('Selecciona la recepción de origen.');
            return;
        }
        if (!crear.data.proveedor_id) {
            notify.error('La recepción seleccionada no tiene proveedor asociado.');
            return;
        }
        if (!crear.data.motivo.trim()) {
            notify.error('Describe el motivo de la no conformidad.');
            return;
        }

        const detalles = crear.data.detalles
            .filter((l) => l.material_id && Number(l.cantidad) > 0)
            .map((l) => ({ material_id: Number(l.material_id), cantidad: Number(l.cantidad) }));

        if (detalles.length === 0) {
            notify.error('Agrega al menos un material con cantidad mayor a cero.');
            return;
        }

        crear.transform(() => ({
            recepcion_id: Number(crear.data.recepcion_id),
            proveedor_id: Number(crear.data.proveedor_id),
            motivo: crear.data.motivo,
            detalles,
        }));

        crear.post('/api/v1/devoluciones', {
            onSuccess: () => {
                notify.success('Devolución registrada y stock actualizado.');
                reiniciar();
                router.reload({ only: ['devolucionesDb'] });
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la devolución.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Devoluciones y Rechazos a Proveedor"
                subtitle="Actas de no conformidad, egreso de inventario y compensación al proveedor"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[240px] flex-1">
                                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar por codigo o proveedor…"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full rounded-lg border border-line bg-canvas py-1.5 pl-9 pr-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar estado">
                                <option value="todos">Todos los estados</option>
                                <option value="registrada">Registrada</option>
                                <option value="aprobada">Aprobada</option>
                                <option value="anulada">Anulada</option>
                            </Select>
                        </div>
                    </Card>

                    <Card title={`Devoluciones (${filtradas.length})`}>
                        {filas.length === 0 ? (
                            <EmptyState title="Sin devoluciones registradas" hint="Registra un acta de rechazo sobre una recepción." />
                        ) : (
                            <DataTable
                                emptyLabel="No hay devoluciones que coincidan con la búsqueda."
                                columns={[
                                    { key: 'codigo', header: 'Acta', mono: true, cell: (d) => <span className="font-semibold text-ink">{d.codigo}</span> },
                                    { key: 'proveedor', header: 'Proveedor', cell: (d) => d.proveedor?.razon_social ?? `Proveedor #${d.proveedor_id}` },
                                    { key: 'recepcion', header: 'Recepción', mono: true, cell: (d) => d.recepcion?.codigo ?? `#${d.recepcion_id}` },
                                    {
                                        key: 'material',
                                        header: 'Material y Rechazo',
                                        cell: (d) => (
                                            <div>
                                                <p className="text-xs font-semibold text-ink">{materialPrincipal(d)}</p>
                                                <p className="text-[11px] font-mono text-muted">Rechazo: {formatCantidad(cantidadTotal(d))}</p>
                                            </div>
                                        ),
                                    },
                                    { key: 'fecha', header: 'Fecha', mono: true, cell: (d) => formatFs(d.created_at) },
                                    {
                                        key: 'estado',
                                        header: 'Estado',
                                        align: 'center',
                                        cell: (d) => {
                                            const meta = ESTADO_META[d.estado] ?? { tone: 'neutral' as const, label: d.estado };
                                            return <Badge tone={meta.tone}>{meta.label}</Badge>;
                                        },
                                    },
                                    {
                                        key: 'motivo',
                                        header: 'Motivo',
                                        cell: (d) => <span className="block max-w-56 truncate text-xs text-muted" title={d.motivo}>{d.motivo}</span>,
                                    },
                                ]}
                                rows={filtradas}
                            />
                        )}
                    </Card>
                </div>

                <FormPanel title="Emitir Acta de Rechazo" subtitle="Devolución sobre una recepción" onSubmit={enviar} className="text-xs">
                    <FormSection title="Origen" columns={1}>
                        <Field label="Recepción" required>
                            <Select value={crear.data.recepcion_id} onChange={(e) => seleccionarRecepcion(e.target.value)}>
                                <option value="">Selecciona recepción…</option>
                                {recepcionesDb.map((r) => (
                                    <option key={r.id} value={String(r.id)}>
                                        {r.codigo} — {r.orden_compra?.proveedor?.razon_social ?? `OC #${r.orden_compra_id}`}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Proveedor">
                            <Input value={recepcionSel?.orden_compra?.proveedor?.razon_social ?? ''} placeholder="Se completa al elegir recepción" disabled />
                        </Field>
                    </FormSection>

                    <FormSection title="Materiales rechazados" columns={1}>
                        <div className="space-y-2">
                            {crear.data.detalles.map((linea, i) => (
                                <div key={i} className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={linea.material_id}
                                            onChange={(e) => setLinea(i, 'material_id', e.target.value)}
                                            className="!py-1.5"
                                            aria-label="Material"
                                        >
                                            <option value="">Material…</option>
                                            {(recepcionSel?.detalles ?? []).map((det) => (
                                                <option key={det.id} value={String(det.material_id)}>
                                                    {det.material?.nombre ?? `Material #${det.material_id}`}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={linea.cantidad}
                                        onChange={(e) => setLinea(i, 'cantidad', e.target.value)}
                                        placeholder="Cant."
                                        className="field !w-24 !py-1.5"
                                        aria-label="Cantidad rechazada"
                                    />
                                    {crear.data.detalles.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => quitarLinea(i)}
                                            aria-label="Quitar material"
                                            className="rounded p-2 text-muted hover:bg-danger-soft hover:text-danger"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={agregarLinea} className="text-[11px] font-bold text-brand-600 hover:underline">
                                + Añadir material
                            </button>
                        </div>
                    </FormSection>

                    <FormSection title="Motivo" columns={1}>
                        <Field label="Detalle de no conformidad" required>
                            <Textarea
                                value={crear.data.motivo}
                                onChange={(e) => crear.setData('motivo', e.target.value)}
                                rows={3}
                                placeholder="Daño físico, humedad, falta de certificado de calidad…"
                            />
                        </Field>
                    </FormSection>

                    <SubmitButton status={crear.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Emitir Acta de Rechazo
                    </SubmitButton>
                </FormPanel>
            </div>
        </div>
    );
}
