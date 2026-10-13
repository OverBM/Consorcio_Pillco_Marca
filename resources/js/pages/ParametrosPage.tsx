// Parámetros y Constantes del Sistema.
// Excepción documentada: escribe mediante el POST web `admin.parametros.update`
// con CSRF (no usa la API JSON) y refresca los props con Inertia.

import { useMemo, useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconSave } from '../components/icons';

type Categoria = 'ahp' | 'geo' | 'stock' | 'general';

interface ParametroDb {
    id: number | string;
    clave: string;
    valor: string;
    tipo?: string;
    descripcion?: string;
}

interface ParametroFila {
    id: string;
    categoria: Categoria;
    clave: string;
    valor: string;
    tipo: string;
    descripcion: string;
}

interface ParametrosPageProps {
    parametrosDb?: ParametroDb[];
}

const TABS: Array<{ id: 'todas' | Categoria; label: string }> = [
    { id: 'todas', label: 'Todos los Parámetros' },
    { id: 'ahp', label: 'Ranking / AHP' },
    { id: 'geo', label: 'Geolocalización & Rutas' },
    { id: 'stock', label: 'Control de Stock & Mermas' },
    { id: 'general', label: 'Institucional & PMU' },
];

function inferirCategoria(clave: string): Categoria {
    if (clave.includes('rank') || clave.includes('ahp')) {
        return 'ahp';
    }
    if (clave.includes('geo') || clave.includes('transferencia')) {
        return 'geo';
    }
    if (clave.includes('stock') || clave.includes('merma') || clave.includes('inventario')) {
        return 'stock';
    }
    return 'general';
}

export default function ParametrosPage({ parametrosDb = [] }: ParametrosPageProps) {
    const notify = useNotifications();

    const parametros: ParametroFila[] = useMemo(
        () =>
            parametrosDb.map((p, idx) => ({
                id: String(p.id ?? idx + 1),
                categoria: inferirCategoria(p.clave),
                clave: p.clave,
                valor: String(p.valor ?? ''),
                tipo: p.tipo ?? 'texto',
                descripcion: p.descripcion ?? `Configuración del parámetro ${p.clave}`,
            })),
        [parametrosDb],
    );

    const [categoriaActiva, setCategoriaActiva] = useState<'todas' | Categoria>('todas');
    const [editando, setEditando] = useState<ParametroFila | null>(null);

    const form = useForm<{ clave: string; valor: string }>({ clave: '', valor: '' });

    const abrirEdicion = (param: ParametroFila) => {
        form.setData({ clave: param.clave, valor: param.valor });
        setEditando(param);
    };

    const guardarEdicion = (event: FormEvent) => {
        event.preventDefault();
        if (!editando) {
            return;
        }

        form.post('/admin/parametros', {
            preserveScroll: true,
            onSuccess: () => {
                notify.success(`Parámetro "${form.data.clave}" actualizado correctamente.`);
                setEditando(null);
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo actualizar el parámetro.');
            },
        });
    };

    const parametrosFiltrados = parametros.filter(
        (p) => categoriaActiva === 'todas' || p.categoria === categoriaActiva,
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Parámetros y Constantes del Sistema"
                subtitle="Configuración técnica de algoritmos de optimización, matrices de distancias geodésicas y reglas de negocio"
            />

            <div className="flex flex-wrap gap-2 border-b border-line pb-3">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setCategoriaActiva(tab.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            categoriaActiva === tab.id
                                ? 'btn-primary shadow-sm'
                                : 'bg-surface text-muted hover:text-ink hover:bg-soft border border-line'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <Card className="p-5">
                {parametrosFiltrados.length === 0 ? (
                    <EmptyState title="Sin parámetros registrados" hint="No hay parámetros para esta categoría." />
                ) : (
                    <DataTable
                        emptyLabel="No hay parámetros registrados para esta categoría."
                        columns={[
                            {
                                key: 'categoria',
                                header: 'Categoría',
                                align: 'center',
                                cell: (r) => (
                                    <Badge
                                        tone={
                                            r.categoria === 'ahp'
                                                ? 'violet'
                                                : r.categoria === 'geo'
                                                  ? 'ok'
                                                  : r.categoria === 'stock'
                                                    ? 'warn'
                                                    : 'neutral'
                                        }
                                    >
                                        {r.categoria.toUpperCase()}
                                    </Badge>
                                ),
                            },
                            { key: 'clave', header: 'Clave del Parámetro', mono: true, cell: (r) => <span className="font-bold text-ink">{r.clave}</span> },
                            {
                                key: 'valor',
                                header: 'Valor Configurado',
                                align: 'center',
                                mono: true,
                                cell: (r) => (
                                    <span className="px-2.5 py-1 rounded bg-soft border border-line font-mono font-bold text-xs text-ink">
                                        {r.valor}
                                    </span>
                                ),
                            },
                            { key: 'descripcion', header: 'Descripción e Impacto', cell: (r) => <p className="text-xs text-ink leading-relaxed">{r.descripcion}</p> },
                            {
                                key: 'acciones',
                                header: 'Acción',
                                align: 'right',
                                cell: (r) => (
                                    <Button variant="secondary" size="sm" onClick={() => abrirEdicion(r)}>
                                        Editar
                                    </Button>
                                ),
                            },
                        ]}
                        rows={parametrosFiltrados}
                    />
                )}
            </Card>

            <Modal open={Boolean(editando)} onClose={() => setEditando(null)} title="Modificar Parámetro del Sistema">
                {editando && (
                    <form onSubmit={guardarEdicion} className="space-y-4">
                        <div className="bg-canvas p-3 rounded-lg border border-line text-xs space-y-2">
                            <div>
                                <span className="text-muted block font-mono">Clave:</span>
                                <span className="font-bold font-mono text-ink text-sm">{editando.clave}</span>
                            </div>
                            <div>
                                <span className="text-muted block">Descripción:</span>
                                <p className="text-ink">{editando.descripcion}</p>
                            </div>
                        </div>

                        <Field label="Nuevo Valor Configurado" required>
                            <Input
                                value={form.data.valor}
                                onChange={(e) => form.setData('valor', e.target.value)}
                                placeholder="Ingrese el nuevo valor"
                                required
                            />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" type="button" onClick={() => setEditando(null)}>
                                Cancelar
                            </Button>
                            <Button variant="mint" type="submit" disabled={form.processing}>
                                <IconSave size={14} />
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
