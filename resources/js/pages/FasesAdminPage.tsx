// Administración del catálogo de requisitos y criterios de aprobación por fase.
// CRUD vía `useHttp` contra `/api/v1/admin/fases` y refresco con Inertia.

import { useMemo, useState, type FormEvent } from 'react';
import { useHttp } from '@inertiajs/react';
import { refrescarProps } from '../utils/refrescar';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, TextArea } from '../components/form';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { IconPlus, IconSave, IconTrash } from '../components/icons';
import { FASES_CICLO_VIDA, nombreFase } from '../utils/cicloVida';

interface FaseCatalogo {
    codigo: string;
    nombre: string;
    responsable: string;
    orden: number;
}

interface RequisitoDb {
    id: number;
    fase: string;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    orden: number;
    activo: boolean;
}

interface CriterioDb {
    id: number;
    fase: string;
    codigo: string;
    nombre: string;
    tipo: string;
    parametros?: Record<string, unknown> | null;
    umbral?: number | string | null;
    obligatorio: boolean;
    orden: number;
    activo: boolean;
}

type RequisitoFila = Omit<RequisitoDb, 'id'> & { id: string; dbId: number };

type CriterioFila = Omit<CriterioDb, 'id'> & { id: string; dbId: number };

interface FasesAdminPageProps {
    fasesCatalogo?: FaseCatalogo[];
    requisitosDb?: RequisitoDb[];
    criteriosDb?: CriterioDb[];
    tiposCriterioDb?: string[];
}

const REQ_VACIO = { fase: '', codigo: '', nombre: '', descripcion: '', orden: 0, activo: true };
const CRIT_VACIO = {
    fase: '',
    codigo: '',
    nombre: '',
    tipo: '',
    parametros: '{}',
    umbral: '',
    obligatorio: true,
    orden: 0,
    activo: true,
};

