import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, Badge, Button, Modal } from '../components/ui';
import { Field, Input, Select, Textarea } from '../components/form';
import { DataTable } from '../components/DataTable';
import {
    IconAlert,
    IconCheckCircle,
    IconRefresh,
    IconSave,
    IconSettings,
    IconShield,
    IconTrendingUp,
} from '../components/icons';

interface Parametro {
    id: string;
    categoria: 'ahp' | 'geo' | 'stock' | 'general';
    clave: string;
    valor: string;
    tipo: 'numero' | 'texto' | 'porcentaje';
    descripcion: string;
}

interface ParametrosPageProps {
    parametrosDb?: Array<{
        id: number | string;
        clave: string;
        valor: string;
        tipo?: string;
        descripcion?: string;
    }>;
}

export default function ParametrosPage({ parametrosDb }: ParametrosPageProps) {
    const defaultParams: Parametro[] = [
        {
            id: '1',
            categoria: 'ahp',
            clave: 'ahp.peso_distancia',
            valor: '0.40',
            tipo: 'porcentaje',
            descripcion: 'Ponderación del factor de distancia geodésica en el ranking multicriterio AHP',
        },
        {
            id: '2',
            categoria: 'ahp',
            clave: 'ahp.peso_cobertura_stock',
            valor: '0.40',
            tipo: 'porcentaje',
            descripcion: 'Ponderación de cobertura y disponibilidad de stock en el almacén de despacho',
        },
        {
            id: '3',
            categoria: 'ahp',
            clave: 'ahp.peso_criticidad_obra',
            valor: '0.20',
            tipo: 'porcentaje',
            descripcion: 'Ponderación del nivel de urgencia o criticidad del frente de obra solicitante',
        },
        {
            id: '4',
            categoria: 'geo',
            clave: 'geo.radio_maximo_km',
            valor: '80',
            tipo: 'numero',
            descripcion: 'Radio máximo geodésico admisible para sugerir transferencias de redistribución (km)',
        },
        {
            id: '5',
            categoria: 'geo',
            clave: 'geo.factor_sinuosidad_mantaro',
            valor: '1.35',
            tipo: 'numero',
            descripcion: 'Factor de sinuosidad de carreteras en el Valle del Mantaro sobre distancia euclidiana',
        },
        {
            id: '6',
            categoria: 'geo',
            clave: 'geo.velocidad_promedio_kmh',
            valor: '35',
            tipo: 'numero',
            descripcion: 'Velocidad promedio estimada para camiones de carga pesada en rutas interurbanas (km/h)',
        },
        {
            id: '7',
            categoria: 'stock',
            clave: 'stock.umbral_alerta_minimo_pct',
            valor: '20',
            tipo: 'porcentaje',
            descripcion: 'Porcentaje respecto al stock de seguridad para disparar alerta amarilla de reposición',
        },
        {
            id: '8',
            categoria: 'stock',
            clave: 'stock.factor_merma_max_pct',
            valor: '3.5',
            tipo: 'porcentaje',
            descripcion: 'Porcentaje máximo admisible de merma operativa antes de generar investigación interna',
        },
        {
            id: '9',
            categoria: 'general',
            clave: 'pmu.nombre_consorcio',
            valor: 'Consorcio Pillco Marca',
            tipo: 'texto',
            descripcion: 'Razón social oficial del consorcio constructor en documentos y actas',
        },
        {
            id: '10',
            categoria: 'general',
            clave: 'pmu.ruc_oficial',
            valor: '20608920194',
            tipo: 'texto',
            descripcion: 'Número de Registro Único de Contribuyentes para emisión de órdenes y contratos',
        },
    ];

    const mappedDbParams: Parametro[] = (parametrosDb && parametrosDb.length > 0)
        ? parametrosDb.map((p, idx) => {
              let cat: 'ahp' | 'geo' | 'stock' | 'general' = 'general';
              if (p.clave.includes('ahp')) cat = 'ahp';
              else if (p.clave.includes('geo') || p.clave.includes('sinuosidad')) cat = 'geo';
              else if (p.clave.includes('stock') || p.clave.includes('merma')) cat = 'stock';

              return {
                  id: String(p.id ?? idx + 1),
                  categoria: cat,
                  clave: p.clave,
                  valor: String(p.valor),
                  tipo: (p.tipo === 'numero' ? 'numero' : p.tipo === 'porcentaje' ? 'porcentaje' : 'texto') as 'numero' | 'texto' | 'porcentaje',
                  descripcion: p.descripcion ?? `Configuración del parámetro ${p.clave}`,
              };
          })
        : defaultParams;

    const [parametros, setParametros] = useState<Parametro[]>(mappedDbParams);

    const [categoriaActiva, setCategoriaActiva] = useState<'todas' | 'ahp' | 'geo' | 'stock' | 'general'>('todas');
    const [editando, setEditando] = useState<Parametro | null>(null);
    const [nuevoValor, setNuevoValor] = useState<string>('');
    const [alertaGuardado, setAlertaGuardado] = useState<string | null>(null);

    const handleAbrirEdicion = (param: Parametro) => {
        setEditando(param);
        setNuevoValor(param.valor);
    };

    const handleGuardarEdicion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editando) return;

        setParametros((prev) =>
            prev.map((p) => (p.id === editando.id ? { ...p, valor: nuevoValor } : p))
        );
        setEditando(null);
        setAlertaGuardado(`Parámetro "${editando.clave}" actualizado correctamente.`);
        setTimeout(() => setAlertaGuardado(null), 4000);
    };

    const handleRestablecerDefecto = () => {
        setAlertaGuardado('Valores de fábrica restablecidos con éxito.');
        setTimeout(() => setAlertaGuardado(null), 4000);
    };

    const parametrosFiltrados = parametros.filter(
        (p) => categoriaActiva === 'todas' || p.categoria === categoriaActiva
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Parámetros y Constantes del Sistema"
                subtitle="Configuración técnica de algoritmos de optimización AHP, matrices de distancias geodésicas y reglas de negocio"
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleRestablecerDefecto}>
                            <IconRefresh size={14} />
                            Valores por Defecto
                        </Button>
                    </div>
                }
            />

            {alertaGuardado && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <IconCheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <span>{alertaGuardado}</span>
                </div>
            )}

            {/* Selector de Categorías */}
            <div className="flex flex-wrap gap-2 border-b border-line pb-3">
                {[
                    { id: 'todas', label: 'Todos los Parámetros' },
                    { id: 'ahp', label: 'Algoritmo Multicriterio AHP' },
                    { id: 'geo', label: 'Geolocalización & Rutas' },
                    { id: 'stock', label: 'Control de Stock & Mermas' },
                    { id: 'general', label: 'Institucional & PMU' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setCategoriaActiva(tab.id as any)}
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

            {/* Tabla de Parámetros */}
            <Card className="p-5">
                <DataTable<{ id: string }>
                    emptyLabel="No hay parámetros registrados para esta categoría."
                    columns={[
                        { key: 'categoria', header: 'Categoría', align: 'center' },
                        { key: 'clave', header: 'Clave del Parámetro', mono: true },
                        { key: 'valor', header: 'Valor Configurado', mono: true, align: 'center' },
                        { key: 'descripcion', header: 'Descripción e Impacto en Algoritmos' },
                        { key: 'acciones', header: 'Acción', align: 'right' },
                    ]}
                    rows={parametrosFiltrados.map((p) => {
                        const param = p;
                        return {
                            id: p.id,
                            categoria: (
                                <Badge
                                    tone={
                                        p.categoria === 'ahp'
                                            ? 'violet'
                                            : p.categoria === 'geo'
                                            ? 'ok'
                                            : p.categoria === 'stock'
                                            ? 'warn'
                                            : 'neutral'
                                    }
                                >
                                    {p.categoria.toUpperCase()}
                                </Badge>
                            ),
                            clave: <span className="font-bold text-ink">{p.clave}</span>,
                            valor: (
                                <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-800">
                                    {p.valor}
                                    {p.tipo === 'porcentaje' ? '%' : ''}
                                </span>
                            ),
                            descripcion: <p className="text-xs text-ink leading-relaxed">{p.descripcion}</p>,
                            acciones: (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleAbrirEdicion(param)}
                                >
                                    Editar
                                </Button>
                            ),
                        };
                    })}
                />
            </Card>

            {/* Modal de Edición de Parámetro */}
            <Modal
                open={Boolean(editando)}
                onClose={() => setEditando(null)}
                title="Modificar Parámetro del Sistema"
            >
                {editando && (
                    <form onSubmit={handleGuardarEdicion} className="space-y-4">
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

                        <Field label="Nuevo Valor Configurado">
                            <Input
                                value={nuevoValor}
                                onChange={(e) => setNuevoValor(e.target.value)}
                                placeholder="Ingrese el nuevo valor"
                                required
                            />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" type="button" onClick={() => setEditando(null)}>
                                Cancelar
                            </Button>
                            <Button variant="mint" type="submit">
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
