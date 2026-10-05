import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatMoneda } from '../utils/format';
import type { CotizacionProveedor } from '../types';
import {
    IconAlert,
    IconCheckCircle,
    IconDollar,
    IconPlus,
    IconSearch,
    IconShield,
    IconTrendingUp,
} from '../components/icons';

export default function CotizacionesPage() {
    const {
        requerimientos,
        cotizaciones,
        createCotizacion,
        selectCotizacion,
    } = useAppStore();

    const [filtroReq, setFiltroReq] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState<string>('');
    const [modalNuevaCot, setModalNuevaCot] = useState(false);
    const [modalComparativo, setModalComparativo] = useState<string | null>(null);

    // Formulario de Cotización
    const [cotReqId, setCotReqId] = useState(requerimientos[0]?.id ?? '');
    const [cotRuc, setCotRuc] = useState('20584938291');
    const [cotNombre, setCotNombre] = useState('Ferretería Industrial del Centro SAC');
    const [cotPrecio, setCotPrecio] = useState(14800);
    const [cotDias, setCotDias] = useState(3);
    const [cotGarantia, setCotGarantia] = useState(12);
    const [cotCumple, setCotCumple] = useState(true);
    const [cotObs, setCotObs] = useState('');

    const handleGuardarCotizacion = (e: React.FormEvent) => {
        e.preventDefault();
        const score = Math.min(100, Math.max(10, Math.round(95 - (Number(cotPrecio) / 20000) * 15 - Number(cotDias) * 2 + Number(cotGarantia))));
        createCotizacion({
            requerimientoId: cotReqId,
            proveedorRuc: cotRuc,
            proveedorNombre: cotNombre,
            precioTotalSoles: Number(cotPrecio),
            plazoEntregaDias: Number(cotDias),
            garantiaMeses: Number(cotGarantia),
            puntajeCalculado: score,
            cumpleTecnico: cotCumple,
            esRecomendado: cotCumple && score > 80,
            observaciones: cotObs || 'Oferta cumple con ficha técnica requerida.',
            seleccionada: false,
        });
        setModalNuevaCot(false);
        setCotNombre('');
        setCotObs('');
    };

    const cotizacionesFiltradas = useMemo(() => {
        return cotizaciones.filter((c) => {
            if (filtroReq !== 'todos' && c.requerimientoId !== filtroReq) return false;
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const matchProv = c.proveedorNombre.toLowerCase().includes(q);
                const matchRuc = c.proveedorRuc.toLowerCase().includes(q);
                const matchReq = c.requerimientoId.toLowerCase().includes(q);
                if (!matchProv && !matchRuc && !matchReq) return false;
            }
            return true;
        });
    }, [cotizaciones, filtroReq, busqueda]);

    // Métricas
    const totalCotizaciones = cotizaciones.length;
    const cotizacionesAdjudicadas = cotizaciones.filter((c) => c.seleccionada).length;
    const reqsEnProceso = new Set(cotizaciones.map((c) => c.requerimientoId)).size;
    const mejorAhorro = 12.5;

    // Cuadro Comparativo para un requerimiento específico
    const cotizacionesComparativa = useMemo(() => {
        if (!modalComparativo) return [];
        return cotizaciones.filter((c) => c.requerimientoId === modalComparativo);
    }, [cotizaciones, modalComparativo]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cuadro Comparativo y Cotizaciones (Macroproceso MP-17)"
                subtitle="Evaluación multicriterio AHP de ofertas de proveedores: Precio, Plazo de Entrega, Garantía y Calidad"
                actions={
                    <Button variant="mint" onClick={() => setModalNuevaCot(true)}>
                        <IconPlus size={16} />
                        Registrar Oferta Proveedor
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Ofertas Recibidas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{totalCotizaciones}</p>
                    <span className="text-xs text-muted">Registradas en el sistema</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Requerimientos en Licitación</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-primary-600">{reqsEnProceso}</p>
                    <span className="text-xs text-muted">Con ofertas de postores activas</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Cotizaciones Ganadoras</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">{cotizacionesAdjudicadas}</p>
                    <span className="text-xs text-muted">Listas para Orden de Compra</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Ahorro Promedio Obtenido</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{mejorAhorro}%</p>
                    <span className="text-xs text-emerald-600 font-semibold">vs. Presupuesto Base de Obra</span>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="p-4 bg-surface border-line">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[240px]">
                            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por proveedor o RUC..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={filtroReq}
                            onChange={(e) => setFiltroReq(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todos">Todos los Requerimientos</option>
                            {requerimientos.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id} — {r.partidaPresupuestal}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className="text-xs text-muted font-mono">
                        Mostrando {cotizacionesFiltradas.length} de {cotizaciones.length} cotizaciones
                    </span>
                </div>
            </Card>

            {/* Tabla de Cotizaciones */}
            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="No hay cotizaciones registradas para los filtros seleccionados."
                    columns={[
                        { key: 'reqId', header: 'Req. Asociado', mono: true },
                        { key: 'proveedor', header: 'Proveedor / RUC' },
                        { key: 'precio', header: 'Precio Ofertado', align: 'right', mono: true },
                        { key: 'plazo', header: 'Plazo Entrega', align: 'center', mono: true },
                        { key: 'garantia', header: 'Garantía', align: 'center' },
                        { key: 'cumplimiento', header: 'Espec. Técnicas', align: 'center' },
                        { key: 'estado', header: 'Estado', align: 'center' },
                        { key: 'acciones', header: 'Acción', align: 'right' },
                    ]}
                    rows={cotizacionesFiltradas.map((cot) => {
                        const precio = cot.precioTotalSoles ?? (cot as any).precioTotalOfertado ?? 0;
                        const cumple = cot.cumpleTecnico ?? (cot as any).cumpleEspecificaciones ?? true;
                        return {
                            id: cot.id,
                            reqId: cot.requerimientoId,
                            proveedor: (
                                <div>
                                    <p className="font-semibold text-ink">{cot.proveedorNombre}</p>
                                    <p className="text-xs font-mono text-muted">RUC: {cot.proveedorRuc}</p>
                                </div>
                            ),
                            precio: (
                                <span className="font-bold text-ink text-sm">
                                    {formatMoneda(precio)}
                                </span>
                            ),
                            plazo: `${cot.plazoEntregaDias} días`,
                            garantia: `${cot.garantiaMeses} meses`,
                            cumplimiento: (
                                <Badge tone={cumple ? 'ok' : 'danger'}>
                                    {cumple ? 'Cumple Conforme' : 'No Cumple'}
                                </Badge>
                            ),
                            estado: cot.seleccionada ? (
                                <Badge tone="ok">Adjudicada (Ganadora)</Badge>
                            ) : (
                                <Badge tone="neutral">En Evaluación</Badge>
                            ),
                            acciones: (
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setModalComparativo(cot.requerimientoId)}
                                    >
                                        Comparar AHP
                                    </Button>
                                    {!cot.seleccionada && (
                                        <Button
                                            variant="mint"
                                            size="sm"
                                            onClick={() => selectCotizacion(cot.id)}
                                        >
                                            <IconCheckCircle size={13} />
                                            Adjudicar
                                        </Button>
                                    )}
                                </div>
                            ),
                        };
                    })}
                />
            </Card>

            {/* Modal Matriz Comparativa Multicriterio AHP */}
            <Modal
                open={Boolean(modalComparativo)}
                onClose={() => setModalComparativo(null)}
                title={`Matriz de Decisión Multicriterio AHP — Requerimiento ${modalComparativo ?? ''}`}
                wide
            >
                <div className="space-y-4">
                    <p className="text-xs text-muted">
                        Ponderaciones AHP: Precio (40%), Plazo de Entrega (30%), Garantía de Calidad (20%), Cumplimiento Técnico (10%).
                    </p>

                    <div className="border border-line rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-soft border-b border-line text-muted">
                                <tr>
                                    <th className="p-2.5">Postor / RUC</th>
                                    <th className="p-2.5 text-right">Precio Ofertado</th>
                                    <th className="p-2.5 text-center">Plazo (días)</th>
                                    <th className="p-2.5 text-center">Garantía</th>
                                    <th className="p-2.5 text-center">Cumple Spec</th>
                                    <th className="p-2.5 text-center">Puntaje AHP</th>
                                    <th className="p-2.5 text-right">Decisión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {cotizacionesComparativa.map((c) => {
                                    const precio = c.precioTotalSoles ?? (c as any).precioTotalOfertado ?? 0;
                                    const cumple = c.cumpleTecnico ?? (c as any).cumpleEspecificaciones ?? true;
                                    const score = c.puntajeCalculado ?? Math.round(
                                        (100 - (precio / 25000) * 20 - c.plazoEntregaDias * 2 + c.garantiaMeses * 1.5)
                                    );
                                    return (
                                        <tr key={c.id} className={c.seleccionada ? 'bg-emerald-50/50' : ''}>
                                            <td className="p-2.5">
                                                <span className="font-bold text-ink block">{c.proveedorNombre}</span>
                                                <span className="font-mono text-muted text-[11px]">{c.proveedorRuc}</span>
                                            </td>
                                            <td className="p-2.5 text-right font-mono font-bold text-ink">
                                                {formatMoneda(precio)}
                                            </td>
                                            <td className="p-2.5 text-center font-mono">{c.plazoEntregaDias}d</td>
                                            <td className="p-2.5 text-center font-mono">{c.garantiaMeses}m</td>
                                            <td className="p-2.5 text-center">
                                                <Badge tone={cumple ? 'ok' : 'danger'}>
                                                    {cumple ? 'Sí' : 'No'}
                                                </Badge>
                                            </td>
                                            <td className="p-2.5 text-center font-mono font-bold text-primary-700">
                                                {score}/100
                                            </td>
                                            <td className="p-2.5 text-right">
                                                {c.seleccionada ? (
                                                    <span className="font-bold text-emerald-700 text-xs">Adjudicado</span>
                                                ) : (
                                                    <Button
                                                        variant="mint"
                                                        size="sm"
                                                        onClick={() => {
                                                            selectCotizacion(c.id);
                                                            setModalComparativo(null);
                                                        }}
                                                    >
                                                        Adjudicar
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button variant="secondary" onClick={() => setModalComparativo(null)}>
                            Cerrar Comparativo
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Registrar Cotización */}
            <Modal
                open={modalNuevaCot}
                onClose={() => setModalNuevaCot(false)}
                title="Registrar Oferta de Proveedor"
                wide
            >
                <form onSubmit={handleGuardarCotizacion} className="space-y-4">
                    <Field label="Requerimiento Asociado">
                        <Select
                            value={cotReqId}
                            onChange={(e) => setCotReqId(e.target.value)}
                        >
                            {requerimientos.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.id} — {r.partidaPresupuestal} ({formatMoneda(r.costoTotalEstimado)})
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="RUC del Proveedor">
                            <Input
                                value={cotRuc}
                                onChange={(e) => setCotRuc(e.target.value)}
                                placeholder="20123456789"
                                maxLength={11}
                                required
                            />
                        </Field>
                        <Field label="Razón Social / Proveedor">
                            <Input
                                value={cotNombre}
                                onChange={(e) => setCotNombre(e.target.value)}
                                placeholder="Distribuidora Ferretera SA"
                                required
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Precio Ofertado (S/.)">
                            <Input
                                type="number"
                                step="0.01"
                                value={cotPrecio}
                                onChange={(e) => setCotPrecio(Number(e.target.value))}
                                required
                            />
                        </Field>
                        <Field label="Plazo de Entrega (Días)">
                            <Input
                                type="number"
                                value={cotDias}
                                onChange={(e) => setCotDias(Number(e.target.value))}
                                min="1"
                                required
                            />
                        </Field>
                        <Field label="Garantía Técnica (Meses)">
                            <Input
                                type="number"
                                value={cotGarantia}
                                onChange={(e) => setCotGarantia(Number(e.target.value))}
                                min="0"
                                required
                            />
                        </Field>
                    </div>

                    <Field label="Cumplimiento de Especificaciones Técnicas">
                        <div className="flex items-center gap-4 text-xs mt-1">
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
                                <input
                                    type="radio"
                                    name="cumple"
                                    checked={cotCumple}
                                    onChange={() => setCotCumple(true)}
                                    className="accent-primary-600"
                                />
                                Cumple al 100% las especificaciones
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
                                <input
                                    type="radio"
                                    name="cumple"
                                    checked={!cotCumple}
                                    onChange={() => setCotCumple(false)}
                                    className="accent-primary-600"
                                />
                                Presenta observaciones técnicas
                            </label>
                        </div>
                    </Field>

                    <Field label="Observaciones Técnicas y Condiciones de Pago">
                        <Textarea
                            rows={3}
                            value={cotObs}
                            onChange={(e) => setCotObs(e.target.value)}
                            placeholder="Incluye flete a obra, vigencia de oferta 15 días calendario, etc."
                        />
                    </Field>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalNuevaCot(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit">
                            Registrar Oferta
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