export default function FasesAdminPage({
    fasesCatalogo = FASES_CICLO_VIDA.map((f) => ({ ...f })),
    requisitosDb = [],
    criteriosDb = [],
    tiposCriterioDb = [],
}: FasesAdminPageProps) {
    const notify = useNotifications();
    const [faseActiva, setFaseActiva] = useState<string>(fasesCatalogo[0]?.codigo ?? 'inicio');

    const [reqModal, setReqModal] = useState(false);
    const [reqEditando, setReqEditando] = useState<RequisitoFila | null>(null);
    const [reqEliminar, setReqEliminar] = useState<RequisitoFila | null>(null);

    const [critModal, setCritModal] = useState(false);
    const [critEditando, setCritEditando] = useState<CriterioFila | null>(null);
    const [critEliminar, setCritEliminar] = useState<CriterioFila | null>(null);

    const reqForm = useHttp<typeof REQ_VACIO>({ ...REQ_VACIO });
    const critForm = useHttp<typeof CRIT_VACIO>({ ...CRIT_VACIO });
    const eliminar = useHttp({});

    const refrescar = () => refrescarProps('requisitosDb', 'criteriosDb');

    const requisitosFase = useMemo<RequisitoFila[]>(
        () => requisitosDb.filter((r) => r.fase === faseActiva).map((r) => ({ ...r, id: String(r.id), dbId: r.id })),
        [requisitosDb, faseActiva],
    );
    const criteriosFase = useMemo<CriterioFila[]>(
        () => criteriosDb.filter((c) => c.fase === faseActiva).map((c) => ({ ...c, id: String(c.id), dbId: c.id })),
        [criteriosDb, faseActiva],
    );

    const abrirNuevoRequisito = () => {
        reqForm.setData({ ...REQ_VACIO, fase: faseActiva });
        reqForm.clearErrors();
        setReqEditando(null);
        setReqModal(true);
    };

    const abrirEditarRequisito = (r: RequisitoFila) => {
        reqForm.setData({
            fase: r.fase,
            codigo: r.codigo,
            nombre: r.nombre,
            descripcion: r.descripcion ?? '',
            orden: r.orden,
            activo: r.activo,
        });
        reqForm.clearErrors();
        setReqEditando(r);
        setReqModal(true);
    };

    const guardarRequisito = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            fase: reqForm.data.fase,
            codigo: reqForm.data.codigo.trim(),
            nombre: reqForm.data.nombre.trim(),
            descripcion: reqForm.data.descripcion.trim() || null,
            orden: Number(reqForm.data.orden) || 0,
            activo: reqForm.data.activo,
        };
        if (!payload.codigo || !payload.nombre) {
            notify.error('Completa el código y el nombre del requisito.');
            return;
        }
        reqForm.transform(() => payload);
        const opciones = {
            onSuccess: () => {
                notify.success(reqEditando ? 'Requisito actualizado.' : 'Requisito creado.');
                setReqModal(false);
                refrescar();
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo guardar el requisito.');
            },
        };
        if (reqEditando) {
            void reqForm.put(`/api/v1/admin/fases/requisitos/${reqEditando.dbId}`, opciones);
        } else {
            void reqForm.post('/api/v1/admin/fases/requisitos', opciones);
        }
    };

    const abrirNuevoCriterio = () => {
        critForm.setData({ ...CRIT_VACIO, fase: faseActiva, tipo: tiposCriterioDb[0] ?? '' });
        critForm.clearErrors();
        setCritEditando(null);
        setCritModal(true);
    };

    const abrirEditarCriterio = (c: CriterioFila) => {
        critForm.setData({
            fase: c.fase,
            codigo: c.codigo,
            nombre: c.nombre,
            tipo: c.tipo,
            parametros: JSON.stringify(c.parametros ?? {}, null, 0),
            umbral: c.umbral === null || c.umbral === undefined ? '' : String(c.umbral),
            obligatorio: c.obligatorio,
            orden: c.orden,
            activo: c.activo,
        });
        critForm.clearErrors();
        setCritEditando(c);
        setCritModal(true);
    };

    const guardarCriterio = (event: FormEvent) => {
        event.preventDefault();

        let parametros: Record<string, unknown> | null = null;
        const raw = critForm.data.parametros.trim();
        if (raw !== '') {
            try {
                parametros = JSON.parse(raw) as Record<string, unknown>;
            } catch {
                notify.error('Los parámetros deben ser un JSON válido.');
                return;
            }
        }

        const payload = {
            fase: critForm.data.fase,
            codigo: critForm.data.codigo.trim(),
            nombre: critForm.data.nombre.trim(),
            tipo: critForm.data.tipo,
            parametros,
            umbral: critForm.data.umbral === '' ? null : Number(critForm.data.umbral),
            obligatorio: critForm.data.obligatorio,
            orden: Number(critForm.data.orden) || 0,
            activo: critForm.data.activo,
        };
        if (!payload.codigo || !payload.nombre || !payload.tipo) {
            notify.error('Completa el código, nombre y tipo del criterio.');
            return;
        }
        critForm.transform(() => payload);
        const opciones = {
            onSuccess: () => {
                notify.success(critEditando ? 'Criterio actualizado.' : 'Criterio creado.');
                setCritModal(false);
                refrescar();
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo guardar el criterio.');
            },
        };
        if (critEditando) {
            void critForm.put(`/api/v1/admin/fases/criterios/${critEditando.dbId}`, opciones);
        } else {
            void critForm.post('/api/v1/admin/fases/criterios', opciones);
        }
    };

    const confirmarEliminar = () => {
        const ruta = reqEliminar
            ? `/api/v1/admin/fases/requisitos/${reqEliminar.dbId}`
            : critEliminar
              ? `/api/v1/admin/fases/criterios/${critEliminar.dbId}`
              : null;
        if (!ruta) {
            return;
        }
        void eliminar.delete(ruta, {
            onSuccess: () => {
                notify.success('Registro eliminado.');
                setReqEliminar(null);
                setCritEliminar(null);
                refrescar();
            },
            onError: (errors: Record<string, string>) => {
                notify.error(Object.values(errors).flat().join(' ') || 'No se pudo eliminar el registro.');
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Requisitos y Criterios por Fase"
                subtitle="Catálogo administrable que define las condiciones verificables para aprobar cada fase del ciclo de vida"
            />

            <div className="flex flex-wrap gap-2 border-b border-line pb-3">
                {fasesCatalogo.map((fase) => (
                    <button
                        key={fase.codigo}
                        onClick={() => setFaseActiva(fase.codigo)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            faseActiva === fase.codigo
                                ? 'btn-primary shadow-sm'
                                : 'bg-surface text-muted hover:text-ink hover:bg-soft border border-line'
                        }`}
                    >
                        {fase.orden.toString().padStart(2, '0')} · {fase.nombre}
                    </button>
                ))}
            </div>

            <Card
                title={`Requisitos de ${nombreFase(faseActiva)}`}
                className="p-5"
                action={
                    <Button variant="mint" size="sm" onClick={abrirNuevoRequisito}>
                        <IconPlus size={14} /> Nuevo requisito
                    </Button>
                }
            >
                {requisitosFase.length === 0 ? (
                    <EmptyState title="Sin requisitos" hint="Agrega los entregables exigidos para esta fase." />
                ) : (
                    <DataTable
                        emptyLabel="Sin requisitos."
                        columns={[
                            { key: 'codigo', header: 'Código', mono: true, cell: (r) => <span className="font-bold text-ink">{r.codigo}</span> },
                            { key: 'nombre', header: 'Requisito', cell: (r) => r.nombre },
                            { key: 'descripcion', header: 'Descripción', cell: (r) => <span className="text-xs text-muted">{r.descripcion ?? '—'}</span> },
                            { key: 'orden', header: 'Orden', align: 'center', mono: true, cell: (r) => r.orden },
                            {
                                key: 'activo',
                                header: 'Estado',
                                align: 'center',
                                cell: (r) => <Badge tone={r.activo ? 'ok' : 'neutral'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>,
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (r) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => abrirEditarRequisito(r)}>
                                            Editar
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => setReqEliminar(r)}>
                                            Eliminar
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        rows={requisitosFase}
                    />
                )}
            </Card>

            <Card
                title={`Criterios de aprobación de ${nombreFase(faseActiva)}`}
                className="p-5"
                action={
                    <Button variant="mint" size="sm" onClick={abrirNuevoCriterio}>
                        <IconPlus size={14} /> Nuevo criterio
                    </Button>
                }
            >
                {criteriosFase.length === 0 ? (
                    <EmptyState title="Sin criterios" hint="Define las verificaciones necesarias para aprobar esta fase." />
                ) : (
                    <DataTable
                        emptyLabel="Sin criterios."
                        columns={[
                            { key: 'codigo', header: 'Código', mono: true, cell: (c) => <span className="font-bold text-ink">{c.codigo}</span> },
                            { key: 'nombre', header: 'Criterio', cell: (c) => c.nombre },
                            { key: 'tipo', header: 'Tipo verificación', mono: true, cell: (c) => <Badge tone="violet">{c.tipo}</Badge> },
                            { key: 'umbral', header: 'Umbral', align: 'center', mono: true, cell: (c) => (c.umbral === null || c.umbral === undefined ? '—' : String(c.umbral)) },
                            {
                                key: 'obligatorio',
                                header: 'Obligatorio',
                                align: 'center',
                                cell: (c) => <Badge tone={c.obligatorio ? 'warn' : 'neutral'}>{c.obligatorio ? 'Sí' : 'No'}</Badge>,
                            },
                            {
                                key: 'activo',
                                header: 'Estado',
                                align: 'center',
                                cell: (c) => <Badge tone={c.activo ? 'ok' : 'neutral'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>,
                            },
                            {
                                key: 'acciones',
                                header: 'Acciones',
                                align: 'right',
                                cell: (c) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => abrirEditarCriterio(c)}>
                                            Editar
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => setCritEliminar(c)}>
                                            Eliminar
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        rows={criteriosFase}
                    />
                )}
            </Card>

            <Modal open={reqModal} onClose={() => setReqModal(false)} title={reqEditando ? 'Editar requisito' : 'Nuevo requisito'}>
                <form onSubmit={guardarRequisito} className="space-y-4">
                    <Field label="Código" required hint="Identificador único dentro de la fase">
                        <Input value={reqForm.data.codigo} onChange={(e) => reqForm.setData('codigo', e.target.value)} required />
                    </Field>
                    <Field label="Nombre" required>
                        <Input value={reqForm.data.nombre} onChange={(e) => reqForm.setData('nombre', e.target.value)} required />
                    </Field>
                    <Field label="Descripción">
                        <TextArea rows={2} value={reqForm.data.descripcion} onChange={(e) => reqForm.setData('descripcion', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Orden">
                            <Input type="number" value={reqForm.data.orden} onChange={(e) => reqForm.setData('orden', Number(e.target.value))} />
                        </Field>
                        <Field label="Activo">
                            <Select value={reqForm.data.activo ? '1' : '0'} onChange={(e) => reqForm.setData('activo', e.target.value === '1')}>
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </Select>
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setReqModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit" disabled={reqForm.processing}>
                            <IconSave size={14} /> Guardar
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={critModal} onClose={() => setCritModal(false)} title={critEditando ? 'Editar criterio' : 'Nuevo criterio'} wide>
                <form onSubmit={guardarCriterio} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Código" required>
                            <Input value={critForm.data.codigo} onChange={(e) => critForm.setData('codigo', e.target.value)} required />
                        </Field>
                        <Field label="Nombre" required>
                            <Input value={critForm.data.nombre} onChange={(e) => critForm.setData('nombre', e.target.value)} required />
                        </Field>
                    </div>
                    <Field label="Tipo de verificación" required hint="Debe ser uno de los tipos soportados por el sistema">
                        <Select value={critForm.data.tipo} onChange={(e) => critForm.setData('tipo', e.target.value)} required>
                            {tiposCriterioDb.map((tipo) => (
                                <option key={tipo} value={tipo}>
                                    {tipo}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Parámetros (JSON)" hint='Por ejemplo {"tipo_documento":"informe"} o {"metrica":"avance_fisico_pct","operador":">=","valor":100}'>
                        <TextArea rows={3} value={critForm.data.parametros} onChange={(e) => critForm.setData('parametros', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Umbral">
                            <Input value={critForm.data.umbral} onChange={(e) => critForm.setData('umbral', e.target.value)} placeholder="Ej. 100" />
                        </Field>
                        <Field label="Obligatorio">
                            <Select
                                value={critForm.data.obligatorio ? '1' : '0'}
                                onChange={(e) => critForm.setData('obligatorio', e.target.value === '1')}
                            >
                                <option value="1">Sí</option>
                                <option value="0">No</option>
                            </Select>
                        </Field>
                        <Field label="Orden">
                            <Input type="number" value={critForm.data.orden} onChange={(e) => critForm.setData('orden', Number(e.target.value))} />
                        </Field>
                    </div>
                    <Field label="Activo">
                        <Select value={critForm.data.activo ? '1' : '0'} onChange={(e) => critForm.setData('activo', e.target.value === '1')}>
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </Select>
                    </Field>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setCritModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="mint" type="submit" disabled={critForm.processing}>
                            <IconSave size={14} /> Guardar
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={Boolean(reqEliminar || critEliminar)} onClose={() => { setReqEliminar(null); setCritEliminar(null); }} title="Eliminar registro">
                <div className="space-y-4">
                    <p className="text-sm text-ink">¿Confirmas la eliminación de este registro? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" type="button" onClick={() => { setReqEliminar(null); setCritEliminar(null); }}>
                            Cancelar
                        </Button>
                        <Button variant="danger" type="button" onClick={confirmarEliminar} disabled={eliminar.processing}>
                            <IconTrash size={14} /> Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
