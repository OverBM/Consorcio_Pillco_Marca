import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { formatMoneda } from '../utils/format';

export default function PresupuestoPage() {
    const partidasCostosMock = [
        {
            id: '1',
            rubro: 'Mano de Obra Directa (Régimen Construcción Civil)',
            presupuestado: 450000.0,
            ejecutado: 382000.0,
            saldo: 68000.0,
            pct: 84.8,
        },
        {
            id: '2',
            rubro: 'Materiales e Insumos Principales',
            presupuestado: 850000.0,
            ejecutado: 714000.0,
            saldo: 136000.0,
            pct: 84.0,
        },
        {
            id: '3',
            rubro: 'Equipos y Maquinaria Pesada',
            presupuestado: 320000.0,
            ejecutado: 256000.0,
            saldo: 64000.0,
            pct: 80.0,
        },
        {
            id: '4',
            rubro: 'Subcontratos y Servicios de Terceros',
            presupuestado: 180000.0,
            ejecutado: 144000.0,
            saldo: 36000.0,
            pct: 80.0,
        },
        {
            id: '5',
            rubro: 'Gastos Generales y Supervisión',
            presupuestado: 120000.0,
            ejecutado: 96000.0,
            saldo: 24000.0,
            pct: 80.0,
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Control Presupuestal y Costos por Rubro"
                subtitle="Monitoreo de costos reales incurridos vs. presupuesto meta contractual"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin rubros presupuestales."
                    columns={[
                        { key: 'rubro', header: 'Rubro de Costo' },
                        {
                            key: 'presupuestado',
                            header: 'Presupuesto Meta',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'ejecutado',
                            header: 'Costo Real Incurrido',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'saldo',
                            header: 'Saldo Disponible',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'pct',
                            header: 'Ejecución %',
                            align: 'right',
                            cell: (r) => {
                                const pct = (r as { pct?: number }).pct ?? 0;
                                return (
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="bg-soft h-1.5 w-16 overflow-hidden rounded-full">
                                            <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-ink font-mono text-xs font-bold">
                                            {pct}%
                                        </span>
                                    </div>
                                );
                            },
                        },
                    ]}
                    rows={partidasCostosMock.map((p) => ({
                        id: p.id,
                        rubro: p.rubro,
                        presupuestado: formatMoneda(p.presupuestado),
                        ejecutado: formatMoneda(p.ejecutado),
                        saldo: formatMoneda(p.saldo),
                        pct: p.pct,
                    }))}
                />
            </Card>
        </div>
    );
}
