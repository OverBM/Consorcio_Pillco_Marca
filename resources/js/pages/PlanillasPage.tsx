import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatMoneda, formatNum } from '../utils/format';

export default function PlanillasPage() {
    const { obras } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    const planillasMock = [
        { id: '1', periodo: '2026-10-Q1', trabajadores: 34, diasTotal: 408, total: 81600.00, estado: 'procesada', fecha: '2026-10-04' },
        { id: '2', periodo: '2026-09-Q2', trabajadores: 32, diasTotal: 384, total: 76800.00, estado: 'pagada', fecha: '2026-09-30' },
        { id: '3', periodo: '2026-09-Q1', trabajadores: 30, diasTotal: 360, total: 72000.00, estado: 'pagada', fecha: '2026-09-15' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Planillas de Pago y Jornales"
                subtitle="Consolidación de horas efectivas laboradas, régimen de construcción civil y emisión de boletas"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin planillas generadas."
                    columns={[
                        { key: 'periodo', header: 'Periodo de Pago', mono: true },
                        { key: 'fecha', header: 'Fecha de Proceso', mono: true },
                        { key: 'trabajadores', header: 'N° Obreros', align: 'center', mono: true },
                        { key: 'diasTotal', header: 'Días-Hombre', align: 'right', mono: true },
                        { key: 'total', header: 'Monto Total Planilla', align: 'right', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'pagada' ? 'ok' : 'violet'}>
                                        {estado === 'pagada' ? 'Pagada / Bancarizada' : 'Procesada'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={planillasMock.map((p) => ({
                        id: p.id,
                        periodo: p.periodo,
                        fecha: p.fecha,
                        trabajadores: p.trabajadores,
                        diasTotal: p.diasTotal,
                        total: formatMoneda(p.total),
                        estado: p.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
