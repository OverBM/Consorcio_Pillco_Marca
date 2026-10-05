import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconCheckCircle, IconSearch, IconFileText } from '../components/icons';

export default function CalidadPage() {
    const observacionesMock = [
        { id: '1', acta: 'ACTA-SUP-012', origen: 'Supervisión', descripcion: 'Segregación leve de concreto en estribo izquierdo eje 1', plazo: '2026-10-10', responsable: 'Ing. Residente de Obra', estado: 'levantada', planos: true },
        { id: '2', acta: 'ACTA-SUP-014', origen: 'Supervisión', descripcion: 'Recubrimiento insuficiente de armadura en viga cabezal tramo 2', plazo: '2026-10-12', responsable: 'Maestro de Obra', estado: 'notificada', planos: false },
        { id: '3', acta: 'ACTA-INT-005', origen: 'Control Interno', descripcion: 'Desalineamiento milimétrico de encofrado metálico en muro M-3', plazo: '2026-10-15', responsable: 'Jefe de Calidad', estado: 'notificada', planos: false },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Observaciones Técnicas y Control de Calidad"
                subtitle="Gestión de no conformidades emitidas por supervisión de obra y actas de levantamiento con planos As-Built"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin observaciones registradas."
                    columns={[
                        { key: 'acta', header: 'N° Acta', mono: true },
                        { key: 'origen', header: 'Origen', mono: true },
                        { key: 'descripcion', header: 'Descripción de la Observación' },
                        { key: 'responsable', header: 'Responsable' },
                        { key: 'plazo', header: 'Plazo Límite', mono: true },
                        {
                            key: 'planos',
                            header: 'As-Built',
                            align: 'center',
                            cell: (r) => {
                                const planos = (r as { planos?: boolean }).planos;
                                return (
                                    <Badge tone={planos ? 'ok' : 'neutral'}>
                                        {planos ? 'Actualizado' : 'Pendiente'}
                                    </Badge>
                                );
                            },
                        },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'levantada' ? 'ok' : 'danger'}>
                                        {estado === 'levantada' ? 'Levantada Conforme' : 'Notificada'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={observacionesMock.map((obs) => ({
                        id: obs.id,
                        acta: obs.acta,
                        origen: obs.origen,
                        descripcion: obs.descripcion,
                        responsable: obs.responsable,
                        plazo: obs.plazo,
                        planos: obs.planos,
                        estado: obs.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
