import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatMoneda, formatNum } from '../utils/format';

export default function PartidasPage() {
    const { obras } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    const partidasMock = [
        { id: '1', codigo: '01.01.01', descripcion: 'Limpieza y Desbroce de Terreno', unidad: 'M2', metradoTotal: 12000, metradoEjecutado: 12000, precioUnitario: 3.50, avancePct: 100 },
        { id: '2', codigo: '01.01.02', descripcion: 'Excavación Masiva con Maquinaria', unidad: 'M3', metradoTotal: 8500, metradoEjecutado: 6800, precioUnitario: 28.00, avancePct: 80 },
        { id: '3', codigo: '01.02.01', descripcion: 'Concreto f\'c=210 kg/cm2 para Zapatas', unidad: 'M3', metradoTotal: 650, metradoEjecutado: 455, precioUnitario: 420.00, avancePct: 70 },
        { id: '4', codigo: '01.02.02', descripcion: 'Acero Corrugado fy=4200 kg/cm2 Grado 60', unidad: 'KG', metradoTotal: 45000, metradoEjecutado: 29250, precioUnitario: 5.20, avancePct: 65 },
        { id: '5', codigo: '01.03.01', descripcion: 'Encofrado y Desencofrado de Muros de Contención', unidad: 'M2', metradoTotal: 3200, metradoEjecutado: 1600, precioUnitario: 75.00, avancePct: 50 },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Alcance y Partidas Contractuales"
                subtitle="Estructura de Desglose del Trabajo (EDT), metrados contractuales y avance ejecutado"
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
                    emptyLabel="Sin partidas registradas."
                    columns={[
                        { key: 'codigo', header: 'Ítem / Código', mono: true },
                        { key: 'descripcion', header: 'Descripción de la Partida' },
                        { key: 'unidad', header: 'Unidad', align: 'center', mono: true },
                        { key: 'metradoTotal', header: 'Metrado Cont.', align: 'right', mono: true },
                        { key: 'metradoEjecutado', header: 'Metrado Ejec.', align: 'right', mono: true },
                        { key: 'pu', header: 'P.U. (S/)', align: 'right', mono: true },
                        { key: 'parcial', header: 'Costo Total (S/)', align: 'right', mono: true },
                        {
                            key: 'avance',
                            header: 'Avance %',
                            align: 'right',
                            cell: (r) => {
                                const avance = (r as { avance?: number }).avance ?? 0;
                                return (
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 h-1.5 bg-soft rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avance}%` }} />
                                        </div>
                                        <span className="font-mono font-bold text-xs text-ink">{avance}%</span>
                                    </div>
                                );
                            },
                        },
                    ]}
                    rows={partidasMock.map((p) => ({
                        id: p.id,
                        codigo: p.codigo,
                        descripcion: p.descripcion,
                        unidad: p.unidad,
                        metradoTotal: formatNum(p.metradoTotal),
                        metradoEjecutado: formatNum(p.metradoEjecutado),
                        pu: formatNum(p.precioUnitario),
                        parcial: formatMoneda(p.metradoTotal * p.precioUnitario),
                        avance: p.avancePct,
                    }))}
                />
            </Card>
        </div>
    );
}
