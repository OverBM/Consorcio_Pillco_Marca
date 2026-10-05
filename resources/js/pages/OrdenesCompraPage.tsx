import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatMoneda } from '../utils/format';
import type { OrdenCompra } from '../types';
import {
    IconAlert,
    IconBoxes,
    IconCheckCircle,
    IconDollar,
    IconDownload,
    IconFileText,
    IconPlus,
    IconSearch,
    IconTruck,
} from '../components/icons';

export default function OrdenesCompraPage() {
    const {
        ordenesCompra,
        requerimientos,
        cotizaciones,
        almacenes,
        materiales,
        createOrdenCompra,
    } = useAppStore();

    const [filtroAlmacen, setFiltroAlmacen] = useState<string>('todos');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState<string>('');
    const [modalGenerarOC, setModalGenerarOC] = useState(false);
    const [ocSeleccionada, setOcSeleccionada] = useState<OrdenCompra | null>(null);

    // Formulario de Generación de OC
    const [ocReqId, setOcReqId] = useState(requerimientos[0]?.id ?? '');
    const [ocCotId, setOcCotId] = useState(cotizaciones[0]?.id ?? '');
    const [ocCondiciones, setOcCondiciones] = useState('Crédito 30 días contra factura y guía conforme');
    const [ocAlmacenDestino, setOcAlmacenDestino] = useState(almacenes[0]?.id ?? '');
    const [ocLugarEntrega, setOcLugarEntrega] = useState('Plataforma Principal Almacén Central');

    const cotizacionesDisponibles = useMemo(() => {
        return cotizaciones.filter((c) => !ocReqId || c.requerimientoId === ocReqId);
    }, [cotizaciones, ocReqId]);

    const handleCrearOC = (e: React.FormEvent) => {
        e.preventDefault();
        const cot = cotizaciones.find((c) => c.id === ocCotId) || cotizaciones[0];
        const req = requerimientos.find((r) => r.id === ocReqId);
        if (!cot) return;

        const reqItems = req?.items ?? [
            { materialId: materiales[0]?.id ?? 'mat-cemento-1', cantidad: 100, costoEstimadoUnitario: 30, subtotal: 3000 },
        ];

        const precio = cot.precioTotalSoles ?? (cot as any).precioTotalOfertado ?? 15000;

        createOrdenCompra({
            requerimientoId: ocReqId,
            proveedorRuc: cot.proveedorRuc,
            proveedorNombre: cot.proveedorNombre,
            montoTotal: precio,
            almacenDestinoId: ocAlmacenDestino,
            condicionesPago: ocCondiciones,
            lugarEntrega: ocLugarEntrega,
            estado: 'emitida',
            fechaEmision: new Date().toISOString().slice(0, 10),
            fechaCompromisoEntrega: new Date(Date.now() + (cot.plazoEntregaDias || 3) * 86400000)
                .toISOString()
                .slice(0, 10),
            items: reqItems.map((it) => ({
                materialId: it.materialId,
                cantidad: it.cantidad,
                precioUnitario: it.costoEstimadoUnitario,
                total: it.subtotal,
            })),
        });

        setModalGenerarOC(false);
    };

    const ordenesFiltradas = useMemo(() => {
        return ordenesCompra.filter((oc) => {
            if (filtroAlmacen !== 'todos' && oc.almacenDestinoId !== filtroAlmacen) return false;
            if (filtroEstado !== 'todos' && oc.estado !== filtroEstado) return false;
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase();
                const matchId = (oc.codigo || oc.id).toLowerCase().includes(q);
                const matchProv = oc.proveedorNombre.toLowerCase().includes(q);
                const matchRuc = oc.proveedorRuc.toLowerCase().includes(q);
                if (!matchId && !matchProv && !matchRuc) return false;
            }
            return true;
        });
    }, [ordenesCompra, filtroAlmacen, filtroEstado, busqueda]);

    // Métricas
    const totalOCs = ordenesCompra.length;
    const montoTotalComprometido = ordenesCompra.reduce((acc, oc) => acc + oc.montoTotal, 0);
    const ocsEmitidas = ordenesCompra.filter((oc) => oc.estado === 'emitida').length;
    const ocsEnTransito = ordenesCompra.filter((oc) => oc.estado === 'en_transporte').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Órdenes de Compra y Emisión (Macroproceso MP-18)"
                subtitle="Generación formal de compromisos de adquisición, asignación de almacén de destino y control logístico"
                actions={
                    <Button variant="mint" onClick={() => setModalGenerarOC(true)}>
                        <IconPlus size={16} />
                        Generar Orden de Compra
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Órdenes Generadas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{totalOCs}</p>
                    <span className="text-xs text-muted">Correlativos emitidos</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Monto Total Comprometido</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">{formatMoneda(montoTotalComprometido)}</p>
                    <span className="text-xs text-muted">Contratos y compromisos vigentes</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">En Emisión / Coordinación</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-amber-600">{ocsEmitidas}</p>
                    <span className="text-xs text-muted">Pendientes de despacho por proveedor</span>
                </Card>
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">En Ruta Logística</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-primary-600">{ocsEnTransito}</p>
                    <span className="text-xs text-muted">Con guías de remisión en camino</span>
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
                                placeholder="Buscar por OC, RUC o proveedor..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={filtroAlmacen}
                            onChange={(e) => setFiltroAlmacen(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todos">Todos los Almacenes Destino</option>
                            {almacenes.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nombre}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-line bg-canvas text-ink font-mono"
                        >
                            <option value="todos">Todos los Estados</option>
                            <option value="emitida">Emitida</option>
                            <option value="confirmada_proveedor">Confirmada Proveedor</option>
                            <option value="en_transporte">En Transporte</option>
                            <option value="recepcionada_total">Recepcionada Total</option>
                        </select>
                    </div>
                    <span className="text-xs text-muted font-mono">
                        Mostrando {ordenesFiltradas.length} de {ordenesCompra.length} órdenes de compra
                    </span>
                </div>
            </Card>

            {/* Tabla de Órdenes de Compra */}
            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="No hay órdenes de compra emitidas que coincidan con la búsqueda."
                    columns={[
                        { key: 'codigo', header: 'N° Orden', mono: true },
                        { key: 'proveedor', header: 'Proveedor / RUC' },
                        { key: 'almacen', header: 'Almacén Destino' },
                        { key: 'monto', header: 'Monto Total', align: 'right', mono: true },
                        { key: 'fechaEntrega', header: 'Compromiso Entrega', mono: true },
                        { key: 'estado', header: 'Estado', align: 'center' },
                        { key: 'acciones', header: 'Acciones', align: 'right' },
                    ]}
                    rows={ordenesFiltradas.map((oc) => {
                        const alm = almacenes.find((a) => a.id === oc.almacenDestinoId);
                        return {
                            id: oc.id,
                            codigo: oc.codigo ?? oc.id,
                            proveedor: (
                                <div>
                                    <p className="font-semibold text-ink">{oc.proveedorNombre}</p>
                                    <p className="text-xs font-mono text-muted">RUC: {oc.proveedorRuc}</p>
                                </div>
                            ),
                            almacen: alm?.nombre ?? oc.almacenDestinoId,
                            monto: (
                                <span className="font-bold font-mono text-ink text-sm">
                                    {formatMoneda(oc.montoTotal)}
                                </span>
                            ),
                            fechaEntrega: oc.fechaCompromisoEntrega,
                            estado: (
                                <Badge
                                    tone={
                                        oc.estado === 'recepcionada_total'
                                            ? 'ok'
                                            : oc.estado === 'en_transporte'
                                            ? 'warn'
                                            : 'neutral'
                                    }
                                >
                                    {oc.estado === 'emitida'
                                        ? 'Emitida'
                                        : oc.estado === 'en_transporte'
                                        ? 'En Tránsito'
                                        : oc.estado === 'recepcionada_total'
                                        ? 'Entregada Conforme'
                                        : 'Confirmada'}
                                </Badge>
                            ),
                            acciones: (
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setOcSeleccionada(oc)}
                                    >
                                        <IconFileText size={13} />
                                        Ver Documento
                                    </Button>
                                </div>
                            ),
                        };
                    })}
                />
            </Card>

            {/* Modal Documento Oficial de Orden de Compra */}
            <Modal
                open={Boolean(ocSeleccionada)}
                onClose={() => setOcSeleccionada(null)}
                title={`Orden de Compra: ${ocSeleccionada?.codigo ?? ocSeleccionada?.id ?? ''}`}
                wide
            >
                {ocSeleccionada && (
                    <div className="space-y-4">
                        <div className="p-4 bg-white border border-line rounded-lg shadow-sm font-sans text-xs space-y-4 text-slate-800">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">CONSORCIO PILLCO MARCA</h2>
                                    <p className="text-[11px] text-slate-500">RUC: 20608920194 • Obra: Sector Huancayo - Valle del Mantaro</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 rounded border">
                                        {ocSeleccionada.codigo ?? ocSeleccionada.id}
                                    </span>
                                    <p className="text-[11px] text-slate-500 mt-1">Fecha: {ocSeleccionada.fechaEmision}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
                                <div>
                                    <span className="text-slate-500 block font-semibold">SEÑOR(ES) / PROVEEDOR:</span>
                                    <p className="font-bold text-slate-900">{ocSeleccionada.proveedorNombre}</p>
                                    <p className="font-mono text-slate-600">RUC: {ocSeleccionada.proveedorRuc}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500 block font-semibold">LUGAR DE ENTREGA / ALMACÉN:</span>
                                    <p className="font-bold text-slate-900">
                                        {almacenes.find((a) => a.id === ocSeleccionada.almacenDestinoId)?.nombre ??
                                            ocSeleccionada.almacenDestinoId}
                                    </p>
                                    <p className="text-slate-600">Fecha Límite: {ocSeleccionada.fechaCompromisoEntrega}</p>
                                </div>
                            </div>

                            <div>
                                <span className="font-semibold text-slate-700 block mb-1">CONDICIONES CONTRACTUALES:</span>
                                <p className="p-2 bg-slate-50 rounded border text-slate-800">
                                    {ocSeleccionada.condicionesPago}
                                </p>
                            </div>

                            <div className="pt-2 flex justify-between items-center text-sm font-bold border-t">
                                <span>TOTAL ORDEN DE COMPRA (INC. IGV):</span>
                                <span className="text-base text-emerald-700 font-mono">
                                    {formatMoneda(ocSeleccionada.montoTotal)}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[10px] text-slate-500">
                                <div className="border-t pt-1">
                                    <p className="font-bold text-slate-800">Jefe de Logística</p>
                                    <p>Consorcio Pillco Marca</p>
                                </div>
                                <div className="border-t pt-1">
                                    <p className="font-bold text-slate-800">Residente de Obra</p>
                                    <p>V°B° Frente de Obra</p>
                                </div>
                                <div className="border-t pt-1">
                                    <p className="font-bold text-slate-800">Aceptación Proveedor</p>
                                    <p>Firma y Sello</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setOcSeleccionada(null)}>
                                Cerrar
                            </Button>
                            <Button variant="mint" onClick={() => window.print()}>
                                <IconDownload size={14} />
                                Imprimir / Exportar PDF
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Generar Orden de Compra */}
            <Modal
                open={modalGenerarOC}
                onClose={() => setModalGenerarOC(false)}
                title="Generar Nueva Orden de Compra Formal"
                wide
            >
                <form onSubmit={handleCrearOC} className="space-y-4">
                    <Field label="Requerimiento Base">
                        <Select
                            value={ocReqId}
                            onChange={(e) => {
                                setOcReqId(e.target.value);
                            }}
                        >
                            {requerimientos.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.codigo ?? r.id} — {r.partidaPresupuestal} ({formatMoneda(r.costoTotalEstimado)})
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Oferta / Cotización Adjudicada">
                        <Select
                            value={ocCotId}
                            onChange={(e) => setOcCotId(e.target.value)}
                        >
                            {cotizacionesDisponibles.map((c) => {
                                const precio = c.precioTotalSoles ?? (c as any).precioTotalOfertado ?? 0;
                                return (
                                    <option key={c.id} value={c.id}>
                                        {c.proveedorNombre} — {formatMoneda(precio)} (Plazo: {c.plazoEntregaDias}d)
                                    </option>
                                );
                            })}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Almacén de Destino para Descarga">
                            <Select
                                value={ocAlmacenDestino}
                                onChange={(e) => setOcAlmacenDestino(e.target.value)}
                            >
                                {almacenes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre} ({a.tipo})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Punto de Entrega / Descarga en Obra">
                            <Input
                                value={ocLugarEntrega}
                                onChange={(e) => setOcLugarEntrega(e.target.value)}
                                placeholder="Ej: Plataforma Central Almacén Comuneros"
                                required
                            />
                        </Field>
                    </div>

                    <Field label="Términos y Condiciones de Pago">
                        <Input
                            value={ocCondiciones}
                            onChange={(e) => setOcCondiciones(e.target.value)}
                            placeholder="Crédito a 30 días, flete incluido, retención de fondo de garantía 5%"
                            required
                        />
                    </Field>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setModalGenerarOC(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit">
                            Emitir Orden de Compra
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
