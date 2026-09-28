// Panel General — Tablero consolidado de supervisión de inventarios multi-almacén a nivel programa (PMU)
// y control por áreas de conocimiento PMI (Adquisiciones, Costos, Logística, Calidad, Riesgos y Control).
// Conecta los macroprocesos Bizagi 16 al 30 con mapa interactivo Leaflet y KPIs operativos.

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { AlertaBanner } from '../components/AlertaBanner';
import { MapaLeaflet, type RutaMapa, type SugerenciaMapa } from '../components/MapaLeaflet';
import { GeoDetalle } from '../components/GeoDetalle';
import { BarChart7d, ChartLegend } from '../components/charts';
import { Card, Badge } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/AppContext';
import { estadoDeAlmacen, ESTADO_META } from '../utils/estados';
import { haversineDistanceKm } from '../utils/geo';
import { formatKm, formatNum, formatCantidad } from '../utils/format';
import { barChart7d } from '../data/movimientos';
import {
    IconAlert,
    IconAlertTriangle,
    IconArrowUpRight,
    IconBoxes,
    IconCheck,
    IconClipboardList,
    IconInbox,
    IconRepeat,
    IconShoppingCart,
    IconSparkles,
    IconTrash,
    IconTruck,
    IconX,
} from '../components/icons';

interface PrediccionDinamica {
    obraOrigenId: string;
    almacenOrigenId: string;
    nombreOrigen: string;
    obraDestinoId: string;
    almacenDestinoId: string;
    nombreDestino: string;
    materialId: string;
    nombreMaterial: string;
    unidad: string;
    cantidad: number;
    km: number;
    ahorroSoles: number;
}

