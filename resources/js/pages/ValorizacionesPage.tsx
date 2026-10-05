import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatMoneda } from '../utils/format';

export default function ValorizacionesPage() {
    const { obras } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    const valorizacionesMock = [
        { id: '1', periodo: '2026-05', pv: 120000, ev: 125000, ac: 118000, estado: 'aprobada', cpi: 1.059, spi: 1.041 },
        { id: '2', periodo: '2026-06', pv: 140000, ev: 142000, ac: 139000, estado: 'aprobada', cpi: 1.021, spi: 1.014 },
        { id: '3', periodo: '2026-07', pv: 160000, ev: 165000, ac: 155000, estado: 'aprobada', cpi: 1.064, spi: 1.031 },
        { id: '4', periodo: '2026-08', pv: 150000, ev: 158000, ac: 148000, estado: 'aprobada', cpi: 1.067, spi: 1.053 },
        { id: '5', periodo: '2026-09', pv: 130000, ev: 132000, ac: 129000, estado: 'aprobada', cpi: 1.023, spi: 1.015 },
        { id: '6', periodo: '2026-10', pv: 140000, ev: 145000, ac: 141000, estado: 'borrador', cpi: 1.028, spi: 1.035 },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Costos y Valorizaciones Mensuales"
                subtitle="Curva S de avance financiero, amortización de adelantos y cálculo de valor ganado"
            />

            <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-muted">Obra en Consulta:</span>
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

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin valorizaciones registradas."
                    columns={[
                        { key: 'periodo', header: 'Periodo / Mes', mono: true },
                        { key: 'pv', header: 'Valor Planificado (PV)', align: 'right', mono: true },
                        { key: 'ev', header: 'Valor Ganado (EV)', align: 'right', mono: true },
                        { key: 'ac', header: 'Costo Real (AC)', align: 'right', mono: true },
                        { key: 'spi', header: 'SPI', align: 'right', mono: true },
                        { key: 'cpi', header: 'CPI', align: 'right', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'aprobada' ? 'ok' : 'warn'}>
                                        {estado === 'aprobada' ? 'Aprobada' : 'En Borrador'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={valorizacionesMock.map((v) => ({
                        id: v.id,
                        periodo: v.periodo,
                        pv: formatMoneda(v.pv),
                        ev: formatMoneda(v.ev),
                        ac: formatMoneda(v.ac),
                        spi: v.spi.toFixed(3),
                        cpi: v.cpi.toFixed(3),
                        estado: v.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
