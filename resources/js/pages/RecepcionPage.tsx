// Módulo de Recepción de Obra (Macroproceso Bizagi 20).
// Registro e-POD contra Orden de Compra: verificación física, conformidad,
// evidencia y actualización automática del saldo en la Matriz de Stock.
// Datos desde props `recepcionesDb`/`ordenesDb`; escritura con `useHttp`.

import { useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { Field, Input, Select, Textarea, FormPanel, FormSection, SubmitButton } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { formatCantidad, formatFs } from '../utils/format';
import { IconInbox, IconPlus } from '../components/icons';

interface MaterialRef {
    id: number;
    nombre: string;
    unidad_medida?: { codigo: string } | null;
}

interface RecepcionDetalleDb {
    id: number;
    material_id: number;
    cantidad_ordenada: number | string;
    cantidad_recibida: number | string;
    material?: MaterialRef | null;
}

interface RecepcionDb {
    id: number;
    codigo: string;
    almacen_id: number;
    orden_compra_id: number;
    guia_remision: string | null;
    estado: string;
    recibida_en: string;
    observaciones: string | null;
    almacen?: { id: number; nombre: string; obra?: { nombre: string } | null } | null;
    orden_compra?: { id: number; codigo: string; proveedor?: { razon_social: string } | null } | null;
    almacenero?: { id: number; name: string } | null;
    detalles?: RecepcionDetalleDb[];
}

interface OrdenCompraDetalleDb {
    id: number;
    material_id: number;
    cantidad: number | string;
    material?: MaterialRef | null;
}

interface OrdenCompraDb {
    id: number;
    codigo: string;
    almacen_destino_id: number;
    estado: string;
    proveedor?: { id: number; razon_social: string } | null;
    detalles?: OrdenCompraDetalleDb[];
}

interface RecepcionPageProps {
    recepcionesDb?: RecepcionDb[];
    ordenesDb?: OrdenCompraDb[];
}

interface LineaRecepcion {
    orden_compra_detalle_id: number;
    material_id: number;
    cantidad_ordenada: number;
    cantidad_recibida: number;
}

const ESTADO_META: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = {
    conforme: { tone: 'ok', label: 'Conforme' },
    en_verificacion: { tone: 'warn', label: 'En verificación' },
    observada: { tone: 'danger', label: 'Observada' },
};

function unidadDe(material?: MaterialRef | null): string {
    return material?.unidad_medida?.codigo ?? 'und';
}

function totalRecibido(rec: { detalles?: RecepcionDetalleDb[] }): number {
    return (rec.detalles ?? []).reduce((acc, d) => acc + Number(d.cantidad_recibida), 0);
}

function primerMaterial(rec: { detalles?: RecepcionDetalleDb[] }): string {
    const primero = (rec.detalles ?? [])[0];
    if (!primero) return '—';

    const extra = (rec.detalles ?? []).length - 1;
    const nombre = primero.material?.nombre ?? `Material #${primero.material_id}`;

    return extra > 0 ? `${nombre} (+${extra})` : nombre;
}

export default function RecepcionPage({ recepcionesDb = [], ordenesDb = [] }: RecepcionPageProps) {
    const notify = useNotifications();

    const http = useHttp<{
        almacen_id: string;
        orden_compra_id: string;
        guia_remision: string;
        observaciones: string;
        detalles: LineaRecepcion[];
    }>({
        almacen_id: '',
        orden_compra_id: '',
        guia_remision: '',
        observaciones: '',
        detalles: [] as LineaRecepcion[],
    });

    const [seleccion, setSeleccion] = useState('');

    const ordenes = ordenesDb;
    const almacenDestino = ordenes.find((o) => String(o.id) === http.data.orden_compra_id)?.almacen_destino_id;

    const reiniciar = () => {
        http.setData('almacen_id', '');
        http.setData('orden_compra_id', '');
        http.setData('guia_remision', '');
        http.setData('observaciones', '');
        http.setData('detalles', []);
        setSeleccion('');
    };

    const seleccionarOrden = (id: string) => {
        setSeleccion(id);
        const oc = ordenes.find((o) => String(o.id) === id);

        if (!oc) {
            http.setData('orden_compra_id', '');
            http.setData('almacen_id', '');
            http.setData('detalles', []);
            return;
        }

        http.setData('orden_compra_id', id);
        http.setData('almacen_id', String(oc.almacen_destino_id));
        http.setData(
            'detalles',
            (oc.detalles ?? []).map((d) => ({
                orden_compra_detalle_id: d.id,
                material_id: d.material_id,
                cantidad_ordenada: Number(d.cantidad),
                cantidad_recibida: Number(d.cantidad),
            })),
        );
    };

    const actualizarCantidad = (indice: number, valor: string) => {
        http.setData(
            'detalles',
            http.data.detalles.map((linea, i) =>
                i === indice ? { ...linea, cantidad_recibida: valor === '' ? 0 : Number(valor) } : linea,
            ),
        );
    };

    const enviar = (event: FormEvent) => {
        event.preventDefault();

        if (!http.data.orden_compra_id) {
            notify.error('Selecciona la Orden de Compra a recepcionar.');
            return;
        }

        if (http.data.detalles.length === 0) {
            notify.error('La orden seleccionada no tiene materiales para recepcionar.');
            return;
        }

        http.post('/api/v1/recepciones', {
            onSuccess: () => {
                notify.success('Recepción registrada conforme y stock actualizado.');
                reiniciar();
                refrescarProps('recepcionesDb', 'ordenesDb');
            },
            onError: (errors) => {
                const mensaje = Object.values(errors).flat().join(' ');
                notify.error(mensaje || 'No se pudo registrar la recepción.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Recepción de Obra"
                subtitle="Verificación física contra OC y guía de remisión, conformidad y actualización de stock"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card title={`Recepciones Registradas (${recepcionesDb.length})`} className="lg:col-span-2">
                    {recepcionesDb.length === 0 ? (
                        <EmptyState title="Sin recepciones registradas" hint="Registra un ingreso contra una Orden de Compra." />
                    ) : (
                        <DataTable
                            emptyLabel="Sin recepciones."
                            columns={[
                                { key: 'codigo', header: 'Código', mono: true },
                                {
                                    key: 'origen',
                                    header: 'Origen (OC / Proveedor)',
                                    cell: (r) => (
                                        <div>
                                            <p className="text-xs font-semibold text-ink">{r.orden_compra?.codigo ?? `OC #${r.orden_compra_id}`}</p>
                                            <p className="text-[11px] text-muted">{r.orden_compra?.proveedor?.razon_social ?? '—'}</p>
                                        </div>
                                    ),
                                },
                                { key: 'material', header: 'Material', cell: (r) => <span className="text-xs font-bold text-ink">{primerMaterial(r)}</span> },
                                { key: 'cantidad', header: 'Recibido', align: 'right', mono: true, cell: (r) => formatCantidad(totalRecibido(r)) },
                                { key: 'destino', header: 'Almacén Destino', cell: (r) => r.almacen?.nombre ?? '—' },
                                { key: 'fecha', header: 'Fecha', cell: (r) => formatFs(r.recibida_en) },
                                {
                                    key: 'estado',
                                    header: 'Estado',
                                    cell: (r) => {
                                        const meta = ESTADO_META[r.estado] ?? { tone: 'neutral' as const, label: r.estado };
                                        return <Badge tone={meta.tone}>{meta.label}</Badge>;
                                    },
                                },
                            ]}
                            rows={recepcionesDb.map((r) => ({ ...r, id: String(r.id) }))}
                        />
                    )}
                </Card>

                <FormPanel
                    title="Registrar Ingreso de Carga"
                    subtitle="Selecciona la OC y confirma las cantidades recibidas"
                    onSubmit={enviar}
                    className="text-xs"
                >
                    <FormSection title="Orden de compra y documentación" columns={1}>
                        <Field label="Orden de Compra" required>
                            <Select value={seleccion} onChange={(e) => seleccionarOrden(e.target.value)}>
                                <option value="">Selecciona una OC emitida…</option>
                                {ordenes.map((oc) => (
                                    <option key={oc.id} value={String(oc.id)}>
                                        {oc.codigo} · {oc.proveedor?.razon_social ?? 'Proveedor'} ({oc.estado})
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Guía de Remisión" hint="Opcional">
                            <Input
                                value={http.data.guia_remision}
                                onChange={(e) => http.setData('guia_remision', e.target.value)}
                                placeholder="GR-001-09823"
                            />
                        </Field>
                    </FormSection>

                    {http.data.detalles.length > 0 && (
                        <FormSection title="Materiales y cantidades recibidas" columns={1}>
                            <div className="space-y-2">
                                {http.data.detalles.map((linea, i) => {
                                    const detalle = ordenes
                                        .find((o) => String(o.id) === http.data.orden_compra_id)
                                        ?.detalles?.find((d) => d.id === linea.orden_compra_detalle_id);
                                    return (
                                        <div key={linea.orden_compra_detalle_id} className="rounded-lg border border-line p-2.5">
                                            <p className="text-xs font-bold text-ink">{detalle?.material?.nombre ?? `Material #${linea.material_id}`}</p>
                                            <p className="text-[11px] text-muted">
                                                Ordenado: {formatCantidad(linea.cantidad_ordenada)} {unidadDe(detalle?.material)}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[11px] font-semibold text-muted">Recibido</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.001"
                                                    value={linea.cantidad_recibida}
                                                    onChange={(e) => actualizarCantidad(i, e.target.value)}
                                                    className="!py-1.5"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </FormSection>
                    )}

                    <FormSection title="Observaciones" columns={1}>
                        <Field label="Comentarios / incidencias">
                            <Textarea
                                value={http.data.observaciones}
                                onChange={(e) => http.setData('observaciones', e.target.value)}
                                placeholder="Anotaciones de la verificación física…"
                                rows={2}
                            />
                        </Field>
                        {almacenDestino && (
                            <p className="text-[11px] text-muted">
                                Las existencias ingresarán al almacén destino de la orden (#{almacenDestino}).
                            </p>
                        )}
                    </FormSection>

                    <SubmitButton status={http.processing ? 'submitting' : 'idle'} className="w-full">
                        <IconPlus size={15} />
                        Registrar Recepción Conforme
                    </SubmitButton>
                </FormPanel>
            </div>

            <Card title="Trazabilidad" subtitle="El ingreso se refleja de inmediato en el kardex y la Matriz de Stock">
                <div className="flex items-center gap-2 text-xs text-muted">
                    <IconInbox size={15} className="text-brand-500" />
                    <span>
                        Cada recepción conforme aumenta el saldo del almacén destino y registra un movimiento de ingreso en el kardex.
                    </span>
                </div>
            </Card>
        </div>
    );
}