export default function PanelGeneral() {
    const {
        obras,
        almacenes,
        materiales,
        stock,
        alertas,
        despachos,
        solicitudes,
        requerimientos,
        ordenesCompra,
        transportes,
        transferencias,
        mermas,
        inconsistencias,
        obraActiva,
        selectObra,
    } = useAppStore();

    const [seleccionObraId, setSeleccionObraId] = useState<string | null>(null);
    const [alertaHoverId, setAlertaHoverId] = useState<string | null>(null);
    const [frentesComparados, setFrentesComparados] = useState<string[]>([obraActiva.id]);
    const [prediccionDinamica, setPrediccionDinamica] = useState<PrediccionDinamica | null>(null);

    const almCentral = useMemo(() => almacenes.find((a) => a.id === 'alm-central') ?? almacenes[0], [almacenes]);

    // Función para calcular redistribución sugerida (Cemento Andino Tipo V como caso central)
    const calcularRedistribucionParaObra = (obraId: string, almId?: string) => {
        const obraOrig = obras.find((o) => o.id === obraId);
        const almOrig = almId ? almacenes.find((a) => a.id === almId) : almacenes.find((a) => a.obraId === obraId);
        if (!obraOrig || !almOrig) return;

        const matCemento = materiales.find((m) => m.id === 'mat-cemento-1') ?? materiales[0];
        const stockOrig = stock.stock[almOrig.id]?.[matCemento.id] ?? 0;

        const candidatas = almacenes
            .filter((a) => a.id !== almOrig.id)
            .map((a) => {
                const obraDest = obras.find((o) => o.id === a.obraId);
                const stockDest = stock.stock[a.id]?.[matCemento.id] ?? 0;
                const km = haversineDistanceKm(almOrig.coords, a.coords);
                const deficit = Math.max(0, matCemento.stockMinimo - stockDest);
                return {
                    almacen: a,
                    obra: obraDest,
                    km,
                    deficit,
                    prioridad: deficit * 10 - km,
                };
            })
            .sort((a, b) => b.prioridad - a.prioridad);

        const mejorCandidata = candidatas[0];
        if (!mejorCandidata || !mejorCandidata.obra) return;

        const cantidadSugerida = Math.min(stockOrig, 600);
        const ahorroSoles = Math.round(mejorCandidata.km * 45 + cantidadSugerida * 1.2);

        setPrediccionDinamica({
            obraOrigenId: obraOrig.id,
            almacenOrigenId: almOrig.id,
            nombreOrigen: obraOrig.nombre,
            obraDestinoId: mejorCandidata.obra.id,
            almacenDestinoId: mejorCandidata.almacen.id,
            nombreDestino: mejorCandidata.obra.nombre,
            materialId: matCemento.id,
            nombreMaterial: matCemento.nombre,
            unidad: matCemento.unidad,
            cantidad: cantidadSugerida,
            km: mejorCandidata.km,
            ahorroSoles,
        });

        setSeleccionObraId(obraId);
    };

    useEffect(() => {
        const handleSetObraActiva = (e: CustomEvent<{ obraId: string }>) => {
            const id = e.detail?.obraId;
            if (id) {
                setSeleccionObraId(id);
                setFrentesComparados((prev) => (prev.includes(id) ? prev : [...prev, id]));
                selectObra(id);
            }
        };

        const handleCalcularRedistribucion = (e: CustomEvent<{ obraId: string; almacenId: string }>) => {
            if (e.detail?.obraId) {
                calcularRedistribucionParaObra(e.detail.obraId, e.detail.almacenId);
            }
        };

        window.addEventListener('cpm:set-obra-activa', handleSetObraActiva as EventListener);
        window.addEventListener('cpm:calcular-redistribucion', handleCalcularRedistribucion as EventListener);

        return () => {
            window.removeEventListener('cpm:set-obra-activa', handleSetObraActiva as EventListener);
            window.removeEventListener('cpm:calcular-redistribucion', handleCalcularRedistribucion as EventListener);
        };
    }, [obras, almacenes, materiales, stock, selectObra]);

    // 7 Grupos de Indicadores PMI / PMU (Bizagi 16-30)
    const kpiSolicitudesPendientes = solicitudes.filter((s) => s.estado === 'pendiente' || s.estado === 'asignado').length;
    const kpiReqSobrecosto = requerimientos.filter((r) => r.excedePresupuesto).length;
    const kpiOCEnTransito = ordenesCompra.filter((oc) => oc.estado === 'en_transporte').length + transportes.filter((t) => t.estado === 'en_ruta').length;
    const kpiStockCritico = alertas.filter((a) => a.tipo === 'critico').length;
    const kpiTransferenciasActivas = transferencias.filter((t) => t.estado === 'solicitada' || t.estado === 'autorizada_logistica' || t.estado === 'en_transito').length;
    const kpiIncidencias = transferencias.filter((t) => t.estado === 'recibida_con_incidencia').length + inconsistencias.filter((i) => i.estado === 'pendiente_revision').length;
    const kpiMermasSobreUmbral = mermas.filter((m) => m.superaUmbral).length;
    const sobrantes = alertas.filter((a) => a.tipo === 'sobrante');

    const rutas: RutaMapa[] = useMemo(
        () =>
            despachos
                .filter((d) => d.estado === 'en-transito' || d.estado === 'pendiente')
                .map((d) => ({
                    id: d.id,
                    codigo: d.codigo,
                    origenId: d.origenAlmacenId,
                    destinoId: d.destinoAlmacenId,
                    estado: d.estado,
                })),
        [despachos],
    );

    const sugerencias: SugerenciaMapa[] = useMemo(() => {
        const base = sobrantes.flatMap((s) =>
            (s.receptoras ?? []).map((r) => ({ origenId: s.almacenId ?? '', destinoId: r.almacenId })),
        );
        if (prediccionDinamica) {
            base.push({
                origenId: prediccionDinamica.almacenOrigenId,
                destinoId: prediccionDinamica.almacenDestinoId,
            });
        }
        return base;
    }, [sobrantes, prediccionDinamica]);

    const alertaHover = useMemo(() => sobrantes.find((s) => s.id === alertaHoverId), [sobrantes, alertaHoverId]);
    const almSeleccionado = almacenes.find((a) => a.obraId === seleccionObraId);
    const obrasNoComparadas = obras.filter((o) => !frentesComparados.includes(o.id));

    const agregarAFrentesComparados = (obraId: string) => {
        if (!frentesComparados.includes(obraId)) {
            setFrentesComparados((prev) => [...prev, obraId]);
            setSeleccionObraId(obraId);
        }
    };

    const quitarDeFrentesComparados = (obraId: string) => {
        setFrentesComparados((prev) => prev.filter((id) => id !== obraId));
        if (seleccionObraId === obraId) {
            setSeleccionObraId(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Panel General"
                subtitle="Consolidado de inventarios multi-almacén y control operativo — Valle del Mantaro"
            />

            {/* 7 Indicadores consolidados PMI / PMU (Bizagi 16-30) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                <KpiCard
                    icon={<IconClipboardList size={18} />}
                    label="Solicitudes"
                    value={kpiSolicitudesPendientes}
                    hint="en atención"
                    tone="indigo"
                />
                <KpiCard
                    icon={<IconShoppingCart size={18} />}
                    label="Requerimientos"
                    value={kpiReqSobrecosto}
                    hint="con sobrecosto"
                    tone={kpiReqSobrecosto > 0 ? 'warn' : 'ok'}
                />
                <KpiCard
                    icon={<IconTruck size={18} />}
                    label="OC / Fletes"
                    value={kpiOCEnTransito}
                    hint="en transporte"
                    tone="indigo"
                />
                <KpiCard
                    icon={<IconAlert size={18} />}
                    label="Stock Crítico"
                    value={kpiStockCritico}
                    hint="alertas activas"
                    tone={kpiStockCritico > 0 ? 'danger' : 'ok'}
                />
                <KpiCard
                    icon={<IconRepeat size={18} />}
                    label="Transferencias"
                    value={kpiTransferenciasActivas}
                    hint="en curso"
                    tone="violet"
                />
                <KpiCard
                    icon={<IconAlertTriangle size={18} />}
                    label="Incidencias"
                    value={kpiIncidencias}
                    hint="por conciliar"
                    tone={kpiIncidencias > 0 ? 'danger' : 'ok'}
                />
                <KpiCard
                    icon={<IconTrash size={18} />}
                    label="Mermas"
                    value={kpiMermasSobreUmbral}
                    hint="sobre umbral"
                    tone={kpiMermasSobreUmbral > 0 ? 'danger' : 'ok'}
                />
            </div>

            {/* Alertas de sobrante por cierre de obra */}
            <section id="seccion-sobrantes" className="space-y-3 scroll-mt-20">
                <div className="flex items-center justify-between">
                    <h3 className="section-title">Redistribución de excedentes por cierre de obra</h3>
                    <span className="text-xs text-muted">Pasa el cursor sobre la alerta para resaltar la ruta</span>
                </div>
                {sobrantes.length === 0 ? (
                    <Card>
                        <EmptyState
                            title="Sin excedentes por redistribuir"
                            hint="Todas las obras cerradas han sido regularizadas en el inventario."
                        />
                    </Card>
                ) : (
                    sobrantes.map((alerta) => (
                        <div
                            key={alerta.id}
                            onMouseEnter={() => setAlertaHoverId(alerta.id)}
                            onMouseLeave={() => setAlertaHoverId(null)}
                            className="transition-transform duration-150 hover:scale-[1.005]"
                        >
                            <AlertaBanner
                                kind="sobrante"
                                title={`${alerta.materialId ? materiales.find((m) => m.id === alerta.materialId)?.nombre ?? 'Material' : 'Material'}: ${formatNum(alerta.cantidad ?? 0)} bolsas`}
                                mensaje={
                                    <span>
                                        {alerta.mensaje} Receptoras sugeridas por cercanía:{' '}
                                        {(alerta.receptoras ?? []).map((r, i) => (
                                            <span key={r.almacenId}>
                                                {i > 0 && ', '}
                                                <strong>{r.nombreObra}</strong> ({formatKm(r.km)})
                                            </span>
                                        ))}
                                    </span>
                                }
                                actions={
                                    <Link
                                        href={`/transferencias?crear=sobrante&materialId=${alerta.materialId}&origen=${alerta.almacenId}&destino=${alerta.receptoras?.[0]?.almacenId}`}
                                        className="btn-primary"
                                    >
                                        <IconArrowUpRight size={15} />
                                        Generar orden de transferencia
                                    </Link>
                                }
                            />
                        </div>
                    ))
                )}
            </section>

            {/* Mapa Interactivo Leaflet */}
            <Card
                title="Mapa geolocalizado de la red — Valle del Mantaro"
                subtitle="OpenStreetMap / Satélite • Coordenadas dinámicas, despachos en tránsito y rutas de redistribución"
            >
                <MapaLeaflet
                    obras={obras}
                    almacenes={almacenes}
                    stock={stock}
                    materiales={materiales}
                    rutas={rutas}
                    sugerencias={sugerencias}
                    seleccionadaId={seleccionObraId ?? undefined}
                    resaltarAlertaOrigenId={prediccionDinamica ? prediccionDinamica.almacenOrigenId : alertaHover?.almacenId}
                    resaltarAlertaDestinoId={
                        prediccionDinamica ? prediccionDinamica.almacenDestinoId : alertaHover?.receptoras?.[0]?.almacenId
                    }
                    onPinClick={(obraId) => {
                        setSeleccionObraId(obraId);
                        agregarAFrentesComparados(obraId);
                    }}
                />

                {prediccionDinamica && (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white shrink-0 mt-0.5">
                                    <IconSparkles size={18} />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                                            Redistribución sugerida por cercanía
                                        </span>
                                        <Badge tone="violet">{formatKm(prediccionDinamica.km)}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm font-semibold text-ink">
                                        Trasladar {formatNum(prediccionDinamica.cantidad)} {prediccionDinamica.unidad} de{' '}
                                        <span className="text-violet-700">{prediccionDinamica.nombreMaterial}</span> desde{' '}
                                        <strong>{prediccionDinamica.nombreOrigen}</strong> hacia{' '}
                                        <strong>{prediccionDinamica.nombreDestino}</strong>.
                                    </p>
                                    <p className="text-xs text-muted mt-0.5">
                                        Ahorro estimado en fletes y compras de urgencia: <strong className="text-ink">S/ {formatNum(prediccionDinamica.ahorroSoles)}</strong>.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Link
                                    href={`/transferencias?crear=sobrante&materialId=${prediccionDinamica.materialId}&origen=${prediccionDinamica.almacenOrigenId}&destino=${prediccionDinamica.almacenDestinoId}`}
                                    className="btn-primary text-xs"
                                >
                                    <IconRepeat size={14} />
                                    Generar transferencia
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setPrediccionDinamica(null)}
                                    className="btn-secondary text-xs !p-2"
                                    title="Descartar predicción"
                                >
                                    <IconX size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {almSeleccionado && (
                    <div className="mt-4 pt-4 border-t border-line">
                        <GeoDetalle
                            alm={almSeleccionado}
                            obras={obras}
                            almacenes={almacenes}
                            stock={stock}
                            materiales={materiales}
                            onClose={() => setSeleccionObraId(null)}
                        />
                    </div>
                )}
            </Card>

            {/* Comparativa de Frentes Activos */}
            <Card
                title="Comparativa de frentes y almacenes registrados"
                subtitle="Monitoreo de avance físico, distancias y estado de stock para balance de recursos"
                action={
                    obrasNoComparadas.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted hidden sm:inline">Agregar:</span>
                            <select
                                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-sm outline-none cursor-pointer hover:border-brand-400"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        agregarAFrentesComparados(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    + Agregar frente a comparar…
                                </option>
                                {obrasNoComparadas.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.nombre} ({o.distrito})
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null
                }
            >
                {frentesComparados.length === 0 ? (
                    <EmptyState
                        title="Ningún frente seleccionado"
                        hint="Haz clic en un marcador del mapa para comparar frentes."
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {frentesComparados.map((obraId) => {
                            const obra = obras.find((o) => o.id === obraId);
                            const alm = almacenes.find((a) => a.obraId === obraId);
                            if (!obra || !alm) return null;

                            const isSelectedOnMap = seleccionObraId === obra.id;
                            const isMainActive = obraActiva.id === obra.id;
                            const estado = estadoDeAlmacen(alm, obra.estado, stock, materiales);
                            const meta = ESTADO_META[estado];
                            const kmCentral = haversineDistanceKm(alm.coords, almCentral.coords);
                            const stockAlm = stock.stock[alm.id] ?? {};

                            let countOptimo = 0;
                            let countBajo = 0;
                            let countCritico = 0;

                            materiales.forEach((m) => {
                                const cant = stockAlm[m.id] ?? 0;
                                if (cant >= m.stockMinimo * 1.5) countOptimo++;
                                else if (cant >= m.stockMinimo) countBajo++;
                                else countCritico++;
                            });

                            return (
                                <div
                                    key={obra.id}
                                    className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                                        isSelectedOnMap
                                            ? 'border-brand-400 bg-brand-50/30 shadow-md ring-2 ring-brand-200'
                                            : 'border-line bg-surface hover:border-brand-200'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                                                        {obra.distrito}
                                                    </span>
                                                    {isMainActive && (
                                                        <Badge tone="ok" className="text-[10px]">
                                                            Frente Activo
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-ink text-sm mt-0.5">{obra.nombre}</h4>
                                                <p className="text-xs text-muted">{alm.nombre}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Badge
                                                    tone={
                                                        estado === 'optimo'
                                                            ? 'ok'
                                                            : estado === 'bajo'
                                                            ? 'warn'
                                                            : estado === 'critico'
                                                            ? 'danger'
                                                            : estado === 'sobrante'
                                                            ? 'violet'
                                                            : 'neutral'
                                                    }
                                                >
                                                    {meta.label}
                                                </Badge>
                                                {frentesComparados.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => quitarDeFrentesComparados(obra.id)}
                                                        className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink transition-colors"
                                                        title="Quitar de comparación"
                                                    >
                                                        <IconTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-soft/60 p-2.5 text-xs">
                                            <div>
                                                <span className="text-muted block text-[10px]">AVANCE FÍSICO</span>
                                                <span className="font-bold text-brand-600 text-sm">{obra.pctAvance}%</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block text-[10px]">DIST. A CENTRAL</span>
                                                <span className="font-bold text-ink text-sm">
                                                    {alm.id === 'alm-central' ? '0 km (Sede)' : formatKm(kmCentral)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-soft">
                                            <div
                                                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                                                style={{ width: `${obra.pctAvance}%` }}
                                            />
                                        </div>

                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-[11px] mb-1">
                                                <span className="font-semibold text-muted">Stock de Materiales:</span>
                                                <span className="text-muted">
                                                    <strong className="text-emerald-700">{countOptimo}</strong> ok ·{' '}
                                                    <strong className="text-amber-700">{countBajo}</strong> bajo ·{' '}
                                                    <strong className="text-rose-700">{countCritico}</strong> crít.
                                                </span>
                                            </div>
                                            <div className="space-y-1 border-t border-line/60 pt-1.5">
                                                {materiales.slice(0, 3).map((mat) => {
                                                    const cant = stockAlm[mat.id] ?? 0;
                                                    return (
                                                        <div key={mat.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-muted truncate max-w-[130px]">{mat.nombre}</span>
                                                            <span className="font-mono font-semibold text-ink">
                                                                {formatCantidad(cant)} {mat.unidad}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-line flex flex-col gap-1.5">
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Link
                                                href={`/stock?almacen=${alm.id}&obra=${obra.id}`}
                                                className="btn-secondary !px-2.5 !py-1.5 text-xs text-center justify-center"
                                            >
                                                <IconBoxes size={13} />
                                                Ver en Matriz
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSeleccionObraId(obra.id);
                                                    selectObra(obra.id);
                                                }}
                                                className={`btn-secondary !px-2.5 !py-1.5 text-xs text-center justify-center ${
                                                    isMainActive ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : ''
                                                }`}
                                            >
                                                <IconCheck size={13} />
                                                {isMainActive ? 'Activa principal' : 'Fijar activa'}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => calcularRedistribucionParaObra(obra.id, alm.id)}
                                            className="btn-primary !px-2.5 !py-1.5 text-xs text-center justify-center !bg-violet-600 hover:!bg-violet-700"
                                        >
                                            <IconSparkles size={13} />
                                            Calcular redistribución
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Accesos rápidos a los 8 módulos del sistema */}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card title="Movimientos de almacén — últimos 7 días" subtitle="Ingresos y salidas agregadas en la red">
                    <BarChart7d data={barChart7d} />
                    <div className="mt-4">
                        <ChartLegend
                            items={[
                                { label: 'Ingresos a almacén', className: 'bg-brand-500' },
                                { label: 'Despachos / Salidas', className: 'bg-ok-soft' },
                            ]}
                        />
                    </div>
                </Card>

                <Card className="lg:col-span-2" title="Módulos de Almacén y Logística" subtitle="Accesos directos a los flujos operativos">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <QuickLink to="/stock" icon={<IconBoxes size={18} />} label="Matriz de Stock" desc="Saldos multi-almacén" />
                        <QuickLink to="/solicitudes" icon={<IconClipboardList size={18} />} label="Solicitudes" desc="Pedidos GPS de frente" />
                        <QuickLink to="/compras" icon={<IconShoppingCart size={18} />} label="Compras" desc="Requerimientos y OC" />
                        <QuickLink to="/recepcion" icon={<IconInbox size={18} />} label="Recepción" desc="Ingreso contra OC" />
                        <QuickLink to="/despachos" icon={<IconTruck size={18} />} label="Despachos" desc="Guías y rutas" />
                        <QuickLink to="/transferencias" icon={<IconRepeat size={18} />} label="Transferencias" desc="Movimientos inter-obra" />
                        <QuickLink to="/mermas" icon={<IconAlertTriangle size={18} />} label="Mermas" desc="Pérdidas y devoluciones" />
                        <div className="flex flex-col justify-between rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs">
                            <span className="font-bold text-brand-900">Enfoque PMI / PMU</span>
                            <p className="text-[11px] text-brand-700">Trazabilidad operativa multi-obra</p>
                            <span className="font-semibold text-brand-800 mt-1">Huancayo · Junín</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function QuickLink({ to, icon, label, desc }: { to: string; icon: React.ReactNode; label: string; desc: string }) {
    return (
        <Link
            href={to}
            className="group flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-3 text-ink shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop"
        >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                {icon}
            </span>
            <span className="text-xs font-bold truncate">{label}</span>
            <span className="text-[10px] text-muted truncate">{desc}</span>
        </Link>
    );
}