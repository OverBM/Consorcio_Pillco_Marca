// Redistribución de excedentes inter-obras (AHP & GIS).
// Datos íntegramente desde props `excedentesDb`, `transferenciasAhpDb` y `parametrosDb`.

import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { IconBoxes, IconMapPin, IconTruck } from '../components/icons';
import { formatCantidad, formatKm, formatMoneda } from '../utils/format';

interface ExcedenteDb {
    id: number;
    obra_origen_id: number;
    almacen_id: number;
    material_id: number;
    cantidad: number | string;
    origen: string;
    estado: string;
    detectado_en?: string | null;
    obra?: { id: number; nombre: string } | null;
    almacen?: { id: number; nombre: string } | null;
    material?: { id: number; nombre: string; unidad_medida?: { codigo: string } | null } | null;
}

interface TransferenciaAhp {
    almacenOrigenId: string;
    almacenOrigenNombre: string;
    obraOrigenNombre: string;
    materialId: string;
    materialNombre: string;
    stockDisponible: number;
    cantidadSugerida: number;
    unidad: string;
    distanciaKm: number;
    tiempoEstimadoMin: number;
    puntajeAhp: number;
    ahorroEstimadoSoles: number;
    prioridad: 'alta' | 'media' | 'baja';
}

interface ParametroDb {
    id: number;
    clave: string;
    valor: string;
    descripcion?: string | null;
}

interface RedistribucionPageProps {
    excedentesDb?: ExcedenteDb[];
    transferenciasAhpDb?: TransferenciaAhp[];
    parametrosDb?: ParametroDb[];
}

type ExcedenteFila = Omit<ExcedenteDb, 'id'> & { id: string };

function tonoPrioridad(p: string): 'danger' | 'warn' | 'neutral' {
    if (p === 'alta') return 'danger';
    if (p === 'media') return 'warn';
    return 'neutral';
}

export default function RedistribucionPage({
    excedentesDb = [],
    transferenciasAhpDb = [],
    parametrosDb = [],
}: RedistribucionPageProps) {
    const excedentes: ExcedenteFila[] = useMemo(
        () => excedentesDb.map((e) => ({ ...e, id: String(e.id) })),
        [excedentesDb],
    );

    const totalSobrante = excedentes.reduce((acc, e) => acc + Number(e.cantidad || 0), 0);
    const ahorroPotencial = transferenciasAhpDb.reduce((acc, t) => acc + Number(t.ahorroEstimadoSoles || 0), 0);

    const transferencias = useMemo(
        () => transferenciasAhpDb.map((t, idx) => ({ ...t, id: `AHP-${idx + 1}` })),
        [transferenciasAhpDb],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Redistribución de Excedentes Inter-Obras (AHP & GIS)"
                subtitle="Optimización de materiales sobrantes por liquidación y rebalanceo geodésico"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Excedentes Detectados</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconBoxes size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-brand-600">{excedentes.length} lotes</p>
                    <span className="text-xs text-muted">Saldos disponibles para redistribución</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Volumen Sobrante</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconMapPin size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ink">{formatCantidad(totalSobrante)}</p>
                    <span className="text-xs text-muted">Unidades acumuladas en obras de origen</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Ahorro Estimado (AHP)</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconTruck size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ok">{formatMoneda(ahorroPotencial)}</p>
                    <span className="text-xs text-muted">Evita nuevas órdenes de compra</span>
                </Card>
            </div>

            <Card title="Transferencias Sugeridas por el Motor AHP" className="p-5">
                {transferencias.length === 0 ? (
                    <EmptyState
                        title="Sin transferencias sugeridas"
                        hint="No hay candidatos que cumplan el radio geográfico configurado."
                    />
                ) : (
                    <DataTable
                        emptyLabel="Sin transferencias sugeridas."
                        columns={[
                            { key: 'material', header: 'Material', cell: (t) => <span className="font-bold text-ink">{t.materialNombre}</span> },
                            {
                                key: 'origen',
                                header: 'Almacén Origen',
                                cell: (t) => (
                                    <div>
                                        <p className="text-xs font-semibold text-ink">{t.almacenOrigenNombre}</p>
                                        <p className="text-[11px] text-muted">{t.obraOrigenNombre}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'cantidad',
                                header: 'Cantidad',
                                align: 'right',
                                mono: true,
                                cell: (t) => `${formatCantidad(Number(t.cantidadSugerida))} ${t.unidad}`,
                            },
                            {
                                key: 'ruta',
                                header: 'Ruta GIS',
                                align: 'right',
                                mono: true,
                                cell: (t) => (
                                    <div>
                                        <span className="font-bold text-ink">{formatKm(t.distanciaKm)}</span>
                                        <span className="block text-[11px] text-muted">~{t.tiempoEstimadoMin} min</span>
                                    </div>
                                ),
                            },
                            { key: 'puntaje', header: 'Puntaje AHP', align: 'right', mono: true, cell: (t) => t.puntajeAhp.toFixed(1) },
                            { key: 'prioridad', header: 'Prioridad', align: 'center', cell: (t) => <Badge tone={tonoPrioridad(t.prioridad)}>{t.prioridad}</Badge> },
                            { key: 'ahorro', header: 'Ahorro Est.', align: 'right', mono: true, cell: (t) => formatMoneda(Number(t.ahorroEstimadoSoles)) },
                        ]}
                        rows={transferencias}
                    />
                )}
            </Card>

            <Card title="Inventario de Excedentes Detectados" className="p-5">
                {excedentes.length === 0 ? (
                    <EmptyState title="Sin excedentes registrados" hint="Se detectan automáticamente al iniciar el cierre de una obra." />
                ) : (
                    <DataTable
                        emptyLabel="Sin excedentes registrados."
                        columns={[
                            { key: 'material', header: 'Material', cell: (e) => e.material?.nombre ?? `Material #${e.material_id}` },
                            {
                                key: 'cantidad',
                                header: 'Cantidad',
                                align: 'right',
                                mono: true,
                                cell: (e) => `${formatCantidad(Number(e.cantidad))} ${e.material?.unidad_medida?.codigo ?? ''}`,
                            },
                            { key: 'almacen', header: 'Almacén', cell: (e) => e.almacen?.nombre ?? `Almacén #${e.almacen_id}` },
                            { key: 'obra', header: 'Obra Origen', cell: (e) => e.obra?.nombre ?? `Obra #${e.obra_origen_id}` },
                            { key: 'origen', header: 'Procedencia', cell: (e) => <Badge tone="violet">{e.origen}</Badge> },
                            { key: 'estado', header: 'Estado', align: 'center', cell: (e) => <Badge tone="ok">{e.estado}</Badge> },
                        ]}
                        rows={excedentes}
                    />
                )}
            </Card>

            <Card title="Parámetros del Motor de Optimización" className="p-5">
                {parametrosDb.length === 0 ? (
                    <EmptyState title="Sin parámetros configurados" hint="Configure los pesos AHP y el radio geográfico en Parámetros del Sistema." />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {parametrosDb.map((p) => (
                            <div key={p.id} className="rounded-lg border border-line bg-soft/40 p-3">
                                <p className="font-mono text-[11px] uppercase text-muted">{p.clave}</p>
                                <p className="mt-1 text-sm font-bold text-ink">{p.valor}</p>
                                {p.descripcion && <p className="mt-0.5 text-[11px] text-muted">{p.descripcion}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
