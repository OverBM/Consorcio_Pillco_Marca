import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Modal } from '../components/ui';
import { IconCheckCircle, IconClock, IconAlertTriangle, IconFileText } from '../components/icons';
import { useAppStore } from '../store/AppContext';

export default function CicloVidaPage() {
    const { obras } = useAppStore();
    const [obraSeleccionada, setObraSeleccionada] = useState(obras[0]?.id ?? '');

    const FASES_PMI = [
        {
            fase: 'Inicio',
            codigo: 'inicio',
            estado: 'aprobada',
            responsable: 'Gerente General / PMU',
            entregables: ['Acta de Constitución del Proyecto (Project Charter)', 'Designación del Residente de Obra'],
            fecha: '15/01/2026',
        },
        {
            fase: 'Planificación',
            codigo: 'planificacion',
            estado: 'aprobada',
            responsable: 'Oficina Técnica / Residente',
            entregables: ['Línea Base de Alcance (EDT/Partidas)', 'Línea Base de Cronograma (Gantt/Hitos)', 'Línea Base de Costo (BAC)'],
            fecha: '28/02/2026',
        },
        {
            fase: 'Ejecución',
            codigo: 'ejecucion',
            estado: 'en_proceso',
            responsable: 'Residente / Maestro de Obra',
            entregables: ['Avance Físico de Partidas', 'Requerimientos de Materiales y e-POD', 'Asignación de EPP y Asistencia'],
            fecha: '01/03/2026 - Presente',
        },
        {
            fase: 'Monitoreo y Control',
            codigo: 'monitoreo_control',
            estado: 'en_proceso',
            responsable: 'Área Técnica / Supervisión',
            entregables: ['Análisis EVM (SPI, CPI, EAC, VAC)', 'Valorizaciones Mensuales', 'Matriz de Riesgos y Control de Cambios'],
            fecha: 'Continuo',
        },
        {
            fase: 'Cierre de Obra',
            codigo: 'cierre',
            estado: 'pendiente',
            responsable: 'Consorcio / Entidad Contratante',
            entregables: ['Acta de Recepción de Obra', 'Planos As-Built Actualizados', 'Detección y Redistribución de Excedentes'],
            fecha: 'Previsto: 15/12/2026',
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ciclo de Vida de Obra (PMI / PMU)"
                subtitle="Seguimiento secuencial por fases estandarizadas según el marco de gestión de proyectos"
            />

            {/* Selector de Obra */}
            <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-mono uppercase text-muted">Seleccionar Obra de Análisis:</span>
                <select
                    value={obraSeleccionada}
                    onChange={(e) => setObraSeleccionada(e.target.value)}
                    className="rounded-field border border-line bg-canvas px-3 py-1.5 text-xs text-ink outline-none"
                >
                    {obras.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.nombre} ({o.distrito})
                        </option>
                    ))}
                </select>
            </Card>

            {/* Stepper de Fases PMI */}
            <div className="grid gap-4 lg:grid-cols-5">
                {FASES_PMI.map((fase, index) => (
                    <Card key={fase.codigo} className="p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-muted">Fase 0{index + 1}</span>
                                <Badge tone={fase.estado === 'aprobada' ? 'ok' : fase.estado === 'en_proceso' ? 'warn' : 'neutral'}>
                                    {fase.estado === 'aprobada' ? 'Aprobada' : fase.estado === 'en_proceso' ? 'En Curso' : 'Pendiente'}
                                </Badge>
                            </div>
                            <h4 className="text-sm font-bold text-ink">{fase.fase}</h4>
                            <p className="text-[11px] text-muted">{fase.responsable}</p>
                            <p className="text-[10px] font-mono text-brand-600 font-medium">{fase.fecha}</p>

                            <div className="pt-2 border-t border-line/60">
                                <span className="text-[10px] uppercase font-mono font-bold text-muted">Entregables Clave:</span>
                                <ul className="mt-1 space-y-1">
                                    {fase.entregables.map((ent, i) => (
                                        <li key={i} className="text-[11px] text-ink/80 flex items-start gap-1.5">
                                            <span className="text-brand-500 mt-0.5">•</span>
                                            <span>{ent}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
