import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconAlertTriangle, IconShield } from '../components/icons';
import { useAppStore } from '../store/AppContext';

export default function RiesgosPage() {
    const { obras } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    const riesgosMock = [
        { id: '1', codigo: 'RSK-01', descripcion: 'Lluvias torrenciales en cuenca del Río Mantaro que pueden retrasar zapatas', categoria: 'ambiental', prob: 4, imp: 4, sev: 16, estado: 'abierto', respuesta: 'Refuerzo de diques y drenaje con motobombas' },
        { id: '2', codigo: 'RSK-02', descripcion: 'Desabastecimiento de acero corrugado por huelga de transporte nacional', categoria: 'logistico', prob: 3, imp: 4, sev: 12, estado: 'mitigado', respuesta: 'Stock de seguridad de 45 días en Almacén Central' },
        { id: '3', codigo: 'RSK-03', descripcion: 'Interferencias con tuberías matrices de agua no contempladas en expediente', categoria: 'tecnico', prob: 2, imp: 5, sev: 10, estado: 'abierto', respuesta: 'Georadar previo y coordinación con SEDAM Huancayo' },
        { id: '4', codigo: 'RSK-04', descripcion: 'Incremento de precios de combustible diésel para maquinaria pesada', categoria: 'financiero', prob: 4, imp: 2, sev: 8, estado: 'abierto', respuesta: 'Contrato forward de suministro con proveedor local' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Matriz de Riesgos y Alertas Tempranas"
                subtitle="Evaluación cualitativa y cuantitativa de riesgos (Probabilidad × Impacto = Severidad) y planes de respuesta"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Riesgos Críticos (Severidad &gt; 12)</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-red-600">2</p>
                    <span className="text-xs text-muted">Requieren plan de contingencia inmediato</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Riesgos Mitigados</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">1</p>
                    <span className="text-xs text-muted">Medidas preventivas operando</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Alertas de Stock / Clima</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-brand-600">3 Activas</p>
                    <span className="text-xs text-muted">Notificaciones en tiempo real</span>
                </Card>
            </div>

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin riesgos registrados."
                    columns={[
                        { key: 'codigo', header: 'Código', mono: true },
                        { key: 'descripcion', header: 'Descripción del Riesgo' },
                        { key: 'categoria', header: 'Categoría', mono: true },
                        { key: 'prob', header: 'Prob. (1-5)', align: 'center', mono: true },
                        { key: 'imp', header: 'Imp. (1-5)', align: 'center', mono: true },
                        {
                            key: 'sev',
                            header: 'Severidad',
                            align: 'center',
                            cell: (r) => {
                                const sev = (r as { sev?: number }).sev ?? 0;
                                return (
                                    <Badge tone={sev >= 15 ? 'danger' : sev >= 10 ? 'warn' : 'neutral'}>
                                        {sev} ({sev >= 15 ? 'Alta' : sev >= 10 ? 'Media' : 'Baja'})
                                    </Badge>
                                );
                            },
                        },
                        { key: 'respuesta', header: 'Estrategia de Respuesta / Mitigación' },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'mitigado' ? 'ok' : 'warn'}>
                                        {estado === 'mitigado' ? 'Mitigado' : 'Abierto'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={riesgosMock.map((r) => ({
                        id: r.id,
                        codigo: r.codigo,
                        descripcion: r.descripcion,
                        categoria: r.categoria.toUpperCase(),
                        prob: r.prob,
                        imp: r.imp,
                        sev: r.sev,
                        respuesta: r.respuesta,
                        estado: r.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
