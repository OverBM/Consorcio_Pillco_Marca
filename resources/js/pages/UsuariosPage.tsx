import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';

interface UsuariosPageProps {
    usuariosDb?: Array<{
        id: string;
        nombre: string;
        email: string;
        rol: string;
        obra: string;
        estado: string;
    }>;
}

export default function UsuariosPage({ usuariosDb }: UsuariosPageProps) {
    const defaultUsuarios = [
        { id: '1', nombre: 'Ing. Bradley Residente', email: 'residente@pillcomarca.pe', rol: 'Residente de Obra', obra: 'Todas las Obras', estado: 'activo' },
        { id: '2', nombre: 'Lic. María Logística', email: 'logistica@pillcomarca.pe', rol: 'Jefe de Logística / Compras', obra: 'Sede Central Huancayo', estado: 'activo' },
        { id: '3', nombre: 'Téc. Carlos Almacén', email: 'almacen@pillcomarca.pe', rol: 'Almacenero de Obra', obra: 'Almacén El Tambo', estado: 'activo' },
        { id: '4', nombre: 'Ing. Supervisor SST', email: 'sst@pillcomarca.pe', rol: 'Prevencionista SSOMA', obra: 'Todas las Obras', estado: 'activo' },
        { id: '5', nombre: 'Ing. Auditor Sistema', email: 'auditor@pillcomarca.pe', rol: 'Auditor del Sistema', obra: 'Consorcio Pillco Marca', estado: 'activo' },
    ];

    const listaUsuarios = usuariosDb && usuariosDb.length > 0 ? usuariosDb : defaultUsuarios;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Usuarios y Control de Acceso (RBAC)"
                subtitle="Gestión de credenciales, roles según carril Bizagi y asignación de alcance por obra o almacén"
            />

            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="Sin usuarios registrados."
                    columns={[
                        { key: 'nombre', header: 'Nombre y Apellidos' },
                        { key: 'email', header: 'Correo Corporativo', mono: true },
                        {
                            key: 'rol',
                            header: 'Rol Asignado',
                            cell: (r) => {
                                const rol = (r as { rol?: string }).rol;
                                return <Badge tone="violet">{rol}</Badge>;
                            },
                        },
                        { key: 'obra', header: 'Alcance Asignado' },
                        {
                            key: 'estado',
                            header: 'Estado',
                            cell: (r) => {
                                const estado = (r as { estado?: string }).estado;
                                return (
                                    <Badge tone={estado === 'activo' ? 'ok' : 'danger'}>
                                        {estado === 'activo' ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                );
                            },
                        },
                    ]}
                    rows={listaUsuarios.map((u) => ({
                        id: u.id,
                        nombre: u.nombre,
                        email: u.email,
                        rol: u.rol,
                        obra: u.obra,
                        estado: u.estado,
                    }))}
                />
            </Card>
        </div>
    );
}
