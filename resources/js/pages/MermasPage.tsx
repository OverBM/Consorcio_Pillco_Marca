// Módulo de Mermas y Devoluciones (Macroprocesos Bizagi 21 y 30)
// y Auditoría de Inconsistencias de Inventario (Bizagi 29).
// Registro de mermas por deterioro, robo u obsolescencia, control de umbral tolerable (ej. 3%),
// baja contable de stock sin bloqueo y devoluciones a proveedores con reposición.

import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Button, Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatFs, formatNum } from '../utils/format';
import type { DevolucionProveedor, InconsistenciaInventario, RegistroMerma, TipoMerma } from '../types';
import {
    IconAlert,
    IconAlertTriangle,
    IconBoxes,
    IconCheck,
    IconFile,
    IconPlus,
    IconRepeat,
    IconSearch,
    IconTrash,
} from '../components/icons';

export default function MermasPage() {
    const {
        mermas,
        devoluciones,
        inconsistencias,
        almacenes,
        materiales,
        stock,
        createMerma,
        createDevolucion,
        resolveInconsistencia,
    } = useAppStore();

    const [tabActiva, setTabActiva] = useState<'mermas' | 'devoluciones' | 'inconsistencias'>('mermas');
    const [modalNuevaMerma, setModalNuevaMerma] = useState(false);
    const [modalNuevaDev, setModalNuevaDev] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    // Formulario de Merma
    const [mermaAlmacenId, setMermaAlmacenId] = useState(almacenes[0]?.id ?? '');
    const [mermaMaterialId, setMermaMaterialId] = useState(materiales[0]?.id ?? '');
    const [mermaCantidad, setMermaCantidad] = useState(10);
    const [mermaTipo, setMermaTipo] = useState<TipoMerma>('deterioro');
    const [mermaUmbralTolerable, setMermaUmbralTolerable] = useState(3.0); // 3% de referencia configurable
    const [mermaDescripcion, setMermaDescripcion] = useState('');

    // Formulario de Devolución a Proveedor
    const [devOC, setDevOC] = useState('OC-2026-089');
    const [devProveedor, setDevProveedor] = useState('Distribuidora Andina de Materiales SAC');
    const [devMaterialId, setDevMaterialId] = useState(materiales[0]?.id ?? '');
    const [devCantidad, setDevCantidad] = useState(15);
    const [devMotivo, setDevMotivo] = useState('Material con defectos de empaque o especificación técnica no conforme.');

    const stockActualAlmacen = stock.stock[mermaAlmacenId]?.[mermaMaterialId] ?? 0;
    const porcentajeCalculado = stockActualAlmacen > 0 ? (Number(mermaCantidad) / stockActualAlmacen) * 100 : 0;
    const superaUmbral = porcentajeCalculado > mermaUmbralTolerable;

    const handleGuardarMerma = (e: React.FormEvent) => {
        e.preventDefault();
        if (Number(mermaCantidad) <= 0) return;

        createMerma({
            almacenId: mermaAlmacenId,
            materialId: mermaMaterialId,
            cantidad: Number(mermaCantidad),
            porcentajeDelStock: Math.round(porcentajeCalculado * 10) / 10,
            umbralTolerablePorcentaje: mermaUmbralTolerable,
            superaUmbral,
            tipo: mermaTipo,
            fechaRegistro: new Date().toISOString().slice(0, 16).replace('T', ' '),
            registradoPor: 'Almacenero de Turno',
            descripcionCausa: mermaDescripcion,
            bajaEfectuada: true,
            investigacionLogisticaRequerida: superaUmbral,
            estadoInvestigacion: superaUmbral ? 'pendiente' : undefined,
        });

        setModalNuevaMerma(false);
        setMermaDescripcion('');
    };

    const handleGuardarDevolucion = (e: React.FormEvent) => {
        e.preventDefault();
        if (Number(devCantidad) <= 0) return;

        createDevolucion({
            ordenCompraId: devOC,
            proveedorNombre: devProveedor,
            materialId: devMaterialId,
            cantidadDevuelta: Number(devCantidad),
            motivoDevolucion: devMotivo,
            fechaRegistro: new Date().toISOString().slice(0, 10),
            fechaLimiteRespuesta: new Date(Date.now() + 432000000).toISOString().slice(0, 10),
            estado: 'en_reclamo_proveedor',
            numeroGuiaDevolucion: `GDR-2026-${Date.now().toString().slice(-4)}`,
            accionCompensatoria: 'reposicion_fisica',
        });

        setModalNuevaDev(false);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mermas y Devoluciones"
                subtitle="Control de pérdidas, umbrales tolerables, bajas de inventario y devoluciones a proveedores"
                actions={
                    <div className="flex gap-2">
                        <button className="btn-secondary text-xs" onClick={() => setModalNuevaDev(true)}>
                            <IconRepeat size={14} />
                            + Devolución Proveedor
                        </button>
                        <button className="btn-primary text-xs !bg-rose-600 hover:!bg-rose-700" onClick={() => setModalNuevaMerma(true)}>
                            <IconPlus size={14} />
                            + Registrar Merma
                        </button>
                    </div>
                }
            />

            {/* Pestañas de Vista */}
            <div className="flex border-b border-line gap-2">
                <button
                    onClick={() => setTabActiva('mermas')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'mermas'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconTrash size={15} />
                    Control de Mermas ({mermas.length})
                </button>
                <button
                    onClick={() => setTabActiva('devoluciones')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'devoluciones'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconRepeat size={15} />
                    Devoluciones a Proveedores ({devoluciones.length})
                </button>
                <button
                    onClick={() => setTabActiva('inconsistencias')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                        tabActiva === 'inconsistencias'
                            ? 'border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg'
                            : 'border-transparent text-muted hover:text-ink'
                    }`}
                >
                    <IconAlertTriangle size={15} />
                    Inconsistencias de Inventario ({inconsistencias.length})
                </button>
            </div>

            {/* TAB 1: Control de Mermas (Bizagi 30) */}
            {tabActiva === 'mermas' && (
                <Card
                    title="Registro de Mermas y Materiales Dañados"
                    subtitle="Clasificación por deterioro, robo u obsolescencia y control contra umbral de tolerancia"
                >
                    <DataTable<RegistroMerma>
                        emptyLabel="Sin mermas registradas."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'N° Registro',
                                mono: true,
                                cell: (m) => <span className="font-bold text-ink">{m.codigo}</span>,
                            },
                            {
                                key: 'almacen',
                                header: 'Almacén',
                                cell: (m) => {
                                    const alm = almacenes.find((a) => a.id === m.almacenId);
                                    return <span className="font-semibold text-ink text-xs">{alm?.nombre ?? m.almacenId}</span>;
                                },
                            },
                            {
                                key: 'material',
                                header: 'Material y Cantidad',
                                cell: (m) => {
                                    const mat = materiales.find((x) => x.id === m.materialId);
                                    return (
                                        <div>
                                            <p className="font-bold text-ink text-xs">{mat?.nombre ?? m.materialId}</p>
                                            <p className="font-mono text-[11px] text-rose-700 font-bold">
                                                -{formatCantidad(m.cantidad)} {mat?.unidad ?? 'und'}
                                            </p>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'tipo',
                                header: 'Clasificación',
                                cell: (m) => (
                                    <Badge tone={m.tipo === 'robo' ? 'danger' : m.tipo === 'deterioro' ? 'warn' : 'neutral'}>
                                        {m.tipo.toUpperCase()}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'umbral',
                                header: 'Impacto / Umbral',
                                cell: (m) => (
                                    <div>
                                        <p className="font-bold text-xs">{m.porcentajeDelStock}% del stock</p>
                                        <p className="text-[10px] text-muted">Umbral tol: {m.umbralTolerablePorcentaje}%</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'estado',
                                header: 'Estado / Auditoría',
                                cell: (m) =>
                                    m.superaUmbral ? (
                                        <Badge tone="danger">
                                            Sobre Umbral (Alerta Logística)
                                        </Badge>
                                    ) : (
                                        <Badge tone="ok">Dentro de tolerancia</Badge>
                                    ),
                            },
                            {
                                key: 'causa',
                                header: 'Causa Declarada',
                                cell: (m) => <span className="text-xs text-muted block max-w-52 truncate">{m.descripcionCausa}</span>,
                            },
                        ]}
                        rows={mermas}
                    />
                </Card>
            )}

            {/* TAB 2: Devoluciones a Proveedores (Bizagi 21) */}
            {tabActiva === 'devoluciones' && (
                <Card
                    title="Devoluciones y Reclamos a Proveedores"
                    subtitle="Seguimiento de guías de devolución, notas de crédito y reposiciones"
                >
                    <DataTable<DevolucionProveedor>
                        emptyLabel="Sin devoluciones a proveedores registradas."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'N° Devolución',
                                mono: true,
                                cell: (d) => <span className="font-bold text-ink">{d.codigo}</span>,
                            },
                            {
                                key: 'guia',
                                header: 'N° Guía Devolución',
                                mono: true,
                                cell: (d) => <span className="text-xs text-muted">{d.numeroGuiaDevolucion}</span>,
                            },
                            {
                                key: 'proveedor',
                                header: 'Proveedor / OC',
                                cell: (d) => (
                                    <div>
                                        <p className="font-bold text-ink text-xs">{d.proveedorNombre}</p>
                                        <p className="font-mono text-[10px] text-muted">Ref: {d.ordenCompraId}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'material',
                                header: 'Material Devuelto',
                                cell: (d) => {
                                    const mat = materiales.find((m) => m.id === d.materialId);
                                    return (
                                        <span className="font-bold text-ink text-xs">
                                            {formatCantidad(d.cantidadDevuelta)} {mat?.unidad} de {mat?.nombre}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'motivo',
                                header: 'Motivo del Reclamo',
                                cell: (d) => <span className="text-xs text-muted block max-w-56 truncate">{d.motivoDevolucion}</span>,
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (d) => (
                                    <Badge tone={d.estado === 'cerrada' ? 'ok' : 'warn'}>
                                        {d.estado.replace(/_/g, ' ')}
                                    </Badge>
                                ),
                            },
                        ]}
                        rows={devoluciones}
                    />
                </Card>
            )}

            {/* TAB 3: Inconsistencias de Inventario (Bizagi 29) */}
            {tabActiva === 'inconsistencias' && (
                <Card
                    title="Control y Conciliación de Inconsistencias Multi-Almacén"
                    subtitle="Diferencias detectadas entre cantidades despachadas vs recibidas conforme a la regla Recibido + Merma = Despachado"
                >
                    <DataTable<InconsistenciaInventario>
                        emptyLabel="Sin inconsistencias de inventario detectadas."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'N° Incidencia',
                                mono: true,
                                cell: (i) => <span className="font-bold text-ink">{i.codigo}</span>,
                            },
                            {
                                key: 'operacion',
                                header: 'Operación Origen',
                                cell: (i) => (
                                    <div>
                                        <p className="font-bold text-ink text-xs">{i.operacionCodigo}</p>
                                        <p className="text-[10px] text-muted capitalize">{i.tipoOperacion}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'material',
                                header: 'Material / Diferencia',
                                cell: (i) => {
                                    const mat = materiales.find((m) => m.id === i.materialId);
                                    return (
                                        <div>
                                            <p className="font-bold text-ink text-xs">{mat?.nombre}</p>
                                            <p className="font-mono text-xs font-bold text-rose-700">
                                                Diferencia: -{formatCantidad(i.saldoDiferencia)} {mat?.unidad}
                                            </p>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'balance',
                                header: 'Despachado vs Recibido',
                                cell: (i) => (
                                    <span className="font-mono text-xs">
                                        {i.cantidadOrigen} desp. ➔ {i.cantidadDestinoConforme} rec.
                                    </span>
                                ),
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (i) => (
                                    <Badge tone={i.estado === 'conciliado' ? 'ok' : 'danger'}>
                                        {i.estado === 'pendiente_revision' ? 'Pendiente de Revisión (Almacén)' : 'Conciliado'}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (i) => (
                                    <div className="flex items-center justify-end">
                                        {i.estado === 'pendiente_revision' && (
                                            <button
                                                onClick={() => resolveInconsistencia(i.id, 'Auditado y regularizado contablemente')}
                                                className="btn-secondary !px-2.5 !py-1 text-xs"
                                                title="Propuesta: Conciliar y cerrar inconsistencia tras investigación"
                                            >
                                                <IconCheck size={13} />
                                                Conciliar
                                            </button>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        rows={inconsistencias}
                    />
                </Card>
            )}

            {/* Modal de Registro de Merma */}
            <Modal open={modalNuevaMerma} onClose={() => setModalNuevaMerma(false)} title="Registrar Merma o Material Dañado" wide>
                <form onSubmit={handleGuardarMerma} className="space-y-4 text-xs">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Almacén de Ubicación">
                            <Select value={mermaAlmacenId} onChange={(e) => setMermaAlmacenId(e.target.value)}>
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Clasificación de la Pérdida">
                            <Select value={mermaTipo} onChange={(e) => setMermaTipo(e.target.value as TipoMerma)}>
                                <option value="deterioro">Deterioro / Daño físico</option>
                                <option value="robo">Hurto / Pérdida no identificada</option>
                                <option value="obsolescencia">Obsolescencia / Fraguado</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Material">
                            <Select value={mermaMaterialId} onChange={(e) => setMermaMaterialId(e.target.value)}>
                                {materiales.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} ({m.unidad})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Cantidad a dar de Baja">
                            <Input
                                type="number"
                                min={1}
                                max={stockActualAlmacen}
                                value={mermaCantidad}
                                onChange={(e) => setMermaCantidad(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Umbral Tolerable Referencial (%)">
                            <Input
                                type="number"
                                min={0.1}
                                step={0.1}
                                value={mermaUmbralTolerable}
                                onChange={(e) => setMermaUmbralTolerable(Number(e.target.value))}
                                required
                            />
                        </Field>
                    </div>

                    {/* Verificación de Umbral en Tiempo Real */}
                    <div className={`rounded-xl border p-3 ${superaUmbral ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>
                        <div className="flex justify-between font-bold">
                            <span>Impacto en Stock del Almacén:</span>
                            <span className="font-mono">{porcentajeCalculado.toFixed(1)}% del stock actual ({formatCantidad(stockActualAlmacen)})</span>
                        </div>
                        {superaUmbral ? (
                            <p className="mt-1 text-[11px]">
                                ⚠ <strong>Supera el umbral tolerable ({mermaUmbralTolerable}%):</strong> Se emitirá una
                                alerta al Jefe de Logística para investigación formal. La baja se aplicará directamente al inventario.
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px]">
                                ✓ Pérdida dentro del umbral tolerable de operación.
                            </p>
                        )}
                    </div>

                    <Field label="Descripción de la Causa o Incidente">
                        <Textarea
                            value={mermaDescripcion}
                            onChange={(e) => setMermaDescripcion(e.target.value)}
                            placeholder="Detallar condiciones ambientales, manipulación o motivo del deterioro…"
                            rows={2}
                            required
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" onClick={() => setModalNuevaMerma(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="!bg-rose-600 hover:!bg-rose-700">
                            <IconTrash size={15} />
                            Registrar y Procesar Baja de Stock
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Devolución a Proveedor */}
            <Modal open={modalNuevaDev} onClose={() => setModalNuevaDev(false)} title="Registrar Devolución a Proveedor" wide>
                <form onSubmit={handleGuardarDevolucion} className="space-y-4 text-xs">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Orden de Compra / Guía de Referencia">
                            <Input value={devOC} onChange={(e) => setDevOC(e.target.value)} required />
                        </Field>
                        <Field label="Proveedor Destinatario">
                            <Input value={devProveedor} onChange={(e) => setDevProveedor(e.target.value)} required />
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Material">
                            <Select value={devMaterialId} onChange={(e) => setDevMaterialId(e.target.value)}>
                                {materiales.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} ({m.unidad})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Cantidad a Devolver">
                            <Input
                                type="number"
                                min={1}
                                value={devCantidad}
                                onChange={(e) => setDevCantidad(Number(e.target.value))}
                                required
                            />
                        </Field>
                    </div>

                    <Field label="Motivo Técnico del Reclamo">
                        <Textarea
                            value={devMotivo}
                            onChange={(e) => setDevMotivo(e.target.value)}
                            placeholder="Indicar no conformidad o defecto de fábrica…"
                            rows={2}
                            required
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" onClick={() => setModalNuevaDev(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            <IconRepeat size={15} />
                            Emitir Guía de Devolución
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
