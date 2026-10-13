// Tablero consolidado del programa (PMU).
// Datos íntegramente desde props `obrasDb` y `evmConsolidado`; sin estado mock.

import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { IconBuilding, IconTrendingUp, IconCheckCircle, IconAlert } from '../components/icons';
import { formatMoneda } from '../utils/format';

interface ObraPrograma {
    id: string;
    codigo: string;
    nombre: string;
    distrito: string;
    responsable: string;
    estado: string;
    pctAvance: number;
    presupuesto: number;
}

interface EvmConsolidado {
    totalObras: number;
    totalBac: number;
    totalPv: number;
    totalEv: number;
    totalAc: number;
    cpi: number;
    spi: number;
    avanceFisicoPct: number;
    ahorroObrasSoles: number;
}

interface ProgramaPageProps {
    obrasDb?: ObraPrograma[];
    evmConsolidado?: EvmConsolidado;
}

type Fila = ObraPrograma & { id: string };

const ESTADOS = ['todos', 'activa', 'ejecucion', 'cierre', 'liquidada'];

function tonoEstado(estado: string): 'ok' | 'warn' | 'danger' | 'neutral' {
    if (estado === 'activa' || estado === 'ejecucion') return 'ok';
    if (estado === 'cierre') return 'warn';
    if (estado === 'liquidada' || estado === 'cerrada') return 'neutral';
    return 'neutral';
}

export default function ProgramaPage({ obrasDb = [], evmConsolidado }: ProgramaPageProps) {
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const filas: Fila[] = useMemo(() => obrasDb.map((o) => ({ ...o, id: String(o.id) })), [obrasDb]);

    const filtradas = useMemo(
        () => (filtroEstado === 'todos' ? filas : filas.filter((o) => o.estado === filtroEstado)),
        [filas, filtroEstado],
    );

    const totalPresupuesto = evmConsolidado?.totalBac ?? filas.reduce((acc, o) => acc + (o.presupuesto || 0), 0);
    const obrasActivas = filas.filter((o) => o.estado === 'activa' || o.estado === 'ejecucion').length;
    const avancePromedio =
        evmConsolidado?.avanceFisicoPct ??
        Math.round(filas.reduce((acc, o) => acc + (o.pctAvance || 0), 0) / (filas.length || 1));
    const spiVal = evmConsolidado?.spi ?? 0;
    const cpiVal = evmConsolidado?.cpi ?? 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tablero Consolidado del Programa (PMU)"
                subtitle="Monitoreo ejecutivo del portafolio de obras, presupuesto consolidado e indicadores de desempeño"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Obras en Portafolio</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconBuilding size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ink">{evmConsolidado?.totalObras ?? filas.length}</p>
                    <span className="text-xs text-brand-600 font-medium">{obrasActivas} activas en ejecución</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Presupuesto Consolidado</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconTrendingUp size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ink">{formatMoneda(totalPresupuesto)}</p>
                    <span className="text-xs text-muted">Línea base contractual (BAC)</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Avance Físico Promedio</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconCheckCircle size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ok">{avancePromedio}%</p>
                    <div className="mt-2 h-1.5 w-full bg-soft rounded-full overflow-hidden">
                        <div className="h-full bg-ok rounded-full" style={{ width: `${Math.min(100, Math.max(0, avancePromedio))}%` }} />
                    </div>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">SPI / CPI Consolidado</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconAlert size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-brand-600">
                        {spiVal.toFixed(2)} / {cpiVal.toFixed(2)}
                    </p>
                    <span className="text-xs text-muted">Desempeño cronograma y costo</span>
                </Card>
            </div>

            <Card className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-ink">Portafolio de Obras</h3>
                        <p className="text-xs text-muted">Seguimiento por frentes de trabajo y estado operacional</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ESTADOS.map((st) => (
                            <button
                                key={st}
                                onClick={() => setFiltroEstado(st)}
                                className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors capitalize cursor-pointer ${
                                    filtroEstado === st ? 'bg-ink text-canvas font-bold' : 'bg-soft text-muted hover:text-ink'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {filas.length === 0 ? (
                    <EmptyState title="Sin obras registradas" hint="Aún no hay proyectos en el portafolio." />
                ) : (
                    <DataTable
                        emptyLabel="No hay obras que coincidan con el filtro."
                        columns={[
                            { key: 'codigo', header: 'Código', mono: true },
                            { key: 'nombre', header: 'Nombre de la Obra' },
                            { key: 'distrito', header: 'Distrito' },
                            { key: 'responsable', header: 'Residente Responsable' },
                            { key: 'avance', header: 'Avance %', align: 'right', mono: true, cell: (o) => `${o.pctAvance ?? 0}%` },
                            {
                                key: 'estado',
                                header: 'Estado',
                                cell: (o) => <Badge tone={tonoEstado(o.estado)}>{o.estado}</Badge>,
                            },
                        ]}
                        rows={filtradas}
                    />
                )}
            </Card>
        </div>
    );
}
