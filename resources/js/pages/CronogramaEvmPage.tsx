import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconTrendingUp, IconAlertTriangle, IconCheckCircle, IconClock } from '../components/icons';
import { useAppStore } from '../store/AppContext';
import { formatMoneda } from '../utils/format';

export default function CronogramaEvmPage() {
    const { obras } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    // Métricas EVM calculadas
    const evm = {
        pv: 650000.00, // Valor Planificado
        ev: 680000.00, // Valor Ganado
        ac: 640000.00, // Costo Real
        bac: 1200000.00, // Presupuesto hasta la Conclusión
        cv: 40000.00, // EV - AC (Bajo presupuesto)
        sv: 30000.00, // EV - PV (Adelantado)
        cpi: 1.0625, // Eficiencia en Costo
        spi: 1.0462, // Eficiencia en Cronograma
        eac: 1129411.76, // Estimación al Término
        vac: 70588.24, // Variación al Término (Ahorro previsto)
        tcpi: 0.9286, // Índice de Desempeño del Trabajo Restante
    };

    const hitosMock = [
        { id: '1', nombre: 'Instalación de Campamento y Movilización', fechaPlan: '2026-02-15', fechaReal: '2026-02-12', estado: 'cumplido' },
        { id: '2', nombre: 'Culminación de Movimiento de Tierras', fechaPlan: '2026-05-30', fechaReal: '2026-05-25', estado: 'cumplido' },
        { id: '3', nombre: 'Vaciado de Cimentaciones y Zapatas', fechaPlan: '2026-08-15', fechaReal: '2026-08-10', estado: 'cumplido' },
        { id: '4', nombre: 'Montaje de Superestructura y Vigas', fechaPlan: '2026-10-30', fechaReal: null, estado: 'en_curso' },
        { id: '5', nombre: 'Pavimentación y Señalización Definitiva', fechaPlan: '2026-12-10', fechaReal: null, estado: 'pendiente' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cronograma y Gestión de Valor Ganado (EVM)"
                subtitle="Indicadores de desempeño de costo y plazo bajo metodología PMI (SPI, CPI, EAC, VAC, TCPI)"
            />

            {/* Selector de Obra */}
            <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-muted">Obra Evaluada:</span>
                <select
                    value={obraId}
                    onChange={(e) => setObraId(e.target.value)}
                    className="rounded-field border border-line bg-canvas px-3 py-1.5 text-xs text-ink outline-none"
                >
                    {obras.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.nombre} ({o.distrito})
                        </option>
                    ))}
                </select>
            </Card>

            {/* Panel de Métricas EVM */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">SPI (Desempeño Cronograma)</span>
                    <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">{evm.spi.toFixed(4)}</p>
                    <span className="text-xs text-emerald-700 font-medium">Adelantado (SV: +{formatMoneda(evm.sv)})</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">CPI (Desempeño Costo)</span>
                    <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">{evm.cpi.toFixed(4)}</p>
                    <span className="text-xs text-emerald-700 font-medium">Bajo Presupuesto (CV: +{formatMoneda(evm.cv)})</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">EAC (Estimado a Conclusión)</span>
                    <p className="mt-2 text-2xl font-bold font-mono text-ink">{formatMoneda(evm.eac)}</p>
                    <span className="text-xs text-muted">BAC Original: {formatMoneda(evm.bac)}</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">VAC (Ahorro / Variación Final)</span>
                    <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">+{formatMoneda(evm.vac)}</p>
                    <span className="text-xs text-muted">TCPI Requerido: {evm.tcpi.toFixed(4)}</span>
                </Card>
            </div>

            {/* Hitos Contractuales */}
            <Card className="p-5">
                <h3 className="text-base font-bold text-ink mb-1">Hitos Contractuales de Cronograma</h3>
                <p className="text-xs text-muted mb-4">Fechas clave y cumplimiento de fases en obra</p>

                <DataTable<{ id: string }>
                    emptyLabel="Sin hitos registrados."
                    columns={[
                        { key: 'nombre', header: 'Hito Contractual' },
                        { key: 'fechaPlan', header: 'Fecha Planificada', mono: true },
                        { key: 'fechaReal', header: 'Fecha Real', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'cumplido' ? 'ok' : estado === 'en_curso' ? 'warn' : 'neutral'}>
                                        {estado === 'cumplido' ? 'Cumplido' : estado === 'en_curso' ? 'En Curso' : 'Pendiente'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={hitosMock.map((h) => ({
                        id: h.id,
                        nombre: h.nombre,
                        fechaPlan: h.fechaPlan,
                        fechaReal: h.fechaReal ?? '—',
                        estado: h.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
