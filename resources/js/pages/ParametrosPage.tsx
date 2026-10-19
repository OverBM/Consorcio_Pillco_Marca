// Parámetros y Constantes del Sistema.
// CRUD vía `useHttp` contra `/api/v1/parametros` y refresco con Inertia.
// El POST web `admin.parametros.update` se conserva para integraciones existentes.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { opcionesHttp } from '../utils/crud';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconPlus, IconSave, IconTrash } from '../components/icons';

type Categoria = 'ahp' | 'geo' | 'stock' | 'general';

interface ParametroDb {
    id: number | string;
    clave: string;
    valor: string;
    tipo?: string;
    descripcion?: string;
}

interface ParametroFila {
    dbId: number | string;
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

const TIPOS = [
    { value: 'texto', label: 'Texto' },
    { value: 'numero', label: 'Número' },
    { value: 'booleano', label: 'Booleano' },
    { value: 'json', label: 'JSON' },
];

const VACIO = { clave: '', valor: '', tipo: 'texto', descripcion: '' };

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
    if (
        clave.includes('stock') ||
        clave.includes('merma') ||
        clave.includes('inventario')
    ) {
        return 'stock';
    }
    return 'general';
}

export default function ParametrosPage({
    parametrosDb = [],
}: ParametrosPageProps) {
    const notify = useNotifications();

    const parametros: ParametroFila[] = useMemo(
        () =>
            parametrosDb.map((p, idx) => ({
                dbId: p.id ?? idx + 1,
                id: String(p.id ?? idx + 1),
                categoria: inferirCategoria(p.clave),
                clave: p.clave,
                valor: String(p.valor ?? ''),
                tipo: p.tipo ?? 'texto',
                descripcion:
                    p.descripcion ?? `Configuración del parámetro ${p.clave}`,
            })),
        [parametrosDb],
    );

    const [categoriaActiva, setCategoriaActiva] = useState<'todas' | Categoria>(
        'todas',
    );
    const [editando, setEditando] = useState<ParametroFila | null>(null);
    const [creando, setCreando] = useState(false);
    const [porEliminar, setPorEliminar] = useState<ParametroFila | null>(null);

    const form = useHttp<typeof VACIO>({ ...VACIO });
    const eliminar = useHttp({});

    const abrirCreacion = () => {
        form.setData({ ...VACIO });
        form.clearErrors();
        setCreando(true);
        setEditando(null);
    };

    const abrirEdicion = (param: ParametroFila) => {
        form.setData({
            clave: param.clave,
            valor: param.valor,
            tipo: param.tipo,
            descripcion: param.descripcion,
        });
        form.clearErrors();
        setEditando(param);
        setCreando(false);
    };

    const cerrarFormulario = () => {
        setCreando(false);
        setEditando(null);
    };

    const refrescar = () => refrescarProps('parametrosDb');

    const guardar = (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            clave: form.data.clave.trim(),
            valor: form.data.valor.trim(),
            tipo: form.data.tipo,
            descripcion: form.data.descripcion.trim() || null,
        };

        if (!payload.clave || payload.valor === '') {
            notify.error('Completa la clave y el valor del parámetro.');
            return;
        }

        form.transform(() => payload);

        const opciones = opcionesHttp(
            notify,
            editando
                ? `Parámetro "${payload.clave}" actualizado correctamente.`
                : `Parámetro "${payload.clave}" creado correctamente.`,
            'No se pudo guardar el parámetro.',
            cerrarFormulario,
            refrescar,
        );

        if (editando) {
            void form.put(`/api/v1/parametros/${editando.dbId}`, opciones);
        } else {
            void form.post('/api/v1/parametros', opciones);
        }
    };

    const confirmarEliminar = () => {
        if (!porEliminar) {
            return;
        }

        void eliminar.delete(
            `/api/v1/parametros/${porEliminar.dbId}`,
            opcionesHttp(
                notify,
                `Parámetro "${porEliminar.clave}" eliminado.`,
                'No se pudo eliminar el parámetro.',
                () => setPorEliminar(null),
                refrescar,
            ),
        );
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

            <div className="border-line flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setCategoriaActiva(tab.id)}
                            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                categoriaActiva === tab.id
                                    ? 'btn-primary shadow-sm'
                                    : 'bg-surface text-muted hover:text-ink hover:bg-soft border-line border'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <Button variant="mint" size="sm" onClick={abrirCreacion}>
                    <IconPlus size={14} />
                    Nuevo parámetro
                </Button>
            </div>

            <Card className="p-5">
                {parametrosFiltrados.length === 0 ? (
                    <EmptyState
                        title="Sin parámetros registrados"
                        hint="No hay parámetros para esta categoría."
                    />
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
                            {
                                key: 'clave',
                                header: 'Clave del Parámetro',
                                mono: true,
                                cell: (r) => (
                                    <span className="text-ink font-bold">
                                        {r.clave}
                                    </span>
                                ),
                            },
                            {
                                key: 'valor',
                                header: 'Valor Configurado',
                                align: 'center',
                                mono: true,
                                cell: (r) => (
                                    <span className="bg-soft border-line text-ink rounded border px-2.5 py-1 font-mono text-xs font-bold">
                                        {r.valor}
                                    </span>
                                ),
                            },
                            {
                                key: 'descripcion',
                                header: 'Descripción e Impacto',
                                cell: (r) => (
                                    <p className="text-ink text-xs leading-relaxed">
                                        {r.descripcion}
                                    </p>
                                ),
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (r) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => abrirEdicion(r)}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setPorEliminar(r)}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        rows={parametrosFiltrados}
                    />
                )}
            </Card>

            <Modal
                open={creando || Boolean(editando)}
                onClose={cerrarFormulario}
                title={
                    editando
                        ? 'Modificar Parámetro del Sistema'
                        : 'Nuevo Parámetro del Sistema'
                }
            >
                <form onSubmit={guardar} className="space-y-4">
                    <Field
                        label="Clave"
                        required
                        hint="Identificador único, por ejemplo geo.radio_busqueda_m"
                    >
                        <Input
                            value={form.data.clave}
                            onChange={(e) =>
                                form.setData('clave', e.target.value)
                            }
                            placeholder="modulo.clave"
                            disabled={Boolean(editando)}
                            required
                        />
                    </Field>

                    <Field label="Valor" required>
                        <Input
                            value={form.data.valor}
                            onChange={(e) =>
                                form.setData('valor', e.target.value)
                            }
                            placeholder="Ingrese el valor"
                            required
                        />
                    </Field>

                    <Field label="Tipo" required>
                        <Select
                            value={form.data.tipo}
                            onChange={(e) =>
                                form.setData('tipo', e.target.value)
                            }
                        >
                            {TIPOS.map((tipo) => (
                                <option key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field
                        label="Descripción"
                        hint="Impacto o uso del parámetro dentro del sistema"
                    >
                        <Input
                            value={form.data.descripcion}
                            onChange={(e) =>
                                form.setData('descripcion', e.target.value)
                            }
                            placeholder="Describe el parámetro"
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={cerrarFormulario}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="mint"
                            type="submit"
                            disabled={form.processing}
                        >
                            <IconSave size={14} />
                            {editando ? 'Guardar Cambios' : 'Crear Parámetro'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={Boolean(porEliminar)}
                onClose={() => setPorEliminar(null)}
                title="Eliminar Parámetro"
            >
                {porEliminar && (
                    <div className="space-y-4">
                        <p className="text-ink text-sm">
                            ¿Confirmas la eliminación del parámetro{' '}
                            <span className="font-mono font-bold">
                                {porEliminar.clave}
                            </span>
                            ? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => setPorEliminar(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                type="button"
                                onClick={confirmarEliminar}
                                disabled={eliminar.processing}
                            >
                                <IconTrash size={14} />
                                Eliminar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
