import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { IconShield } from '../components/icons';

export default function AuditoriaPage() {
    const mockIp = (segment: number) => ['192', '168', '1', segment].join('.');

    const logsMock = [
        { id: '1', fecha: '2026-10-04 22:15:30', usuario: 'residente@pillcomarca.pe', accion: 'CREATE', tabla: 'solicitudes_material', ip: mockIp(45), detalle: 'Creación de solicitud SOL-20261004-9912' },
        { id: '2', fecha: '2026-10-04 21:50:10', usuario: 'almacen@pillcomarca.pe', accion: 'INSERT', tabla: 'kardex', ip: mockIp(102), detalle: 'Ingreso e-POD Guía 001-4412 (500 bls cemento)' },
        { id: '3', fecha: '2026-10-04 20:30:45', usuario: 'logistica@pillcomarca.pe', accion: 'UPDATE', tabla: 'transferencias', ip: mockIp(18), detalle: 'Aprobación de transferencia TRF-20261004-9A21' },
        { id: '4', fecha: '2026-10-04 18:10:00', usuario: 'sst@pillcomarca.pe', accion: 'CREATE', tabla: 'epp_asignaciones', ip: mockIp(55), detalle: 'Asignación casco serializado 3M-CSC-2026-0098' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bitácora y Trazabilidad de Auditoría"
                subtitle="Registro inmutable de transacciones, mutaciones de inventario y acciones de usuarios en el sistema"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin registros de auditoría."
                    columns={[
                        { key: 'fecha', header: 'Fecha y Hora', mono: true },
                        { key: 'usuario', header: 'Usuario' },
                        {
                            key: 'accion',
                            header: 'Acción',
                            mono: true,
                            cell: (r) => {
                                const accion = (r as { accion?: string }).accion;
                                return (
                                    <Badge tone={accion === 'CREATE' || accion === 'INSERT' ? 'ok' : 'violet'}>
                                        {accion}
                                    </Badge>
                                );
                            },
                        },
                        { key: 'tabla', header: 'Tabla Afectada', mono: true },
                        { key: 'detalle', header: 'Detalle de la Operación' },
                        { key: 'ip', header: 'Dirección IP', mono: true },
                    ]}
                    rows={logsMock.map((l) => ({
                        id: l.id,
                        fecha: l.fecha,
                        usuario: l.usuario,
                        accion: l.accion,
                        tabla: l.tabla,
                        detalle: l.detalle,
                        ip: l.ip,
                    }))}
                />
            </Card>
        </div>
    );
}
