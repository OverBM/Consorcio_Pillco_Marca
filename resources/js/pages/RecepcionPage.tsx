// Módulo de Recepción de Obra (Macroproceso Bizagi 20).
// Verificación física contra Orden de Compra y Guía de Remisión,
// registro de Conformidad o Disconformidad a Logística, evidencia fotográfica,
// geolocalización y actualización automática del saldo en la Matriz de Stock.

import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Field, Input, Select, FileUpload, Textarea, Button } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { AlertaBanner } from '../components/AlertaBanner';
import { MapaLeaflet } from '../components/MapaLeaflet';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatFs, formatNum } from '../utils/format';
import type { Recepcion } from '../types';
import {
    IconCamera,
    IconCheck,
    IconInbox,
    IconMapPin,
    IconPlus,
    IconUserCheck,
} from '../components/icons';

interface FormState {
    origenTipo: 'proveedor' | 'otra-obra';
    origenTexto: string;
    referencia: string;
    materialId: string;
    cantidad: string;
    destinoAlmacenId: string;
    responsable: string;
}

const FORM_VACIO: FormState = {
    origenTipo: 'proveedor',
    origenTexto: '',
    referencia: '',
    materialId: '',
    cantidad: '',
    destinoAlmacenId: '',
    responsable: '',
};

