import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconAlertTriangle, IconShield, IconFileText } from '../components/icons';

export default function IncidentesPage() {
    const incidentesMock = [
        { id: '1', codigo: 'INC-20261004-89A1', tipo: 'Accidente', gravedad: 'leve', fecha: '2026-10-04 15:30', trabajador: 'Juan Quispe Mayta', descripcion: 'Tropezón con fierros en plataforma de habilitación de vigas', estado: 'reportado' },
        { id: '2', codigo: 'INC-20260920-41F2', tipo: 'Incidente', gravedad: 'leve', fecha: '2026-09-20 11:15', trabajador: 'Carlos Huamán Soto', descripcion: 'Corte superficial en guante de cuero con alambre de amarre', estado: 'cerrado' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Registro de Incidentes y Accidentes SST"
                subtitle="Notificación inmediata, investigación de causas básicas e inmediatas y reporte SSOMA"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Días Sin Accidentes Incapacitantes</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-emerald-600">184 Días</p>
                    <span className="text-xs text-muted">Meta: 365 días continuos</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Índice de Frecuencia (IF)</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-ink">0.00</p>
                    <span className="text-xs text-muted">Por millón de horas-hombre</span>
                </Card>

                <Card className="p-4 bg-surface border-line">
                    <span className="text-xs font-mono uppercase text-muted">Acciones Correctivas Ejecutadas</span>
                    <p className="mt-1 text-2xl font-bold font-mono text-brand-600">100%</p>
                    <span className="text-xs text-muted">Causas subsanadas</span>
                </Card>
            </div>

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin incidentes registrados."
                    columns={[
                        { key: 'codigo', header: 'Código', mono: true },
                        { key: 'fecha', header: 'Fecha y Hora', mono: true },
                        { key: 'tipo', header: 'Tipo' },
                        { key: 'trabajador', header: 'Personal Involucrado' },
                        { key: 'descripcion', header: 'Descripción del Evento' },
                        {
                            key: 'gravedad',
                            header: 'Gravedad',
                            cell: (r) => {
                                const gravedad = (r as { gravedad?: string }).gravedad;
                                return (
                                    <Badge tone={gravedad === 'leve' ? 'warn' : 'danger'}>
                                        {gravedad?.toUpperCase()}
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
                                    <Badge tone={estado === 'cerrado' ? 'ok' : 'warn'}>
                                        {estado === 'cerrado' ? 'Cerrado' : 'Investigación'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={incidentesMock.map((inc) => ({
                        id: inc.id,
                        codigo: inc.codigo,
                        fecha: inc.fecha,
                        tipo: inc.tipo,
                        trabajador: inc.trabajador,
                        descripcion: inc.descripcion,
                        gravedad: inc.gravedad,
                        estado: inc.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
