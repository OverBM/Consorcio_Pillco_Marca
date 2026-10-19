// Bitácora y Trazabilidad de Auditoría (solo lectura).
// Lista `auditoriaDb` (paginador del servidor) y filtra por usuario y módulo
// mediante la query string, preservando el estado de la página.

import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { Select } from '../components/form';
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

interface Paginador<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface ModuloOpcion {
    codigo: string;
    nombre: string;
}

interface UsuarioOpcion {
    id: string;
    nombre: string;
    email: string;
}

interface Filtros {
    usuario_id: string;
    modulo: string;
}

interface AuditoriaPageProps {
    auditoriaDb?: Paginador<AuditoriaDb>;
    usuariosDb?: UsuarioOpcion[];
    modulosDb?: ModuloOpcion[];
    filtros?: Filtros;
}

type AuditoriaFila = Omit<AuditoriaDb, 'id'> & { id: string };

const TONOS_CREACION = ['CREATE', 'INSERT', 'STORE', 'CREAR', 'crear'];

function resumirCambio(registro: Pick<AuditoriaDb, 'antes' | 'despues'>): string {
    const fuente = registro.despues ?? registro.antes;

    if (!fuente || Object.keys(fuente).length === 0) {
        return '—';
    }

    const detalle = JSON.stringify(fuente);
    return detalle.length > 140 ? `${detalle.slice(0, 137)}…` : detalle;
}

function TablaAuditoria({ registros }: { registros: AuditoriaDb[] }) {
    const filas: AuditoriaFila[] = useMemo(
        () =>
            registros.map((registro) => ({
                ...registro,
                id: String(registro.id),
                entidad: registro.entidad_id ? `${registro.entidad} #${registro.entidad_id}` : registro.entidad,
            })),
        [registros],
    );

    if (filas.length === 0) {
        return (
            <EmptyState title="Sin registros de auditoría" hint="Las acciones registradas por los usuarios aparecerán aquí." />
        );
    }

    return (
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
    );
}

export default function AuditoriaPage({
    auditoriaDb,
    usuariosDb = [],
    modulosDb = [],
    filtros,
}: AuditoriaPageProps) {
    const [usuarioId, setUsuarioId] = useState(filtros?.usuario_id ?? '');
    const [modulo, setModulo] = useState(filtros?.modulo ?? '');

    const registros = auditoriaDb?.data ?? [];
    const pagina = auditoriaDb?.current_page ?? 1;
    const ultimaPagina = auditoriaDb?.last_page ?? 1;
    const total = auditoriaDb?.total ?? registros.length;
    const hayFiltro = usuarioId !== '' || modulo !== '';

    const navegar = (params: { usuario_id?: string; modulo?: string; page?: number }) => {
        router.get(
            '/admin/auditoria',
            {
                usuario_id: params.usuario_id ?? usuarioId,
                modulo: params.modulo ?? modulo,
                page: params.page ?? 1,
            },
            { preserveState: true, preserveScroll: true, only: ['auditoriaDb'] },
        );
    };

    const limpiar = () => {
        setUsuarioId('');
        setModulo('');
        navegar({ usuario_id: '', modulo: '', page: 1 });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bitácora y Trazabilidad de Auditoría"
                subtitle="Registro inmutable de transacciones, mutaciones de inventario y acciones de usuarios en el sistema"
            />

            <Card className="p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <label className="w-full sm:w-64">
                        <span className="label">Usuario</span>
                        <Select
                            value={usuarioId}
                            onChange={(e) => {
                                setUsuarioId(e.target.value);
                                navegar({ usuario_id: e.target.value });
                            }}
                        >
                            <option value="">Todos los usuarios</option>
                            {usuariosDb.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.nombre}
                                </option>
                            ))}
                        </Select>
                    </label>

                    <label className="w-full sm:w-64">
                        <span className="label">Módulo</span>
                        <Select
                            value={modulo}
                            onChange={(e) => {
                                setModulo(e.target.value);
                                navegar({ modulo: e.target.value });
                            }}
                        >
                            <option value="">Todos los módulos</option>
                            {modulosDb.map((m) => (
                                <option key={m.codigo} value={m.codigo}>
                                    {m.nombre}
                                </option>
                            ))}
                        </Select>
                    </label>

                    {hayFiltro && (
                        <Button variant="outline" size="sm" onClick={limpiar}>
                            Limpiar filtros
                        </Button>
                    )}
                </div>
            </Card>

            <Card className="p-5">
                <TablaAuditoria registros={registros} />

                {ultimaPagina > 1 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <span className="text-xs text-muted">
                            Mostrando {auditoriaDb?.from ?? 0}–{auditoriaDb?.to ?? 0} de {total} registros
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagina <= 1}
                                onClick={() => navegar({ page: pagina - 1 })}
                            >
                                Anterior
                            </Button>
                            <span className="text-xs font-medium text-muted">
                                Página {pagina} de {ultimaPagina}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagina >= ultimaPagina}
                                onClick={() => navegar({ page: pagina + 1 })}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
