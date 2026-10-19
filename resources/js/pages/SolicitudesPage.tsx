// Módulo de Solicitudes de Material (Macroprocesos Bizagi 22-25).
// Pedidos de frente de obra vinculados a un almacén; atención/despacho con
// descuento automático de stock. Datos desde props `solicitudesDb`.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp, usePage } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Button, Field, Input, Select, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFs } from '../utils/format';
import type { CatalogoAlmacen, CatalogoMaterial, CatalogoObra } from '../types';
import { IconPlus, IconTruck, IconX } from '../components/icons';

interface SolicitudDetalleDb {
    id: number;
    material_id: number;
    cantidad: number | string;
    cantidad_atendida: number | string;
    material?: { id: number; nombre: string; unidad_medida?: { codigo: string } | null } | null;
}

interface SolicitudDb {
    id: number;
    codigo: string;
    obra_id: number;
    almacen_id: number;
    estado: string;
    urgente: boolean;
    created_at: string;
    atendida_en: string | null;
    obra?: { id: number; nombre: string } | null;
    detalles?: SolicitudDetalleDb[];
}

interface SolicitudesPageProps {
    solicitudesDb?: SolicitudDb[];
}

type SolicitudFila = Omit<SolicitudDb, 'id'> & { id: string };

const ESTADO_META: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = {
    registrada: { tone: 'warn', label: 'Registrada' },
    atendida: { tone: 'ok', label: 'Atendida' },
    anulada: { tone: 'neutral', label: 'Anulada' },
};

interface LineaForm {
    material_id: string;
    cantidad: string;
}

function unidadDe(solicitud: { detalles?: SolicitudDetalleDb[] }): string {
    return solicitud.detalles?.[0]?.material?.unidad_medida?.codigo ?? 'und';
}

function totalSolicitado(solicitud: { detalles?: SolicitudDetalleDb[] }): number {
    return (solicitud.detalles ?? []).reduce((acc, d) => acc + Number(d.cantidad), 0);
}

function materialPrincipal(solicitud: { detalles?: SolicitudDetalleDb[] }): string {
    const primero = solicitud.detalles?.[0];
    if (!primero) return '—';
    const extra = (solicitud.detalles ?? []).length - 1;
    const nombre = primero.material?.nombre ?? `Material #${primero.material_id}`;
    return extra > 0 ? `${nombre} (+${extra})` : nombre;
}

