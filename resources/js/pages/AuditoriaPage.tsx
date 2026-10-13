// Bitácora y Trazabilidad de Auditoría (solo lectura).
// Lista `auditoriaDb` inyectado por el controlador web.

import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { formatFecha } from '../utils/format';

interface AuditoriaDb {
    id: number;
    accion: string;
    entidad: string;
    entidad_id: number | null;
    ip: string | null;
    antes: Record<string, unknown> | null;
    despues: Record<string, unknown> | null;
    created_at: string;
    usuario?: { name: string; email: string } | null;
}

interface AuditoriaPageProps {
    auditoriaDb?: AuditoriaDb[];
}

type AuditoriaFila = Omit<AuditoriaDb, 'id'> & { id: string };

const TONOS_CREACION = ['CREATE', 'INSERT', 'STORE', 'CREAR'];

function resumirCambio(registro: Pick<AuditoriaDb, 'antes' | 'despues'>): string {
    const fuente = registro.despues ?? registro.antes;

    if (!fuente || Object.keys(fuente).length === 0) {
        return '—';
    }

    const detalle = JSON.stringify(fuente);
    return detalle.length > 140 ? `${detalle.slice(0, 137)}…` : detalle;
}

export default function AuditoriaPage({ auditoriaDb = [] }: AuditoriaPageProps) {
    const filas: AuditoriaFila[] = useMemo(
        () =>
            auditoriaDb.map((registro) => ({
                ...registro,
                id: String(registro.id),
                entidad: registro.entidad_id ? `${registro.entidad} #${registro.entidad_id}` : registro.entidad,
            })),
        [auditoriaDb],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bitácora y Trazabilidad de Auditoría"
                subtitle="Registro inmutable de transacciones, mutaciones de inventario y acciones de usuarios en el sistema"
            />

            <Card className="p-5">
                {filas.length === 0 ? (
                    <EmptyState title="Sin registros de auditoría" hint="Las acciones registradas por los usuarios aparecerán aquí." />
                ) : (
                    <DataTable
                        emptyLabel="Sin registros de auditoría."
                        columns={[
                            { key: 'created_at', header: 'Fecha', mono: true, cell: (r) => formatFecha(r.created_at) },
                            { key: 'usuario', header: 'Usuario', cell: (r) => r.usuario?.email ?? r.usuario?.name ?? 'Sistema' },
                            {
                                key: 'accion',
                                header: 'Acción',
                                mono: true,
                                cell: (r) => (
                                    <Badge tone={TONOS_CREACION.includes(r.accion) ? 'ok' : 'violet'}>{r.accion}</Badge>
                                ),
                            },
                            { key: 'entidad', header: 'Entidad Afectada', mono: true },
                            { key: 'detalle', header: 'Detalle de la Operación', cell: (r) => resumirCambio(r) },
                            { key: 'ip', header: 'Dirección IP', mono: true, cell: (r) => r.ip ?? '—' },
                        ]}
                        rows={filas}
                    />
                )}
            </Card>
        </div>
    );
}
