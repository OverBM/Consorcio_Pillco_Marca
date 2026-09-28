// Módulo de Requerimientos y Compras (Macroprocesos Bizagi 16, 17, 18 y 19).
// Requerimientos con control presupuestal, matriz multicriterio de cotizaciones de proveedores,
// generación de Órdenes de Compra y coordinación de transporte interno o tercerizado.

import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Button, Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatNum } from '../utils/format';
import type { CotizacionProveedor, OrdenCompra, RequerimientoCompra, RequerimientoItem } from '../types';
import {
    IconAlert,
    IconBoxes,
    IconCheck,
    IconDownload,
    IconFile,
    IconPlus,
    IconSearch,
    IconShoppingCart,
    IconSparkles,
    IconTruck,
} from '../components/icons';

export default function ComprasPage() {
    const {
        requerimientos,
        cotizaciones,
        ordenesCompra,
        transportes,
        obras,
        almacenes,
        materiales,
        obraActiva,
        createRequerimiento,
        approveRequerimiento,
        createCotizacion,
        selectCotizacion,
        createOrdenCompra,
    } = useAppStore();

    const [tabActiva, setTabActiva] = useState<'requerimientos' | 'cotizaciones' | 'ordenes' | 'transportes'>('requerimientos');

    // Modales
    const [modalNuevoReq, setModalNuevoReq] = useState(false);
    const [modalNuevaCot, setModalNuevaCot] = useState(false);
    const [modalGenerarOC, setModalGenerarOC] = useState(false);
    const [reqSeleccionado, setReqSeleccionado] = useState<RequerimientoCompra | null>(null);

    // Formulario de Requerimiento
    const [formObraId, setFormObraId] = useState(obraActiva.id);
    const [formPartida, setFormPartida] = useState('Partida 04.01 — Obras de Concreto');
    const [formPresupuesto, setFormPresupuesto] = useState(30000);
    const [formItems, setFormItems] = useState<RequerimientoItem[]>([
        { materialId: 'mat-cemento-1', cantidad: 500, costoEstimadoUnitario: 31.5, subtotal: 15750 },
    ]);
    const [formJustificacion, setFormJustificacion] = useState('');
    const [formFechaLimite, setFormFechaLimite] = useState(
        new Date(Date.now() + 604800000).toISOString().slice(0, 10),
    );

    // Formulario de Cotización
    const [cotReqId, setCotReqId] = useState(requerimientos[0]?.id ?? '');
    const [cotRuc, setCotRuc] = useState('20584938291');
    const [cotNombre, setCotNombre] = useState('Ferretería Industrial del Centro SAC');
    const [cotPrecio, setCotPrecio] = useState(15500);
    const [cotDias, setCotDias] = useState(3);
    const [cotGarantia, setCotGarantia] = useState(12);
    const [cotCumple, setCotCumple] = useState(true);
    const [cotObs, setCotObs] = useState('');

    // Formulario de Generación de Orden de Compra
    const [ocReq, setOcReq] = useState<RequerimientoCompra | null>(null);
    const [ocCot, setOcCot] = useState<CotizacionProveedor | null>(null);
    const [ocCondiciones, setOcCondiciones] = useState('Crédito 30 días contra factura y guía conforme');
    const [ocAlmacenDestino, setOcAlmacenDestino] = useState(almacenes[0]?.id ?? '');
    const [ocTipoTransporte, setOcTipoTransporte] = useState<'propio' | 'tercerizado'>('tercerizado');

    // Cálculos de costo total estimado y sobrecosto
    const costoTotalEstimado = formItems.reduce((acc, it) => acc + it.subtotal, 0);
    const excedePresupuesto = costoTotalEstimado > formPresupuesto;
    const montoExcedente = Math.max(0, costoTotalEstimado - formPresupuesto);

    const handleAddItem = () => {
        setFormItems((prev) => [
            ...prev,
            { materialId: materiales[1]?.id ?? 'mat-acero', cantidad: 100, costoEstimadoUnitario: 10, subtotal: 1000 },
        ]);
    };

    const handleUpdateItem = (index: number, patch: Partial<RequerimientoItem>) => {
        setFormItems((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, ...patch };
                updated.subtotal = updated.cantidad * updated.costoEstimadoUnitario;
                return updated;
            }),
        );
    };

    const handleGuardarRequerimiento = (e: React.FormEvent) => {
        e.preventDefault();
        createRequerimiento({
            obraId: formObraId,
            partidaPresupuestal: formPartida,
            presupuestoAsignado: Number(formPresupuesto),
            costoTotalEstimado,
            excedePresupuesto,
            montoExcedente,
            fechaEmision: new Date().toISOString().slice(0, 10),
            fechaLimiteEntrega: formFechaLimite,
            solicitadoPor: 'Residente de Obra',
            justificacion: formJustificacion,
            estado: excedePresupuesto ? 'requiere_aprobacion' : 'en_cotizacion',
            items: formItems,
            aprobacionAdicional: excedePresupuesto
                ? { solicitada: true, motivo: formJustificacion }
                : undefined,
        });
        setModalNuevoReq(false);
    };

    const handleGuardarCotizacion = (e: React.FormEvent) => {
        e.preventDefault();
        // Cálculo ponderado de ejemplo (Precio 50%, Plazo 30%, Garantía/Calidad 20%)
        const puntaje = Math.max(
            50,
            Math.min(
                100,
                Math.round(100 - (cotPrecio / 1000) * 0.5 - cotDias * 3 + (cotGarantia / 12) * 10),
            ),
        );

        createCotizacion({
            requerimientoId: cotReqId,
            proveedorRuc: cotRuc,
            proveedorNombre: cotNombre,
            precioTotalSoles: Number(cotPrecio),
            plazoEntregaDias: Number(cotDias),
            garantiaMeses: Number(cotGarantia),
            puntajeCalculado: puntaje,
            cumpleTecnico: cotCumple,
            esRecomendado: puntaje > 88,
            observaciones: cotObs,
        });
        setModalNuevaCot(false);
    };

    const handleEmitirOC = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ocReq || !ocCot) return;

        createOrdenCompra({
            requerimientoId: ocReq.id,
            proveedorRuc: ocCot.proveedorRuc,
            proveedorNombre: ocCot.proveedorNombre,
            fechaEmision: new Date().toISOString().slice(0, 10),
            fechaCompromisoEntrega: new Date(Date.now() + ocCot.plazoEntregaDias * 86400000).toISOString().slice(0, 10),
            montoTotal: ocCot.precioTotalSoles,
            condicionesPago: ocCondiciones,
            lugarEntrega: almacenes.find((a) => a.id === ocAlmacenDestino)?.nombre ?? 'Almacén de Obra',
            almacenDestinoId: ocAlmacenDestino,
            estado: 'confirmada_proveedor',
            items: ocReq.items.map((it) => ({
                materialId: it.materialId,
                cantidad: it.cantidad,
                precioUnitario: it.costoEstimadoUnitario,
                total: it.subtotal,
            })),
        });

        setModalGenerarOC(false);
        setTabActiva('ordenes');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Requerimientos y Compras"
                subtitle="Control presupuestal, cotización comparada multicriterio y órdenes de compra con fletes"
                actions={
                    <button className="btn-primary" onClick={() => setModalNuevoReq(true)}>
                        <IconPlus size={16} />
                        Nuevo Requerimiento de Compra
                    </button>
                }
            />

            {/* Pestañas de Proceso */}
            <div className="flex border-b border-line gap-2">
                <button
                    onClick={() => setTabActiva('requerimientos')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'requerimientos'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconShoppingCart size={15} />
                    Requerimientos ({requerimientos.length})
                </button>
                <button
                    onClick={() => setTabActiva('cotizaciones')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'cotizaciones'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconFile size={15} />
                    Cuadro Comparativo ({cotizaciones.length})
                </button>
                <button
                    onClick={() => setTabActiva('ordenes')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'ordenes'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconBoxes size={15} />
                    Órdenes de Compra ({ordenesCompra.length})
                </button>
                <button
                    onClick={() => setTabActiva('transportes')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'transportes'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconTruck size={15} />
                    Coordinación de Transporte ({transportes.length})
                </button>
            </div>

            {/* TAB 1: Requerimientos y Control Presupuestal (Bizagi 16) */}
            {tabActiva === 'requerimientos' && (
                <Card title="Bandeja de Requerimientos de Compra por Obra" subtitle="Control de costo estimado contra presupuesto asignado">
                    <DataTable<RequerimientoCompra>
                        emptyLabel="Sin requerimientos registrados."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'Código',
                                mono: true,
                                cell: (r) => <span className="font-bold text-ink">{r.codigo}</span>,
                            },
                            {
                                key: 'obra',
                                header: 'Obra / Partida',
                                cell: (r) => {
                                    const obra = obras.find((o) => o.id === r.obraId);
                                    return (
                                        <div>
                                            <p className="font-bold text-ink text-xs">{obra?.nombre ?? r.obraId}</p>
                                            <p className="text-[11px] text-muted">{r.partidaPresupuestal}</p>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'presupuesto',
                                header: 'Presupuesto Asignado',
                                align: 'right',
                                cell: (r) => <span className="font-mono font-bold text-ink">S/ {formatNum(r.presupuestoAsignado)}</span>,
                            },
                            {
                                key: 'estimado',
                                header: 'Costo Estimado',
                                align: 'right',
                                cell: (r) => (
                                    <span className={`font-mono font-bold ${r.excedePresupuesto ? 'text-rose-700' : 'text-emerald-700'}`}>
                                        S/ {formatNum(r.costoTotalEstimado)}
                                    </span>
                                ),
                            },
                            {
                                key: 'control',
                                header: 'Control Presupuestal',
                                cell: (r) =>
                                    r.excedePresupuesto ? (
                                        <Badge tone="warn">
                                            Excede S/ {formatNum(r.montoExcedente)}
                                        </Badge>
                                    ) : (
                                        <Badge tone="ok">Dentro de presupuesto</Badge>
                                    ),
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (r) => (
                                    <Badge tone={r.estado === 'requiere_aprobacion' ? 'danger' : r.estado === 'aprobado' ? 'ok' : 'neutral'}>
                                        {r.estado === 'requiere_aprobacion'
                                            ? 'Requiere Aprobación Adicional'
                                            : r.estado.replace('_', ' ')}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (r) => (
                                    <div className="flex items-center justify-end gap-1.5">
                                        {r.estado === 'requiere_aprobacion' && (
                                            <button
                                                onClick={() => approveRequerimiento(r.id)}
                                                className="btn-primary !px-2 !py-1 text-xs"
                                                title="Autorizar sobrecosto para continuar a cotización"
                                            >
                                                <IconCheck size={13} />
                                                Autorizar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setCotReqId(r.id);
                                                setModalNuevaCot(true);
                                            }}
                                            className="btn-secondary !px-2 !py-1 text-xs"
                                            title="Registrar cotización de proveedor"
                                        >
                                            + Cotización
                                        </button>
                                    </div>
                                ),
                            },
                        ]}
                        rows={requerimientos}
                    />
                </Card>
            )}

            {/* TAB 2: Cuadro Comparativo Multicriterio (Bizagi 17) */}
            {tabActiva === 'cotizaciones' && (
                <Card
                    title="Cuadro Comparativo de Proveedores"
                    subtitle="Evaluación multicriterio por Precio, Plazo de entrega y Garantía técnica"
                    action={
                        <button className="btn-primary text-xs" onClick={() => setModalNuevaCot(true)}>
                            <IconPlus size={14} />
                            Agregar Cotización
                        </button>
                    }
                >
                    <DataTable<CotizacionProveedor>
                        emptyLabel="Sin cotizaciones registradas."
                        columns={[
                            {
                                key: 'req',
                                header: 'Requerimiento',
                                cell: (c) => {
                                    const req = requerimientos.find((r) => r.id === c.requerimientoId);
                                    return <span className="font-bold text-ink text-xs">{req?.codigo ?? c.requerimientoId}</span>;
                                },
                            },
                            {
                                key: 'proveedor',
                                header: 'Proveedor / RUC',
                                cell: (c) => (
                                    <div>
                                        <p className="font-bold text-ink text-xs">{c.proveedorNombre}</p>
                                        <p className="font-mono text-[11px] text-muted">RUC: {c.proveedorRuc}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'precio',
                                header: 'Precio Ofertado',
                                align: 'right',
                                cell: (c) => <span className="font-mono font-bold text-ink">S/ {formatNum(c.precioTotalSoles)}</span>,
                            },
                            {
                                key: 'plazo',
                                header: 'Plazo Entrega',
                                align: 'center',
                                cell: (c) => <span className="font-semibold text-ink text-xs">{c.plazoEntregaDias} días</span>,
                            },
                            {
                                key: 'garantia',
                                header: 'Garantía',
                                align: 'center',
                                cell: (c) => <span className="text-muted text-xs">{c.garantiaMeses} meses</span>,
                            },
                            {
                                key: 'puntaje',
                                header: 'Puntaje Ponderado',
                                align: 'center',
                                cell: (c) => (
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="font-bold text-brand-600">{c.puntajeCalculado} pts</span>
                                        {c.esRecomendado && (
                                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                                                ★ RECOMENDADO
                                            </span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (c) => {
                                    const req = requerimientos.find((r) => r.id === c.requerimientoId);
                                    return (
                                        <button
                                            onClick={() => {
                                                if (req) {
                                                    setOcReq(req);
                                                    setOcCot(c);
                                                    setModalGenerarOC(true);
                                                }
                                            }}
                                            className="btn-primary !px-2.5 !py-1 text-xs"
                                        >
                                            <IconCheck size={13} />
                                            Emitir OC
                                        </button>
                                    );
                                },
                            },
                        ]}
                        rows={cotizaciones}
                    />
                </Card>
            )}

            {/* TAB 3: Órdenes de Compra Emitidas (Bizagi 18) */}
            {tabActiva === 'ordenes' && (
                <Card title="Órdenes de Compra Emitidas" subtitle="Formalización contractual de suministro con plazos de entrega">
                    <DataTable<OrdenCompra>
                        emptyLabel="Sin órdenes de compra registradas."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'N° Orden',
                                mono: true,
                                cell: (oc) => <span className="font-bold text-ink">{oc.codigo}</span>,
                            },
                            {
                                key: 'proveedor',
                                header: 'Proveedor',
                                cell: (oc) => (
                                    <div>
                                        <p className="font-bold text-ink text-xs">{oc.proveedorNombre}</p>
                                        <p className="text-[10px] text-muted">Entrega en: {oc.lugarEntrega}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'monto',
                                header: 'Monto Total',
                                align: 'right',
                                cell: (oc) => <span className="font-mono font-bold text-ink">S/ {formatNum(oc.montoTotal)}</span>,
                            },
                            {
                                key: 'compromiso',
                                header: 'Compromiso de Entrega',
                                cell: (oc) => <span className="text-xs text-muted">{oc.fechaCompromisoEntrega}</span>,
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (oc) => (
                                    <Badge
                                        tone={
                                            oc.estado === 'en_transporte'
                                                ? 'warn'
                                                : oc.estado === 'recepcionada_total'
                                                ? 'ok'
                                                : 'neutral'
                                        }
                                    >
                                        {oc.estado.replace('_', ' ')}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={ordenesCompra}
                    />
                </Card>
            )}

            {/* TAB 4: Coordinación de Transporte (Bizagi 19) */}
            {tabActiva === 'transportes' && (
                <Card title="Coordinación y Logística de Fletes" subtitle="Asignación de unidades vehiculares propias o tercerizadas">
                    <DataTable<any>
                        emptyLabel="Sin transportes en curso."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'N° Guía Flete',
                                mono: true,
                                cell: (t) => <span className="font-bold text-ink">{t.codigo}</span>,
                            },
                            {
                                key: 'tipo',
                                header: 'Modalidad',
                                cell: (t) => (
                                    <Badge tone={t.tipoTransporte === 'propio' ? 'neutral' : 'ok'}>
                                        {t.tipoTransporte === 'propio' ? 'Flota Propia' : 'Tercerizado'}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'ruta',
                                header: 'Ruta de Transporte',
                                cell: (t) => (
                                    <div>
                                        <p className="font-semibold text-ink text-xs">{t.origenNombre} ➔ {t.destinoNombre}</p>
                                        <p className="text-[10px] text-muted">Salida: {t.fechaSalida}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'conductor',
                                header: 'Conductor / Placa',
                                cell: (t) => (
                                    <div>
                                        <p className="font-bold text-ink text-xs">{t.conductorNombre}</p>
                                        <p className="font-mono text-[10px] text-muted">Placa: {t.placaVehiculo}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'flete',
                                header: 'Costo Flete',
                                align: 'right',
                                cell: (t) => <span className="font-mono font-bold text-ink">S/ {formatNum(t.costoFlete)}</span>,
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (t) => (
                                    <Badge tone={t.estado === 'en_ruta' ? 'warn' : 'ok'}>
                                        {t.estado === 'en_ruta' ? 'En ruta' : 'Entregado'}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={transportes}
                    />
                </Card>
            )}

            {/* Modal de Nuevo Requerimiento */}
            <Modal open={modalNuevoReq} onClose={() => setModalNuevoReq(false)} title="Elaborar Requerimiento de Materiales" wide>
                <form onSubmit={handleGuardarRequerimiento} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Frente / Obra">
                            <Select value={formObraId} onChange={(e) => setFormObraId(e.target.value)}>
                                {obras.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.nombre} ({o.distrito})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Partida Presupuestal del Expediente">
                            <Input value={formPartida} onChange={(e) => setFormPartida(e.target.value)} required />
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Presupuesto Asignado a la Partida (S/)">
                            <Input
                                type="number"
                                min={0}
                                value={formPresupuesto}
                                onChange={(e) => setFormPresupuesto(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Fecha Límite de Entrega">
                            <Input
                                type="date"
                                value={formFechaLimite}
                                onChange={(e) => setFormFechaLimite(e.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    {/* Lista de Items Requeridos */}
                    <div className="rounded-xl border border-line p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-ink uppercase">Materiales del Requerimiento</span>
                            <button type="button" onClick={handleAddItem} className="btn-secondary !px-2 !py-1 text-xs">
                                + Agregar Material
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-soft/50 p-2 rounded-lg text-xs">
                                    <div className="col-span-5">
                                        <Select
                                            value={item.materialId}
                                            onChange={(e) => handleUpdateItem(index, { materialId: e.target.value })}
                                        >
                                            {materiales.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.nombre} ({m.unidad})
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="Cant."
                                            value={item.cantidad}
                                            onChange={(e) => handleUpdateItem(index, { cantidad: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.1"
                                            placeholder="P. Unit Est."
                                            value={item.costoEstimadoUnitario}
                                            onChange={(e) => handleUpdateItem(index, { costoEstimadoUnitario: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="col-span-1 text-right font-mono font-bold text-ink">
                                        S/ {formatNum(item.subtotal)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Verificación de Presupuesto en Tiempo Real */}
                    <div className={`rounded-xl border p-3 text-xs ${excedePresupuesto ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'}`}>
                        <div className="flex justify-between items-center font-bold">
                            <span>Costo Total Estimado:</span>
                            <span className="text-sm font-mono">S/ {formatNum(costoTotalEstimado)}</span>
                        </div>
                        {excedePresupuesto ? (
                            <p className="mt-1 text-rose-800">
                                ⚠ <strong>Excede el presupuesto en S/ {formatNum(montoExcedente)}</strong>. Pasará a estado de
                                solicitud de aprobación adicional.
                            </p>
                        ) : (
                            <p className="mt-1 text-emerald-800">
                                ✓ Requerimiento dentro del presupuesto asignado.
                            </p>
                        )}
                    </div>

                    <Field label="Justificación Técnica">
                        <Textarea
                            value={formJustificacion}
                            onChange={(e) => setFormJustificacion(e.target.value)}
                            placeholder="Describir necesidad técnica de la partida…"
                            rows={2}
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" onClick={() => setModalNuevoReq(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            <IconCheck size={15} />
                            Guardar Requerimiento
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Nueva Cotización */}
            <Modal open={modalNuevaCot} onClose={() => setModalNuevaCot(false)} title="Registrar Cotización de Proveedor">
                <form onSubmit={handleGuardarCotizacion} className="space-y-4">
                    <Field label="Requerimiento Asociado">
                        <Select value={cotReqId} onChange={(e) => setCotReqId(e.target.value)}>
                            {requerimientos.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.codigo} — {r.partidaPresupuestal}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="RUC Proveedor">
                            <Input value={cotRuc} onChange={(e) => setCotRuc(e.target.value)} required />
                        </Field>
                        <Field label="Razón Social">
                            <Input value={cotNombre} onChange={(e) => setCotNombre(e.target.value)} required />
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Precio Total Ofertado (S/)">
                            <Input
                                type="number"
                                min={1}
                                value={cotPrecio}
                                onChange={(e) => setCotPrecio(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Plazo de Entrega (Días)">
                            <Input
                                type="number"
                                min={1}
                                value={cotDias}
                                onChange={(e) => setCotDias(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Garantía (Meses)">
                            <Input
                                type="number"
                                min={0}
                                value={cotGarantia}
                                onChange={(e) => setCotGarantia(Number(e.target.value))}
                                required
                            />
                        </Field>
                    </div>

                    <Field label="Observaciones">
                        <Textarea
                            value={cotObs}
                            onChange={(e) => setCotObs(e.target.value)}
                            placeholder="Condiciones de entrega, lugar de acopio, etc."
                            rows={2}
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" onClick={() => setModalNuevaCot(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            <IconCheck size={15} />
                            Registrar Cotización
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Generación de Orden de Compra */}
            <Modal open={modalGenerarOC} onClose={() => setModalGenerarOC(false)} title="Emitir Orden de Compra Formal">
                {ocReq && ocCot && (
                    <form onSubmit={handleEmitirOC} className="space-y-4 text-xs">
                        <div className="rounded-lg bg-soft/60 p-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted block">PROVEEDOR SELECCIONADO</span>
                                    <span className="font-bold text-ink text-sm">{ocCot.proveedorNombre}</span>
                                </div>
                                <div>
                                    <span className="text-muted block">MONTO TOTAL OC</span>
                                    <span className="font-bold text-brand-700 text-sm font-mono">
                                        S/ {formatNum(ocCot.precioTotalSoles)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Field label="Almacén de Obra de Destino">
                            <Select value={ocAlmacenDestino} onChange={(e) => setOcAlmacenDestino(e.target.value)}>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Condiciones de Pago y Entrega">
                            <Input
                                value={ocCondiciones}
                                onChange={(e) => setOcCondiciones(e.target.value)}
                                required
                            />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2 border-t border-line">
                            <Button type="button" variant="secondary" onClick={() => setModalGenerarOC(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary">
                                <IconCheck size={15} />
                                Confirmar y Emitir Orden de Compra
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
