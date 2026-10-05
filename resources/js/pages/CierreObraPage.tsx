import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconCheckCircle, IconBoxes, IconFileText, IconRepeat } from '../components/icons';
import { useAppStore } from '../store/AppContext';
import { formatNum } from '../utils/format';

export default function CierreObraPage() {
    const { obras, almacenes } = useAppStore();
    const [obraId, setObraId] = useState(obras[0]?.id ?? '');

    const checklistCierre = [
        { id: '1', item: 'Ejecución física del 100% de partidas contractuales', estado: true, doc: 'Informe Final de Obra N° 004' },
        { id: '2', item: 'Levantamiento de todas las observaciones técnicas de supervisión', estado: true, doc: 'Acta de Levantamiento N° 012' },
        { id: '3', item: 'Planos As-Built actualizados y sellados por ingeniería', estado: true, doc: 'Expediente As-Built Rev. 2' },
        { id: '4', item: 'Toma física y evaluación de excedentes de materiales en almacenes', estado: true, doc: 'Acta de Inventario de Desmovilización' },
        { id: '5', item: 'Acta de Recepción Oficial de Obra con la Entidad', estado: false, doc: 'En trámite de firma' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cierre y Liquidación de Obra"
                subtitle="Procedimiento formal de culminación, desmovilización y transferencia de saldos a otras obras"
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-5">
                    <h3 className="text-base font-bold text-ink mb-3">Checklist de Cierre Contractual</h3>
                    <div className="space-y-3">
                        {checklistCierre.map((c) => (
                            <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-line bg-surface">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-ink">{c.item}</p>
                                    <p className="text-[11px] text-muted flex items-center gap-1">
                                        <IconFileText size={12} /> {c.doc}
                                    </p>
                                </div>
                                <Badge tone={c.estado ? 'ok' : 'warn'}>
                                    {c.estado ? 'Conforme' : 'Pendiente'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-5 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-ink mb-2">Integración con Redistribución de Excedentes</h3>
                        <p className="text-xs text-muted mb-4">
                            Al cerrar la obra, todos los saldos de inventario remanentes en los almacenes son catalogados automáticamente y puestos a disposición del motor de redistribución para abastecer obras activas sin incurrir en nuevas compras.
                        </p>
                        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-purple-600 text-white shrink-0">
                                <IconRepeat size={18} />
                            </div>
                            <div className="text-xs text-purple-950">
                                <strong>Saldos detectados listos para transferir:</strong> 3 materiales identificados para reasignación en el Valle del Mantaro.
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