export default function SolicitudesPage({ solicitudesDb = [] }: SolicitudesPageProps) {
    const notify = useNotifications();
    const { catalogos } = usePage().props;

    const obras: CatalogoObra[] = catalogos.obras;
    const almacenes: CatalogoAlmacen[] = catalogos.almacenes;
    const materiales: CatalogoMaterial[] = catalogos.materiales;

    const http = useHttp<{
        obra_id: string;
        almacen_id: string;
        urgente: boolean;
        detalles: LineaForm[];
    }>({
        obra_id: '',
        almacen_id: '',
        urgente: false,
        detalles: [{ material_id: '', cantidad: '' }] as LineaForm[],
    });

    const httpAtender = useHttp<Record<string, string>>({});

    const [atendiendo, setAtendiendo] = useState<SolicitudFila | null>(null);

    const filas: SolicitudFila[] = useMemo(
        () => solicitudesDb.map((s) => ({ ...s, id: String(s.id) })),
        [solicitudesDb],
    );

    const almacenesObra = http.data.obra_id
        ? almacenes.filter((a) => String(a.obra_id) === http.data.obra_id)
        : almacenes;

    const setLinea = (indice: number, campo: keyof LineaForm, valor: string) => {
        http.setData(
            'detalles',
            http.data.detalles.map((linea, i) => (i === indice ? { ...linea, [campo]: valor } : linea)),
        );
    };

    const agregarLinea = () => http.setData('detalles', [...http.data.detalles, { material_id: '', cantidad: '' }]);

    const quitarLinea = (indice: number) =>
        http.setData('detalles', http.data.detalles.filter((_, i) => i !== indice));

    const reiniciar = () => {
        http.setData('obra_id', '');
        http.setData('almacen_id', '');
        http.setData('urgente', false);
        http.setData('detalles', [{ material_id: '', cantidad: '' }]);
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!http.data.obra_id || !http.data.almacen_id) {
            notify.error('Selecciona la obra y el almacén que atenderá la solicitud.');
            return;
        }

        const detalles = http.data.detalles
            .filter((linea) => linea.material_id && Number(linea.cantidad) > 0)
            .map((linea) => ({ material_id: Number(linea.material_id), cantidad: Number(linea.cantidad) }));

        if (detalles.length === 0) {
            notify.error('Agrega al menos un material con cantidad mayor a cero.');
            return;
        }

        http.transform(() => ({
            obra_id: Number(http.data.obra_id),
            almacen_id: Number(http.data.almacen_id),
            urgente: http.data.urgente,
            detalles,
        }));

        http.post('/api/v1/solicitudes', {
            onSuccess: () => {
                notify.success('Solicitud de material registrada.');
                reiniciar();
                refrescarProps('solicitudesDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo registrar la solicitud.');
            },
        });
    };

    const atender = () => {
        if (!atendiendo) return;

        httpAtender.post(`/api/v1/solicitudes/${atendiendo.id}/atender`, {
            onSuccess: () => {
                notify.success('Solicitud atendida y stock descontado.');
                setAtendiendo(null);
                refrescarProps('solicitudesDb');
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo atender la solicitud.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Solicitudes de Material"
                subtitle="Pedidos de frente de obra, almacén asignado y despacho con descuento de stock"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card title={`Solicitudes (${solicitudesDb.length})`} className="lg:col-span-2">
                    {solicitudesDb.length === 0 ? (
                        <EmptyState title="Sin solicitudes registradas" hint="Genera una solicitud para un frente de obra." />
                    ) : (
                        <DataTable
                            emptyLabel="Sin solicitudes."
                            columns={[
                                { key: 'codigo', header: 'Código', mono: true },
                                { key: 'fecha', header: 'Fecha', cell: (s) => formatFs(s.created_at) },
                                {
                                    key: 'obra',
                                    header: 'Obra / Frente',
                                    cell: (s) => (
                                        <div>
                                            <p className="text-xs font-semibold text-ink">{s.obra?.nombre ?? `Obra #${s.obra_id}`}</p>
                                            <p className="text-[11px] text-muted">Almacén #{s.almacen_id}</p>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'material',
                                    header: 'Material y Cantidad',
                                    cell: (s) => (
                                        <div>
                                            <p className="text-xs font-bold text-ink">{materialPrincipal(s)}</p>
                                            <p className="text-[11px] font-mono font-semibold text-brand-700">
                                                {formatCantidad(totalSolicitado(s))} {unidadDe(s)}
                                            </p>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'urgencia',
                                    header: 'Urgencia',
                                    cell: (s) => <Badge tone={s.urgente ? 'danger' : 'neutral'}>{s.urgente ? 'URGENTE' : 'Normal'}</Badge>,
                                },
                                {
                                    key: 'estado',
                                    header: 'Estado',
                                    cell: (s) => {
                                        const meta = ESTADO_META[s.estado] ?? { tone: 'neutral' as const, label: s.estado };
                                        return <Badge tone={meta.tone}>{meta.label}</Badge>;
                                    },
                                },
                                {
                                    key: 'acciones',
                                    header: 'Acciones',
                                    align: 'right',
                                    cell: (s) =>
                                        s.estado === 'registrada' ? (
                                            <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => setAtendiendo(s)}>
                                                <IconTruck size={13} />
                                                Atender
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-muted">{s.atendida_en ? formatFs(s.atendida_en) : '—'}</span>
                                        ),
                                },
                            ]}
                            rows={filas}
                        />
                    )}
                </Card>

                <FormPanel
                    title="Nueva Solicitud de Material"
                    subtitle="Pedido del frente de obra"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Origen del pedido" columns={1}>
                        <Field label="Obra solicitante" required>
                            <Select
                                value={http.data.obra_id}
                                onChange={(e) => {
                                    http.setData('obra_id', e.target.value);
                                    http.setData('almacen_id', '');
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

                        <Field label="Almacén que atenderá" required>
                            <Select value={http.data.almacen_id} onChange={(e) => http.setData('almacen_id', e.target.value)}>
                                <option value="">Selecciona almacén…</option>
                                {almacenesObra.map((a) => (
                                    <option key={a.id} value={String(a.id)}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2">
                            <input
                                type="checkbox"
                                checked={http.data.urgente}
                                onChange={(e) => http.setData('urgente', e.target.checked)}
                                className="h-4 w-4 rounded border-line"
                            />
                            <span className="text-xs font-semibold text-ink">Marcar como urgente</span>
                        </label>
                    </FormSection>

                    <FormSection title="Materiales solicitados" columns={1}>
                        <div className="space-y-2">
                            {http.data.detalles.map((linea, i) => (
                                <div key={i} className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={linea.material_id}
                                            onChange={(e) => setLinea(i, 'material_id', e.target.value)}
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
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={linea.cantidad}
                                        onChange={(e) => setLinea(i, 'cantidad', e.target.value)}
                                        placeholder="Cant."
                                        className="!w-24 !py-1.5"
                                    />
                                    {http.data.detalles.length > 1 && (
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

                    <SubmitButton status={http.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Generar Solicitud
                    </SubmitButton>
                </FormPanel>
            </div>

            <Modal open={!!atendiendo} onClose={() => setAtendiendo(null)} title="Atender Solicitud">
                {atendiendo && (
                    <div className="space-y-4 text-xs">
                        <p className="text-muted">
                            Al atender <strong className="text-ink">{atendiendo.codigo}</strong> se descontará del almacén el
                            material solicitado y se asentará el movimiento en el kardex.
                        </p>
                        <div className="flex justify-end gap-2 border-t border-line pt-2">
                            <Button variant="secondary" onClick={() => setAtendiendo(null)}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={atender} disabled={httpAtender.processing}>
                                <IconTruck size={15} />
                                Confirmar Atención
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
