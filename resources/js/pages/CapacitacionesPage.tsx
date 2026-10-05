import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';

export default function CapacitacionesPage() {
    const capacitacionesMock = [
        { id: '1', titulo: 'Trabajos en Altura y Uso de Arnés Doble Línea', tipo: 'SST Operativa', fecha: '2026-10-02', instructor: 'Ing. Prevencionista SSOMA', participantes: 24, estado: 'completada' },
        { id: '2', titulo: 'Procedimiento de Vaciado de Concreto y Ergonomía', tipo: 'Calidad / SST', fecha: '2026-10-08', instructor: 'Especialista en Estructuras', participantes: 18, estado: 'programada' },
        { id: '3', titulo: 'Manejo de Residuos Sólidos y Clasificación Ambiental', tipo: 'Medio Ambiente', fecha: '2026-10-15', instructor: 'Supervisor Ambiental', participantes: 30, estado: 'programada' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Capacitación y Habilitación de Personal"
                subtitle="Registro de inducciones de seguridad, capacitaciones técnicas y habilitación para frentes de obra"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin capacitaciones programadas."
                    columns={[
                        { key: 'titulo', header: 'Tema de Capacitación' },
                        { key: 'tipo', header: 'Tipo', mono: true },
                        { key: 'fecha', header: 'Fecha Programada', mono: true },
                        { key: 'instructor', header: 'Instructor / Especialista' },
                        { key: 'participantes', header: 'Asistentes', align: 'center', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'completada' ? 'ok' : 'warn'}>
                                        {estado === 'completada' ? 'Ejecutada' : 'Programada'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={capacitacionesMock.map((c) => ({
                        id: c.id,
                        titulo: c.titulo,
                        tipo: c.tipo,
                        fecha: c.fecha,
                        instructor: c.instructor,
                        participantes: c.participantes,
                        estado: c.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
