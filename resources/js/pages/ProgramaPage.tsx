import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconBuilding, IconTrendingUp, IconAlert, IconCheckCircle, IconRefresh } from '../components/icons';
import { useAppStore } from '../store/AppContext';
import { formatMoneda } from '../utils/format';

interface ProgramaPageProps {
    obrasDb?: Array<{
        id: string;
        codigo: string;
        nombre: string;
        distrito: string;
        responsable: string;
        estado: string;
        pctAvance: number;
        presupuesto: number;
    }>;
    evmConsolidado?: {
        total_obras: number;
        obras_activas: number;
        bac_total: number;
        pv_total: number;
        ev_total: number;
        ac_total: number;
        cv_total: number;
        sv_total: number;
        cpi_consolidado: number;
        spi_consolidado: number;
        eac_total: number;
        vac_total: number;
    };
}

export default function ProgramaPage({ obrasDb, evmConsolidado }: ProgramaPageProps) {
    const { obras: obrasStore } = useAppStore();
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const listaObras = obrasDb && obrasDb.length > 0 ? obrasDb : obrasStore;

    const obrasFiltradas = listaObras.filter((o) => {
        if (filtroEstado === 'todos') return true;
        return o.estado === filtroEstado;
    });

    const totalPresupuesto = evmConsolidado?.bac_total ?? listaObras.reduce((acc, o) => acc + (('presupuesto' in o ? (o.presupuesto as number) : 1850000) || 1850000), 0);
    const obrasActivas = evmConsolidado?.obras_activas ?? listaObras.filter((o) => o.estado === 'activa' || o.estado === 'ejecucion').length;
    const avancePromedio = Math.round(
        listaObras.reduce((acc, o) => acc + (('pctAvance' in o ? (o.pctAvance as number) : 65) || 65), 0) / (listaObras.length || 1)
    );
    const spiVal = evmConsolidado?.spi_consolidado ?? 1.04;
    const cpiVal = evmConsolidado?.cpi_consolidado ?? 0.98;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tablero Consolidado del Programa (PMU)"
                subtitle="Monitoreo ejecutivo de portafolio de obras, presupuesto consolidado e indicadores de desempeño"
            />

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Obras en Portafolio</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconBuilding size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ink">{listaObras.length}</p>
                    <span className="text-xs text-primary-600 font-medium">{obrasActivas} activas en ejecución</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Presupuesto Consolidado</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconTrendingUp size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-ink">{formatMoneda(totalPresupuesto)}</p>
                    <span className="text-xs text-muted">Línea base contractual BAC</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">Avance Físico Promedio</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconCheckCircle size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">{avancePromedio}%</p>
                    <div className="mt-2 h-1.5 w-full bg-soft rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avancePromedio}%` }} />
                    </div>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted">SPI / CPI Consolidado</span>
                        <div className="p-2 rounded-lg bg-soft text-ink">
                            <IconAlert size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold font-mono text-primary-600">
                        {spiVal.toFixed(2)} / {cpiVal.toFixed(2)}
                    </p>
                    <span className="text-xs text-muted">Desempeño cronograma y costo</span>
                </Card>
            </div>

            {/* Listado de Obras */}
            <Card className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-ink">Portafolio de Obras - Valle del Mantaro</h3>
                        <p className="text-xs text-muted">Seguimiento por frentes de trabajo y estado operacional</p>
                    </div>
                    <div className="flex gap-2">
                        {['todos', 'activa', 'cerrada'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setFiltroEstado(st)}
                                className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors capitalize cursor-pointer ${
                                    filtroEstado === st
                                        ? 'bg-ink text-canvas font-bold'
                                        : 'bg-soft text-muted hover:text-ink'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                <DataTable<{ id: string }>
                    emptyLabel="No hay obras que coincidan con el filtro."
                    columns={[
                        { key: 'codigo', header: 'Código', mono: true },
                        { key: 'nombre', header: 'Nombre de la Obra' },
                        { key: 'distrito', header: 'Distrito' },
                        { key: 'residente', header: 'Residente Responsable' },
                        { key: 'avance', header: 'Avance %', align: 'right', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'activa' ? 'ok' : 'neutral'}>
                                        {estado === 'activa' ? 'En Ejecución' : 'Cerrada'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={obrasFiltradas.map((o) => ({
                        id: o.id,
                        codigo: `OBR-${o.id.toUpperCase()}`,
                        nombre: o.nombre,
                        distrito: o.distrito,
                        residente: o.responsable ?? 'Ing. Residente General',
                        avance: `${o.pctAvance ?? 65}%`,
                        estado: o.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
