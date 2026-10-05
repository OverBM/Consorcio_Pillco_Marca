import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatCantidad, formatMoneda } from '../utils/format';
import type { RequerimientoCompra, RequerimientoItem } from '../types';
import {
    IconAlert,
    IconBoxes,
    IconCheckCircle,
    IconDollar,
    IconFileText,
    IconPlus,
    IconSearch,
    IconShield,
    IconShoppingCart,
} from '../components/icons';

export default function RequerimientosPage() {
    const {
        requerimientos,
        obras,
        materiales,
        obraActiva,
        createRequerimiento,
        approveRequerimiento,
    } = useAppStore();

    const [filtroObra, setFiltroObra] = useState<string>('todas');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState<string>('');
    const [modalNuevoReq, setModalNuevoReq] = useState(false);
    const [reqSeleccionado, setReqSeleccionado] = useState<RequerimientoCompra | null>(null);

    // Formulario de Requerimiento
    const [formObraId, setFormObraId] = useState(obraActiva.id);
    const [formPartida, setFormPartida] = useState('Partida 04.01 — Obras de Concreto');
    const [formPresupuesto, setFormPresupuesto] = useState(35000);
    const [formItems, setFormItems] = useState<RequerimientoItem[]>([
        { materialId: 'mat-cemento-1', cantidad: 400, costoEstimadoUnitario: 31.5, subtotal: 12600 },
    ]);
    const [formJustificacion, setFormJustificacion] = useState('');
    const [formFechaLimite, setFormFechaLimite] = useState(
        new Date(Date.now() + 604800000).toISOString().slice(0, 10),
    );

    const costoTotalEstimado = useMemo(
        () => formItems.reduce((acc, it) => acc + it.subtotal, 0),
        [formItems]
    );
    const excedePresupuesto = costoTotalEstimado > formPresupuesto;
    const montoExcedente = Math.max(0, costoTotalEstimado - formPresupuesto);

    const handleAddItem = () => {
        setFormItems((prev) => [
            ...prev,
            { materialId: materiales[0]?.id ?? 'mat-cemento-1', cantidad: 100, costoEstimadoUnitario: 15, subtotal: 1500 },
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

    const handleRemoveItem = (index: number) => {
        if (formItems.length <= 1) return;
        setFormItems((prev) => prev.filter((_, i) => i !== index));
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
            justificacion: formJustificacion || 'Requerimiento regular para continuidad de frente de obra.',
            estado: excedePresupuesto ? 'requiere_aprobacion' : 'en_cotizacion',
            items: formItems,
            aprobacionAdicional: excedePresupuesto
                ? { solicitada: true, motivo: formJustificacion }
                : undefined,
        });
        setModalNuevoReq(false);
        // Reset form
        setFormItems([{ materialId: 'mat-cemento-1', cantidad: 400, costoEstimadoUnitario: 31.5, subtotal: 12600 }]);
        setFormJustificacion('');
    };

    const requerimientosFiltrados = useMemo(() => {
        return requerimientos.filter((r) => {
            if (filtroObra !== 'todas' && r.obraId !== filtroObra) return false;
            if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const matchId = (r.codigo || r.id).toLowerCase().includes(q);
                const matchPartida = r.partidaPresupuestal.toLowerCase().includes(q);
                const matchSol = r.solicitadoPor.toLowerCase().includes(q);
                if (!matchId && !matchPartida && !matchSol) return false;
            }
            return true;
        });
    }, [requerimientos, filtroObra, filtroEstado, busqueda]);

    // Métricas
    const totalReqs = requerimientos.length;
    const reqsPendientesAprob = requerimientos.filter((r) => r.estado === 'requiere_aprobacion').length;
    const reqsEnCotizacion = requerimientos.filter((r) => r.estado === 'en_cotizacion').length;
    const montoTotalReqs = requerimientos.reduce((acc, r) => acc + r.costoTotalEstimado, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Requerimientos de Compra (Macroproceso MP-16)"
                subtitle="Generación y control de pedidos de materiales por frente de obra con validación presupuestal automatizada"
                actions={
                    <Button variant="mint" onClick={() => setModalNuevoReq(true)}>
                        <IconPlus size={16} />
                        Nuevo Requerimiento
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Total Requerimientos</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{totalReqs}</p>
                    <span className="text-xs text-muted">Registrados en el ciclo activo</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">En Evaluación Presupuestal</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-amber-600">{reqsPendientesAprob}</p>
                    <span className="text-xs text-amber-700">Exceden partida / Requieren V°B°</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">En Cotización con Proveedores</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{reqsEnCotizacion}</p>
                    <span className="text-xs text-muted">Listos para cuadro comparativo</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Monto Estimado Consolidado</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{formatMoneda(montoTotalReqs)}</p>
                    <span className="text-xs text-muted">Valor base de pedidos</span>
                </Card>
            </div>

            {/* Filtros y Búsqueda */}
            <Card className="p-4 bg-surface border-line">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por código, partida o solicitante..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={filtroObra}
                            onChange={(e) => setFiltroObra(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todas">Todas las Obras</option>
                            {obras.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.nombre}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todos">Todos los Estados</option>
                            <option value="requiere_aprobacion">Requiere Aprobación</option>
                            <option value="en_cotizacion">En Cotización</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="atendido">Atendido</option>
                        </select>
                    </div>
                    <span className="text-xs text-muted font-mono">
                        Mostrando {requerimientosFiltrados.length} de {requerimientos.length} requerimientos
                    </span>
                </div>
            </Card>

            {/* Tabla de Requerimientos */}
            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="No se encontraron requerimientos con los filtros seleccionados."
                    columns={[
                        { key: 'codigo', header: 'Código', mono: true },
                        { key: 'obra', header: 'Obra / Frente' },
                        { key: 'partida', header: 'Partida Presupuestal' },
                        { key: 'costo', header: 'Costo Est.', align: 'right', mono: true },
                        { key: 'presupuesto', header: 'Presupuesto Base', align: 'right', mono: true },
                        { key: 'fechaLimite', header: 'Límite Entrega', mono: true },
                        { key: 'estado', header: 'Estado', align: 'center' },
                        { key: 'acciones', header: 'Acciones', align: 'right' },
                    ]}
                    rows={requerimientosFiltrados.map((req) => {
                        const obra = obras.find((o) => o.id === req.obraId);
                        const isOver = req.excedePresupuesto;
                        return {
                            id: req.id,
                            codigo: req.codigo ?? req.id,
                            obra: obra?.nombre ?? req.obraId,
                            partida: (
                                <div>
                                    <p className="font-medium text-ink">{req.partidaPresupuestal}</p>
                                    <p className="text-xs text-muted">Sol: {req.solicitadoPor}</p>
                                </div>
                            ),
                            costo: (
                                <span className={isOver ? 'font-bold text-red-600' : 'font-bold text-ink'}>
                                    {formatMoneda(req.costoTotalEstimado)}
                                </span>
                            ),
                            presupuesto: formatMoneda(req.presupuestoAsignado),
                            fechaLimite: req.fechaLimiteEntrega,
                            estado: (
                                <Badge
                                    tone={
                                        req.estado === 'atendido'
                                            ? 'ok'
                                            : req.estado === 'requiere_aprobacion'
                                            ? 'danger'
                                            : req.estado === 'en_cotizacion'
                                            ? 'warn'
                                            : 'neutral'
                                    }
                                >
                                    {req.estado === 'requiere_aprobacion'
                                        ? 'Exceso Presupuestal'
                                        : req.estado === 'en_cotizacion'
                                        ? 'En Cotización'
                                        : req.estado === 'aprobado'
                                        ? 'Aprobado'
                                        : 'Atendido'}
                                </Badge>
                            ),
                            acciones: (
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setReqSeleccionado(req)}
                                    >
                                        <IconFileText size={13} />
                                        Detalle
                                    </Button>
                                    {req.estado === 'requiere_aprobacion' && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => approveRequerimiento(req.id)}
                                        >
                                            <IconCheckCircle size={13} />
                                            Aprobar V°B°
                                        </Button>
                                    )}
                                </div>
                            ),
                        };
                    })}
                />
            </Card>

            {/* Modal Detalle Requerimiento */}
            <Modal
                open={Boolean(reqSeleccionado)}
                onClose={() => setReqSeleccionado(null)}
                title={`Requerimiento: ${reqSeleccionado?.codigo ?? reqSeleccionado?.id ?? ''}`}
                wide
            >
                {reqSeleccionado && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs bg-canvas p-3 rounded-lg border border-line">
                            <div>
                                <span className="text-muted block">Partida Presupuestal:</span>
                                <span className="font-bold text-ink">{reqSeleccionado.partidaPresupuestal}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Fecha Emisión / Límite:</span>
                                <span className="font-mono text-ink">
                                    {reqSeleccionado.fechaEmision} &rarr; {reqSeleccionado.fechaLimiteEntrega}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted block">Presupuesto Asignado:</span>
                                <span className="font-mono text-ink">{formatMoneda(reqSeleccionado.presupuestoAsignado)}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Costo Total Estimado:</span>
                                <span className="font-mono font-bold text-ink">
                                    {formatMoneda(reqSeleccionado.costoTotalEstimado)}
                                </span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase text-muted mb-2">Desglose de Materiales Requeridos</h4>
                            <div className="border border-line rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-soft border-b border-line text-muted">
                                        <tr>
                                            <th className="p-2.5">Material</th>
                                            <th className="p-2.5 text-right">Cantidad</th>
                                            <th className="p-2.5 text-right">C. Unit. Est.</th>
                                            <th className="p-2.5 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {reqSeleccionado.items.map((it, idx) => {
                                            const mat = materiales.find((m) => m.id === it.materialId);
                                            return (
                                                <tr key={idx}>
                                                    <td className="p-2.5 font-medium text-ink">
                                                        {mat?.nombre ?? it.materialId}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono">
                                                        {formatCantidad(it.cantidad, mat?.unidad ?? 'UND')}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono">
                                                        {formatMoneda(it.costoEstimadoUnitario)}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold text-ink">
                                                        {formatMoneda(it.subtotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {reqSeleccionado.justificacion && (
                            <div className="p-3 bg-canvas rounded-lg border border-line text-xs">
                                <span className="font-bold text-muted block mb-1">Justificación Técnica:</span>
                                <p className="text-ink">{reqSeleccionado.justificacion}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setReqSeleccionado(null)}>
                                Cerrar
                            </Button>
                            {reqSeleccionado.estado === 'requiere_aprobacion' && (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        approveRequerimiento(reqSeleccionado.id);
                                        setReqSeleccionado(null);
                                    }}
                                >
                                    <IconCheckCircle size={14} />
                                    Aprobar Exceso Presupuestal
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Nuevo Requerimiento */}
            <Modal
                open={modalNuevoReq}
                onClose={() => setModalNuevoReq(false)}
                title="Generar Nuevo Requerimiento de Compra"
                wide
            >
                <form onSubmit={handleGuardarRequerimiento} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Obra Destino">
                            <Select
                                value={formObraId}
                                onChange={(e) => setFormObraId(e.target.value)}
                            >
                                {obras.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.nombre}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Partida Presupuestal">
                            <Input
                                value={formPartida}
                                onChange={(e) => setFormPartida(e.target.value)}
                                placeholder="Ej. Partida 04.02 — Muros y Tabiquería"
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Presupuesto Base Asignado (S/.)">
                            <Input
                                type="number"
                                step="0.01"
                                value={formPresupuesto}
                                onChange={(e) => setFormPresupuesto(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Fecha Límite Requerida">
                            <Input
                                type="date"
                                value={formFechaLimite}
                                onChange={(e) => setFormFechaLimite(e.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    {/* Lista de Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-ink uppercase">Materiales Requeridos</span>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <IconPlus size={14} /> Agregar Fila
                            </button>
                        </div>

                        <div className="space-y-2 border border-line rounded-lg p-3 bg-canvas">
                            {formItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                        <select
                                            value={item.materialId}
                                            onChange={(e) => handleUpdateItem(idx, { materialId: e.target.value })}
                                            className="w-full text-xs rounded-lg border border-line bg-surface p-1.5 text-ink"
                                        >
                                            {materiales.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.nombre} ({m.unidad})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Cant."
                                            value={item.cantidad}
                                            onChange={(e) => handleUpdateItem(idx, { cantidad: Number(e.target.value) })}
                                            className="w-full text-xs rounded-lg border border-line bg-surface p-1.5 text-right font-mono"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="C.Unit"
                                            step="0.01"
                                            value={item.costoEstimadoUnitario}
                                            onChange={(e) =>
                                                handleUpdateItem(idx, { costoEstimadoUnitario: Number(e.target.value) })
                                            }
                                            className="w-full text-xs rounded-lg border border-line bg-surface p-1.5 text-right font-mono"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-xs font-bold text-ink">
                                        {formatMoneda(item.subtotal)}
                                    </div>
                                    <div className="col-span-1 text-center">
                                        {formItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="text-red-500 hover:text-red-700 font-bold text-sm cursor-pointer"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resumen de Presupuesto */}
                    <div
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                            excedePresupuesto
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                    >
                        <div>
                            <span className="font-bold block">
                                {excedePresupuesto
                                    ? 'Atención: Costo supera el presupuesto de la partida'
                                    : 'Dentro del marco presupuestal'}
                            </span>
                            <span className="text-xs">
                                Total: {formatMoneda(costoTotalEstimado)} vs Base: {formatMoneda(formPresupuesto)}
                            </span>
                        </div>
                        {excedePresupuesto && (
                            <span className="font-mono font-bold text-red-600">
                                Exceso: +{formatMoneda(montoExcedente)}
                            </span>
                        )}
                    </div>

                    <Field label="Justificación Técnica y Frente Operativo">
                        <Textarea
                            rows={3}
                            value={formJustificacion}
                            onChange={(e) => setFormJustificacion(e.target.value)}
                            placeholder="Describa el sustento de obra, partidas involucradas y condiciones especiales..."
                            required
                        />
                    </Field>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalNuevoReq(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit">
                            Generar Requerimiento
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