export default function RecepcionPage() {
    const {
        recepciones,
        despachos,
        ordenesCompra,
        materiales,
        almacenes,
        obras,
        stock,
        confirmReceipt,
        createRecepcion,
        createDevolucion,
    } = useAppStore();

    const [form, setForm] = useState<FormState>(FORM_VACIO);
    const [errores, setErrores] = useState<Partial<FormState> & { global?: string }>({});
    const [confirmar, setConfirmar] = useState<Recepcion | null>(null);
    const [tipoResultado, setTipoResultado] = useState<'conforme' | 'disconforme'>('conforme');
    const [conformeCheck, setConformeCheck] = useState(false);
    const [motivoDisconformidad, setMotivoDisconformidad] = useState('');
    const [evidencia, setEvidencia] = useState<string | undefined>();
    const [confirmadoIds, setConfirmadoIds] = useState<string[]>([]);
    const [aceptado, setAceptado] = useState(false);

    const pendientes = recepciones.filter((r) => r.estado === 'pendiente');
    const recientes = recepciones.filter((r) => r.estado === 'confirmada');

    const despachosInternos = useMemo(
        () => despachos.filter((d) => d.estado === 'entregado').map((d) => d.codigo),
        [despachos],
    );

    const materialNombre = (id: string) => materiales.find((m) => m.id === id)?.nombre ?? id;
    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const validar = (): boolean => {
        const e: Partial<FormState> & { global?: string } = {};
        const cant = Number(form.cantidad);
        if (form.origenTipo === 'otra-obra' && form.origenTexto && !despachosInternos.includes(form.origenTexto)) {
            e.origenTexto = 'Despacho interno no encontrado.';
        } else if (!form.origenTexto.trim()) {
            e.origenTexto = 'Indica el proveedor u obra de origen.';
        }
        if (!form.referencia.trim()) {
            e.referencia = 'Referencia obligatoria (OC / Guía de Remisión).';
        }
        if (!form.materialId) {
            e.materialId = 'Selecciona el material.';
        }
        if (!cant || cant <= 0 || !Number.isFinite(cant)) {
            e.cantidad = 'Cantidad válida mayor a cero.';
        }
        if (!form.destinoAlmacenId) {
            e.destinoAlmacenId = 'Selecciona el almacén de destino.';
        }
        if (!form.responsable.trim()) {
            e.responsable = 'Responsable de la recepción.';
        }
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const enviar = (ev: FormEvent) => {
        ev.preventDefault();
        if (!validar()) return;

        createRecepcion({
            origenTipo: form.origenTipo,
            origenTexto: form.origenTexto,
            referencia: form.referencia,
            materialId: form.materialId,
            cantidad: Number(form.cantidad),
            destinoAlmacenId: form.destinoAlmacenId,
            responsable: form.responsable,
        });

        setForm(FORM_VACIO);
        setAceptado(true);
        setTimeout(() => setAceptado(false), 5000);
    };

    const abrirModalConfirmacion = (rec: Recepcion) => {
        setConfirmar(rec);
        setTipoResultado('conforme');
        setConformeCheck(false);
        setMotivoDisconformidad('');
        setEvidencia(rec.evidencia);
        setErrores({});
    };

    const procesarConfirmacion = () => {
        if (!confirmar) return;

        if (tipoResultado === 'conforme') {
            if (!conformeCheck) {
                setErrores({ global: 'Marca la casilla de verificación y conformidad técnica.' });
                return;
            }
            confirmReceipt(confirmar.id);
            setConfirmadoIds((ids) => [confirmar.id, ...ids]);
            setConfirmar(null);
        } else {
            // Registrar disconformidad formal y derivar a devolución (Bizagi 20 -> 21)
            if (!motivoDisconformidad.trim()) {
                setErrores({ global: 'Debes detallar el motivo de la disconformidad.' });
                return;
            }

            createDevolucion({
                ordenCompraId: confirmar.referencia,
                proveedorNombre: confirmar.origenTexto,
                materialId: confirmar.materialId,
                cantidadDevuelta: confirmar.cantidad,
                motivoDevolucion: motivoDisconformidad,
                fechaRegistro: new Date().toISOString().slice(0, 10),
                fechaLimiteRespuesta: new Date(Date.now() + 432000000).toISOString().slice(0, 10),
                estado: 'registrada',
                numeroGuiaDevolucion: `GDR-${Date.now().toString().slice(-4)}`,
                accionCompensatoria: 'reposicion_fisica',
            });

            setConfirmar(null);
            alert('Disconformidad registrada y notificada a Logística para devolución a proveedor.');
        }
    };

    const pinReceptor = confirmadoIds[0] ? recepciones.find((r) => r.id === confirmadoIds[0]) ?? null : null;
    const obraDelPin = pinReceptor ? almacenes.find((a) => a.id === pinReceptor.destinoAlmacenId)?.obraId : undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Recepción de Obra"
                subtitle="Verificación física contra OC y Guía de Remisión, conformidad y actualización de stock"
            />

            {aceptado && (
                <AlertaBanner
                    kind="info"
                    title="Recepción registrada en bandeja"
                    mensaje="La recepción quedó en estado pendiente. Completa la verificación física para actualizar el saldo en la Matriz de Stock."
                />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Bandeja de Recepciones Pendientes */}
                <Card title={`Bandeja de Pendientes de Verificación (${pendientes.length})`} className="lg:col-span-2">
                    {pendientes.length === 0 ? (
                        <EmptyState title="Sin recepciones pendientes de ingreso" />
                    ) : (
                        <DataTable<Recepcion>
                            columns={[
                                { key: 'codigo', header: 'Código', mono: true },
                                { key: 'origen', header: 'Origen', cell: (r) => <span className="font-semibold text-ink text-xs">{r.origenTexto}</span> },
                                { key: 'material', header: 'Material', cell: (r) => <span className="text-xs font-bold text-ink">{materialNombre(r.materialId)}</span> },
                                { key: 'cantidad', header: 'Cant.', align: 'right', mono: true, cell: (r) => formatNum(r.cantidad) },
                                { key: 'destino', header: 'Almacén Destino', cell: (r) => almacenes.find((a) => a.id === r.destinoAlmacenId)?.nombre ?? '-' },
                                { key: 'fecha', header: 'Fecha', cell: (r) => formatFs(r.fecha) },
                                {
                                    key: 'acciones',
                                    header: '',
                                    align: 'right',
                                    cell: (r) => (
                                        <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => abrirModalConfirmacion(r)}>
                                            <IconCheck size={13} />
                                            Verificar
                                        </button>
                                    ),
                                },
                            ]}
                            rows={pendientes}
                        />
                    )}
                </Card>

                {/* Formulario de Registro de Recepción */}
                <Card title="Registrar Ingreso de Carga">
                    <form onSubmit={enviar} className="space-y-4 text-xs">
                        <Field label="Origen del Suministro" required>
                            <div className="flex gap-2">
                                {(['proveedor', 'otra-obra'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => set('origenTipo', t)}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                            form.origenTipo === t
                                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                : 'border-line text-muted hover:border-brand-300'
                                        }`}
                                    >
                                        {t === 'proveedor' ? 'Proveedor Externo' : 'Otra Obra'}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <Field label={form.origenTipo === 'proveedor' ? 'Proveedor' : 'Despacho Interno'} required error={errores.origenTexto}>
                            {form.origenTipo === 'otra-obra' ? (
                                <Select value={form.origenTexto} onChange={(e) => set('origenTexto', e.target.value)} invalid={!!errores.origenTexto}>
                                    <option value="">Selecciona despacho entregado…</option>
                                    {despachosInternos.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input
                                    value={form.origenTexto}
                                    onChange={(e) => set('origenTexto', e.target.value)}
                                    placeholder="p. ej. Distribuidora Andina SAC"
                                    invalid={!!errores.origenTexto}
                                />
                            )}
                        </Field>

                        <Field label="Guía de Remisión / Orden de Compra" required error={errores.referencia}>
                            <Input value={form.referencia} onChange={(e) => set('referencia', e.target.value)} placeholder="GR-001-09823 / OC-2026-089" invalid={!!errores.referencia} />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Material" required error={errores.materialId}>
                                <Select value={form.materialId} onChange={(e) => set('materialId', e.target.value)} invalid={!!errores.materialId}>
                                    <option value="">Elegir…</option>
                                    {materiales.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.nombre}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Cantidad Recibida" required error={errores.cantidad}>
                                <Input type="number" min={1} value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} placeholder="0" invalid={!!errores.cantidad} />
                            </Field>
                        </div>

                        <Field label="Almacén de Destino" required error={errores.destinoAlmacenId}>
                            <Select value={form.destinoAlmacenId} onChange={(e) => set('destinoAlmacenId', e.target.value)} invalid={!!errores.destinoAlmacenId}>
                                <option value="">Elegir almacén…</option>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Almacenero Responsable" required error={errores.responsable}>
                            <Input value={form.responsable} onChange={(e) => set('responsable', e.target.value)} placeholder="Nombre del almacenero" invalid={!!errores.responsable} />
                        </Field>

                        <Button type="submit" variant="primary" className="w-full">
                            <IconPlus size={15} />
                            Registrar para Verificación
                        </Button>
                    </form>
                </Card>
            </div>

            {/* Recepciones Confirmadas con Geolocalización */}
            <Card title="Ingresos Confirmados y Puntos de Recepción" subtitle="Trazabilidad con coordenadas del punto de acopio">
                <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Últimos ingresos validados:</p>
                        {recientes.length === 0 ? (
                            <EmptyState title="Sin recepciones confirmadas aún" />
                        ) : (
                            <ul className="space-y-2">
                                {recientes.slice(0, 4).map((r) => (
                                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3 bg-surface text-xs">
                                        <div className="min-w-0">
                                            <p className="font-bold text-ink truncate">
                                                {r.codigo} · {materialNombre(r.materialId)}
                                            </p>
                                            <p className="text-[11px] text-muted">
                                                {formatNum(r.cantidad)} {materiales.find((m) => m.id === r.materialId)?.unidad} →{' '}
                                                <strong>{almacenes.find((a) => a.id === r.destinoAlmacenId)?.nombre ?? ''}</strong>
                                            </p>
                                            <p className="text-[10px] text-muted mt-0.5">Resp: {r.responsable} · {formatFs(r.fecha)}</p>
                                        </div>
                                        <Badge tone="ok">Conformidad Firmada</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-xl border border-line overflow-hidden">
                        <MapaLeaflet obras={obras} almacenes={almacenes} stock={stock} materiales={materiales} seleccionadaId={obraDelPin} />
                    </div>
                </div>
            </Card>

            {/* Modal de Verificación, Conformidad o Disconformidad */}
            <Modal open={!!confirmar} onClose={() => setConfirmar(null)} title="Verificación Física de Carga" wide>
                {confirmar && (
                    <div className="space-y-4 text-xs">
                        <div className="rounded-xl bg-soft/60 p-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted block">GUÍA / DOCUMENTO</span>
                                    <span className="font-bold text-ink">{confirmar.referencia}</span>
                                </div>
                                <div>
                                    <span className="text-muted block">PROVEEDOR / ORIGEN</span>
                                    <span className="font-bold text-ink">{confirmar.origenTexto}</span>
                                </div>
                                <div>
                                    <span className="text-muted block">MATERIAL DECLARADO</span>
                                    <span className="font-bold text-ink text-sm">
                                        {materialNombre(confirmar.materialId)} ({formatNum(confirmar.cantidad)}{' '}
                                        {materiales.find((m) => m.id === confirmar.materialId)?.unidad})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted block">ALMACÉN DE INGRESO</span>
                                    <span className="font-bold text-brand-700">
                                        {almacenes.find((a) => a.id === confirmar.destinoAlmacenId)?.nombre}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {errores.global && <p className="text-sm font-medium text-danger">{errores.global}</p>}

                        {/* Selección de Tipo de Resultado: Conforme vs Disconforme */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTipoResultado('conforme')}
                                className={`flex-1 rounded-xl border p-3 font-bold transition-all text-xs ${
                                    tipoResultado === 'conforme'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                                        : 'border-line text-muted hover:bg-soft'
                                }`}
                            >
                                ✓ Recepción Conforme (Ingresar a Inventario)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTipoResultado('disconforme')}
                                className={`flex-1 rounded-xl border p-3 font-bold transition-all text-xs ${
                                    tipoResultado === 'disconforme'
                                        ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                                        : 'border-line text-muted hover:bg-soft'
                                }`}
                            >
                                ⚠ Disconformidad / Dañado (Notificar a Logística)
                            </button>
                        </div>

                        {tipoResultado === 'conforme' ? (
                            <div className="space-y-3">
                                <FileUpload
                                    label="Evidencia Fotográfica de Recepción (Simulada)"
                                    accept="image/*,application/pdf"
                                    value={evidencia}
                                    onChange={setEvidencia}
                                />
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/50 p-3">
                                    <input
                                        type="checkbox"
                                        checked={conformeCheck}
                                        onChange={(e) => setConformeCheck(e.target.checked)}
                                        className="h-4 w-4 rounded border-line text-emerald-600"
                                    />
                                    <span className="text-xs font-semibold text-emerald-950">
                                        Doy fe de la conformidad física, cantidad e integridad técnica del material según OC.
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                                <Field label="Detalle de la Disconformidad">
                                    <Textarea
                                        value={motivoDisconformidad}
                                        onChange={(e) => setMotivoDisconformidad(e.target.value)}
                                        placeholder="Describir faltantes, roturas, especificaciones incorrectas o defectos de fábrica…"
                                        rows={3}
                                        required
                                    />
                                </Field>
                                <p className="text-[11px] text-rose-800">
                                    Al registrar la disconformidad, se notificará al Jefe de Logística y se generará un
                                    expediente de devolución al proveedor.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-line">
                            <Button variant="secondary" onClick={() => setConfirmar(null)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={procesarConfirmacion}
                                className={tipoResultado === 'disconforme' ? '!bg-rose-600 hover:!bg-rose-700' : ''}
                            >
                                <IconCheck size={15} />
                                {tipoResultado === 'conforme' ? 'Confirmar e Ingresar a Stock' : 'Notificar Disconformidad'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}