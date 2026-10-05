import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconShield, IconCheckCircle, IconBoxes } from '../components/icons';

export default function EppPage() {
    const eppAsignadosMock = [
        { id: '1', trabajador: 'Juan Quispe Mayta', cargo: 'Operario Fierrero', epp: 'Casco de Seguridad 3M Blanco con Barboquejo', serie: '3M-CSC-2026-0098', fecha: '2026-10-04', estado: 'vigente' },
        { id: '2', trabajador: 'Juan Quispe Mayta', cargo: 'Operario Fierrero', epp: 'Arnés de Seguridad Cuerpo Entero 4 Anillos', serie: 'ARN-DOR-2026-0412', fecha: '2026-10-01', estado: 'vigente' },
        { id: '3', trabajador: 'Carlos Huamán Soto', cargo: 'Operario Encofrador', epp: 'Lentes de Seguridad Anti-empañantes Oscuros', serie: 'LNT-2026-0811', fecha: '2026-09-15', estado: 'vigente' },
        { id: '4', trabajador: 'Pedro Mendoza Ramos', cargo: 'Oficial Albañil', epp: 'Botas de Cuero con Punta de Acero Talla 41', serie: 'BOT-ACR-2026-0155', fecha: '2026-08-10', estado: 'vigente' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Uso y Control de EPP Serializado"
                subtitle="Trazabilidad por trabajador, número de serie de equipos de protección y descarga automática de almacén"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin asignaciones de EPP registradas."
                    columns={[
                        { key: 'trabajador', header: 'Trabajador Asignado' },
                        { key: 'cargo', header: 'Cargo' },
                        { key: 'epp', header: 'Equipo de Protección Personal (EPP)' },
                        { key: 'serie', header: 'N° Serie / Código Único', mono: true },
                        { key: 'fecha', header: 'Fecha de Entrega', mono: true },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'vigente' ? 'ok' : 'neutral'}>
                                        {estado === 'vigente' ? 'Vigente / Operativo' : 'Devuelto'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={eppAsignadosMock.map((e) => ({
                        id: e.id,
                        trabajador: e.trabajador,
                        cargo: e.cargo,
                        epp: e.epp,
                        serie: e.serie,
                        fecha: e.fecha,
                        estado: e.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
