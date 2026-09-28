// Módulo de Solicitudes de Material (Macroprocesos Bizagi 22, 23, 24 y 25).
// Registro por Obrero/Residente, cálculo de cercanía GPS al almacén asignado,
// búsqueda multi-almacén si hay déficit local y alerta de desabastecimiento a Logística.

import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { Button, Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatKm } from '../utils/format';
import { rankWarehousesForRequest } from '../utils/geo';
import type { SolicitudMaterial, UrgenciaSolicitud } from '../types';
import {
    IconAlert,
    IconBoxes,
    IconCheck,
    IconClipboardList,
    IconMapPin,
    IconPlus,
    IconRepeat,
    IconSearch,
    IconTruck,
} from '../components/icons';
import { Link } from '@inertiajs/react';

export default function SolicitudesPage() {
    const {
        solicitudes,
        obras,
        almacenes,
        materiales,
        stock,
        obraActiva,
        rolActivo,
        createSolicitud,
        createDespacho,
    } = useAppStore();

    const [modalCrear, setModalCrear] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroUrgencia, setFiltroUrgencia] = useState('todas');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudMaterial | null>(null);

    // Formulario de nueva solicitud
    const [formObraId, setFormObraId] = useState(obraActiva.id);
    const [formFrente, setFormFrente] = useState(obraActiva.nombre);
    const [formSolicitante, setFormSolicitante] = useState(
        rolActivo === 'obrero_residente' ? 'Ing. Marco Paucar' : 'Residente de Turno',
    );
    const [formMaterialId, setFormMaterialId] = useState(materiales[0]?.id ?? '');
    const [formCantidad, setFormCantidad] = useState(100);
    const [formUrgencia, setFormUrgencia] = useState<UrgenciaSolicitud>('normal');
    const [formFechaRequerida, setFormFechaRequerida] = useState(
        new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    );
    const [formObs, setFormObs] = useState('');

    const obraSeleccionada = obras.find((o) => o.id === formObraId) ?? obraActiva;
    const obrasMap = useMemo(() => new Map(obras.map((o) => [o.id, o])), [obras]);

    // Evaluación en tiempo real del almacén más cercano con stock para el formulario (Bizagi 23, 24, 25)
    const evaluacionAlmacenes = useMemo(() => {
        if (!formMaterialId) return [];
        return rankWarehousesForRequest({
            frenteCoords: obraSeleccionada.coords,
            materialId: formMaterialId,
            cantidadRequerida: Number(formCantidad),
            almacenes,
            obras: Object.fromEntries(obrasMap),
            stock: stock.stock,
        });
    }, [obraSeleccionada, formMaterialId, formCantidad, almacenes, obrasMap, stock.stock]);

    const almacenSugerido = evaluacionAlmacenes[0];
    const tieneDesabastecimientoTotal = evaluacionAlmacenes.every((a) => a.stockDisponible <= 0);

    const handleGuardarSolicitud = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formMaterialId || Number(formCantidad) <= 0) return;

        createSolicitud({
            obraSolicitanteId: formObraId,
            frenteNombre: formFrente,
            frenteCoords: obraSeleccionada.coords,
            solicitanteNombre: formSolicitante,
            rolSolicitante: 'Residente de Obra',
            fechaSolicitud: new Date().toISOString().slice(0, 16).replace('T', ' '),
            fechaRequerida: formFechaRequerida,
            urgencia: formUrgencia,
            materialId: formMaterialId,
            cantidad: Number(formCantidad),
            observaciones: formObs,
            almacenAsignadoId: almacenSugerido?.tieneStockSuficiente ? almacenSugerido.almacen.id : undefined,
            distanciaAsignadaKm: almacenSugerido?.distanciaKm,
            estado: tieneDesabastecimientoTotal
                ? 'desabastecido'
                : almacenSugerido?.tieneStockSuficiente
                ? 'asignado'
                : 'pendiente',
        });

        setModalCrear(false);
        setFormObs('');
    };

    const solicitudesFiltradas = useMemo(() => {
        return solicitudes.filter((s) => {
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const mat = materiales.find((m) => m.id === s.materialId);
                const matchCod = s.codigo.toLowerCase().includes(q);
                const matchSol = s.solicitanteNombre.toLowerCase().includes(q);
                const matchMat = mat?.nombre.toLowerCase().includes(q) ?? false;
                if (!matchCod && !matchSol && !matchMat) return false;
            }
            if (filtroUrgencia !== 'todas' && s.urgencia !== filtroUrgencia) return false;
            if (filtroEstado !== 'todos' && s.estado !== filtroEstado) return false;
            return true;
        });
    }, [solicitudes, busqueda, filtroUrgencia, filtroEstado, materiales]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Solicitudes de Material"
                subtitle="Pedidos de frente de obra, geolocalización de almacén asignado y búsqueda multi-almacén"
                actions={
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setFormObraId(obraActiva.id);
                            setFormFrente(obraActiva.nombre);
                            setModalCrear(true);
                        }}
                    >
                        <IconPlus size={16} />
                        Nueva Solicitud de Material
                    </button>
                }
            />

            {/* Filtros */}
            <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-2 rounded-field border border-line bg-canvas px-3 py-2 text-sm text-muted">
                        <IconSearch size={16} />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar código, solicitante o material…"
                            className="w-full bg-transparent text-ink outline-none placeholder:text-muted/70 text-xs"
                        />
                    </div>
                    <Select value={filtroUrgencia} onChange={(e) => setFiltroUrgencia(e.target.value)} aria-label="Filtrar urgencia">
                        <option value="todas">Todas las urgencias</option>
                        <option value="normal">Normal</option>
                        <option value="urgente">Urgente</option>
                        <option value="critica">Crítica</option>
                    </Select>
                    <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar estado">
                        <option value="todos">Todos los estados</option>
                        <option value="pendiente">Pendiente de evaluación</option>
                        <option value="asignado">Asignado por cercanía</option>
                        <option value="desabastecido">Desabastecido en red</option>
                        <option value="atendido">Atendido / Despachado</option>
                    </Select>
                </div>
            </Card>

            {/* Tabla de Solicitudes */}
            <Card>
                {solicitudesFiltradas.length === 0 ? (
                    <EmptyState
                        title="Sin solicitudes registradas"
                        hint="Genera una nueva solicitud para asignar el almacén más cercano con disponibilidad."
                    />
                ) : (
                    <DataTable<SolicitudMaterial>
                        emptyLabel="Sin solicitudes."
                        columns={[
                            {
                                key: 'codigo',
                                header: 'Código',
                                mono: true,
                                cell: (s) => (
                                    <button
                                        onClick={() => setSolicitudDetalle(s)}
                                        className="font-bold text-brand-600 hover:underline"
                                    >
                                        {s.codigo}
                                    </button>
                                ),
                            },
                            {
                                key: 'fecha',
                                header: 'Fecha',
                                cell: (s) => <span className="text-xs text-muted">{s.fechaSolicitud}</span>,
                            },
                            {
                                key: 'frente',
                                header: 'Frente de Obra / Solicitante',
                                cell: (s) => (
                                    <div>
                                        <p className="font-semibold text-ink text-xs">{s.frenteNombre}</p>
                                        <p className="text-[11px] text-muted">{s.solicitanteNombre}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'material',
                                header: 'Material y Cantidad',
                                cell: (s) => {
                                    const mat = materiales.find((m) => m.id === s.materialId);
                                    return (
                                        <div>
                                            <p className="font-bold text-ink text-xs">{mat?.nombre ?? s.materialId}</p>
                                            <p className="text-[11px] font-mono font-semibold text-brand-700">
                                                {formatCantidad(s.cantidad)} {mat?.unidad ?? 'und'}
                                            </p>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'urgencia',
                                header: 'Urgencia',
                                cell: (s) => (
                                    <Badge
                                        tone={
                                            s.urgencia === 'critica'
                                                ? 'danger'
                                                : s.urgencia === 'urgente'
                                                ? 'warn'
                                                : 'neutral'
                                        }
                                    >
                                        {s.urgencia.toUpperCase()}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'asignacion',
                                header: 'Almacén Asignado (GPS)',
                                cell: (s) => {
                                    const alm = almacenes.find((a) => a.id === s.almacenAsignadoId);
                                    if (!alm) {
                                        return <span className="text-xs text-rose-600 font-semibold">Sin stock cercano</span>;
                                    }
                                    return (
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <IconMapPin size={13} className="text-brand-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-ink">{alm.nombre}</span>
                                                {s.distanciaAsignadaKm !== undefined && (
                                                    <span className="block text-[10px] text-muted">
                                                        a {formatKm(s.distanciaAsignadaKm)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (s) => (
                                    <Badge
                                        tone={
                                            s.estado === 'asignado'
                                                ? 'ok'
                                                : s.estado === 'desabastecido'
                                                ? 'danger'
                                                : s.estado === 'atendido'
                                                ? 'neutral'
                                                : 'warn'
                                        }
                                    >
                                        {s.estado.replace('_', ' ')}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (s) => (
                                    <div className="flex items-center justify-end gap-1.5">
                                        {s.estado === 'asignado' && (
                                            <Link
                                                href={`/despachos?crear=solicitud&solicitudId=${s.id}&materialId=${s.materialId}&origen=${s.almacenAsignadoId}&cantidad=${s.cantidad}`}
                                                className="btn-primary !px-2 !py-1 text-xs"
                                                title="Preparar despacho de salida"
                                            >
                                                <IconTruck size={13} />
                                                Despachar
                                            </Link>
                                        )}
                                        {s.estado === 'desabastecido' && (
                                            <Link
                                                href={`/compras?crear=req&obraId=${s.obraSolicitanteId}&materialId=${s.materialId}&cantidad=${s.cantidad}`}
                                                className="btn-secondary !px-2 !py-1 text-xs !border-rose-300 !text-rose-700"
                                                title="Propuesta: Generar requerimiento de compra por desabastecimiento"
                                            >
                                                <IconBoxes size={13} />
                                                Req. Compra
                                            </Link>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        rows={solicitudesFiltradas}
                    />
                )}
            </Card>

            {/* Modal de Nueva Solicitud con Asignación GPS en Tiempo Real */}
            <Modal open={modalCrear} onClose={() => setModalCrear(false)} title="Registrar Solicitud de Material" wide>
                <form onSubmit={handleGuardarSolicitud} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Frente de Obra Solicitante">
                            <Select
                                value={formObraId}
                                onChange={(e) => {
                                    setFormObraId(e.target.value);
                                    const o = obras.find((x) => x.id === e.target.value);
                                    if (o) setFormFrente(o.nombre);
                                }}
                            >
                                {obras.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.nombre} ({o.distrito})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Nombre del Solicitante / Residente">
                            <Input
                                value={formSolicitante}
                                onChange={(e) => setFormSolicitante(e.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Material Requerido">
                            <Select value={formMaterialId} onChange={(e) => setFormMaterialId(e.target.value)}>
                                {materiales.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nombre} ({m.unidad})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Cantidad Requerida">
                            <Input
                                type="number"
                                min={1}
                                value={formCantidad}
                                onChange={(e) => setFormCantidad(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Nivel de Urgencia">
                            <Select
                                value={formUrgencia}
                                onChange={(e) => setFormUrgencia(e.target.value as UrgenciaSolicitud)}
                            >
                                <option value="normal">Normal (48h)</option>
                                <option value="urgente">Urgente (24h)</option>
                                <option value="critica">Crítica (Inmediato)</option>
                            </Select>
                        </Field>
                    </div>

                    <Field label="Fecha Requerida en Frente">
                        <Input
                            type="date"
                            value={formFechaRequerida}
                            onChange={(e) => setFormFechaRequerida(e.target.value)}
                            required
                        />
                    </Field>

                    <Field label="Observaciones / Justificación de la partida">
                        <Textarea
                            value={formObs}
                            onChange={(e) => setFormObs(e.target.value)}
                            placeholder="Indicar partida de destino o especificaciones particulares…"
                            rows={2}
                        />
                    </Field>

                    {/* Evaluación de Asignación Automática por GPS (Bizagi 23, 24, 25) */}
                    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-900">
                            <IconMapPin size={14} />
                            Asignación Automática de Almacén por Proximidad GPS
                        </h4>

                        <div className="mt-3 space-y-2">
                            {evaluacionAlmacenes.map((res, index) => (
                                <div
                                    key={res.almacen.id}
                                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-all ${
                                        res.esOptimo
                                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                            : res.stockDisponible > 0
                                            ? 'border-line bg-surface'
                                            : 'border-line bg-soft/50 text-muted opacity-75'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                                                res.esOptimo
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-soft text-muted'
                                            }`}
                                        >
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-ink">
                                                {res.almacen.nombre}{' '}
                                                {res.esOptimo && (
                                                    <span className="ml-1 text-[10px] text-emerald-700 font-extrabold">
                                                        ★ ALMACÉN ÓPTIMO ASIGNADO
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-muted">
                                                Distancia al frente: <strong>{formatKm(res.distanciaKm)}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`font-mono font-bold ${
                                                res.tieneStockSuficiente
                                                    ? 'text-emerald-700'
                                                    : res.stockDisponible > 0
                                                    ? 'text-amber-700'
                                                    : 'text-rose-700'
                                            }`}
                                        >
                                            {formatCantidad(res.stockDisponible)}{' '}
                                            {materiales.find((m) => m.id === formMaterialId)?.unidad}
                                        </span>
                                        <span className="block text-[10px] text-muted">
                                            {res.tieneStockSuficiente
                                                ? 'Stock suficiente'
                                                : res.stockDisponible > 0
                                                ? 'Stock parcial'
                                                : 'Sin stock'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tieneDesabastecimientoTotal && (
                            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                                <strong>Alerta de Desabastecimiento:</strong> Ningún almacén de la red cuenta
                                con stock disponible para este pedido. Se notificará a Logística para la compra.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" onClick={() => setModalCrear(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            <IconCheck size={15} />
                            Generar Solicitud
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Detalle de Solicitud */}
            <Modal open={!!solicitudDetalle} onClose={() => setSolicitudDetalle(null)} title={`Solicitud ${solicitudDetalle?.codigo ?? ''}`}>
                {solicitudDetalle && (
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 rounded-lg bg-soft/60 p-3">
                            <div>
                                <span className="text-muted block">FRENTE DE TRABAJO</span>
                                <span className="font-bold text-ink text-sm">{solicitudDetalle.frenteNombre}</span>
                            </div>
                            <div>
                                <span className="text-muted block">SOLICITANTE</span>
                                <span className="font-bold text-ink">{solicitudDetalle.solicitanteNombre}</span>
                            </div>
                            <div>
                                <span className="text-muted block">FECHA SOLICITUD</span>
                                <span className="font-semibold text-ink">{solicitudDetalle.fechaSolicitud}</span>
                            </div>
                            <div>
                                <span className="text-muted block">FECHA REQUERIDA</span>
                                <span className="font-semibold text-ink">{solicitudDetalle.fechaRequerida}</span>
                            </div>
                        </div>

                        <div className="rounded-lg border border-line p-3">
                            <span className="text-muted block font-semibold mb-1">MATERIAL SOLICITADO</span>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-ink">
                                    {materiales.find((m) => m.id === solicitudDetalle.materialId)?.nombre}
                                </span>
                                <span className="font-mono text-sm font-bold text-brand-600">
                                    {formatCantidad(solicitudDetalle.cantidad)}{' '}
                                    {materiales.find((m) => m.id === solicitudDetalle.materialId)?.unidad}
                                </span>
                            </div>
                            {solicitudDetalle.observaciones && (
                                <p className="mt-2 text-muted italic border-t border-line pt-2">
                                    "{solicitudDetalle.observaciones}"
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-line">
                            <Button variant="secondary" onClick={() => setSolicitudDetalle(null)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
