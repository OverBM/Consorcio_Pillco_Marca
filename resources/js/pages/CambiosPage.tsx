import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../store/AppContext';
import { formatMoneda } from '../utils/format';

export default function CambiosPage() {
    const { obras } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    const solicitudesMock = [
        { id: '1', codigo: 'SOL-CAM-01', tipo: 'costo', descripcion: 'Adicional N° 1 por mejoramiento de terreno con pedraplén', plazoDias: 15, costo: 85000.00, estado: 'aprobada', fecha: '2026-08-20' },
        { id: '2', codigo: 'SOL-CAM-02', tipo: 'plazo', descripcion: 'Ampliación de plazo por paralización temporal por crecida de río', plazoDias: 20, costo: 0.00, estado: 'aprobada', fecha: '2026-09-10' },
        { id: '3', codigo: 'SOL-CAM-03', tipo: 'alcance', descripcion: 'Modificación técnica de estribo derecho por sondeos adicionales', plazoDias: 10, costo: 42000.00, estado: 'solicitada', fecha: '2026-10-02' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Control Integrado de Cambios"
                subtitle="Gestión de adicionales, deductivos, ampliaciones de plazo e impacto en la línea base"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin solicitudes de cambio."
                    columns={[
                        { key: 'codigo', header: 'Código', mono: true },
                        { key: 'fecha', header: 'Fecha', mono: true },
                        { key: 'tipo', header: 'Tipo de Cambio', mono: true },
                        { key: 'descripcion', header: 'Descripción del Cambio Solicitado' },
                        { key: 'plazo', header: 'Impacto Plazo', align: 'right', mono: true },
                        { key: 'costo', header: 'Impacto Costo', align: 'right', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'aprobada' ? 'ok' : 'warn'}>
                                        {estado === 'aprobada' ? 'Aprobada' : 'En Evaluación'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={solicitudesMock.map((s) => ({
                        id: s.id,
                        codigo: s.codigo,
                        fecha: s.fecha,
                        tipo: s.tipo.toUpperCase(),
                        descripcion: s.descripcion,
                        plazo: s.plazoDias > 0 ? `+${s.plazoDias} días` : '0 días',
                        costo: s.costo > 0 ? `+${formatMoneda(s.costo)}` : 'S/ 0.00',
                        estado: s.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
