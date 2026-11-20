// Módulo de reportes funcionales: indicadores de negocio, series, filtros y
// exportación. Todos los valores provienen de `reportes` calculado en backend
// a partir de stock, kardex, mermas, transferencias y órdenes de compra.

import { useMemo, useState, type FormEvent } from 'react';
import { router } from '@inertiajs/react';
import { PageShell, KpiRow, DataSection } from '../design-system/PageShell';
import { KpiTile } from '../design-system/KpiTile';
import { MiniBarChart } from '../design-system/MiniBarChart';
import { TendenciasChart } from '../design-system/TendenciasChart';
import { DataTable } from '../components/DataTable';
import { Button, Card } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import {
    IconAlertTriangle,
    IconBoxes,
    IconDollar,
    IconFileText,
    IconRefresh,
    IconSearch,
    IconTrendingUp,
} from '../components/icons';
import { useNotifications } from '../components/notifications/NotificationProvider';
import { toCsv, downloadCsv } from '../utils/csv';
import { formatMoneda, formatNum } from '../utils/format';

interface Indicadores {
    valor_inventario: number;
    stock_critico: number;
    skus: number;
    unidades: number;
    mermas_registros: number;
    mermas_cantidad: number;
    mermas_valor: number;
    ingresos: number;
    salidas: number;
    movimientos: number;
    rotacion: number | null;
    cumplimiento: number | null;
    transferencias: number;
    compras: number;
    obras_activas: number;
    avance_promedio: number | null;
}

interface PuntoSerie {
    fecha: string;
    etiqueta: string;
    ingreso: number;
    salida: number;
}

interface CategoriaReporte {
    categoria: string;
    valor: number;
    skus: number;
}

interface MaterialReporte {
    id: string;
    material: string;
    codigo: string;
    almacen: string;
    movimientos: number;
    salidas: number;
    stock: number;
    valor: number;
}

interface ReportesDb {
    filtros: {
        desde: string;
        hasta: string;
        obra_id: number | null;
        almacen_id: number | null;
        categoria_id: number | null;
    };
    indicadores: Indicadores;
    serie: PuntoSerie[];
    categorias: CategoriaReporte[];
    materiales: MaterialReporte[];
    generado_en: string;
}

interface Opcion {
    id: number;
    nombre: string;
    codigo?: string | null;
    obra_id?: number | null;
}

interface ReportesPageProps {
    reportes: ReportesDb;
    filtros: ReportesDb['filtros'];
    catalogos: {
        obras: Opcion[];
        almacenes: Opcion[];
        categorias: { id: number; nombre: string }[];
    };
}

interface FormularioFiltros {
    desde: string;
    hasta: string;
    obra_id: string;
    almacen_id: string;
    categoria_id: string;
    [key: string]: string;
}

function aFormulario(filtros: ReportesDb['filtros']): FormularioFiltros {
    return {
        desde: filtros.desde,
        hasta: filtros.hasta,
        obra_id: filtros.obra_id ? String(filtros.obra_id) : '',
        almacen_id: filtros.almacen_id ? String(filtros.almacen_id) : '',
        categoria_id: filtros.categoria_id ? String(filtros.categoria_id) : '',
    };
}

export default function ReportesPage({
    reportes,
    filtros,
    catalogos,
}: ReportesPageProps) {
    const notify = useNotifications();
    const [formulario, setFormulario] = useState(() => aFormulario(filtros));
    const indicadores = reportes.indicadores;

    const almacenesVisibles = useMemo(
        () =>
            catalogos.almacenes.filter(
                (almacen) =>
                    !formulario.obra_id ||
                    String(almacen.obra_id) === formulario.obra_id,
            ),
        [catalogos.almacenes, formulario.obra_id],
    );

    const filas = useMemo(
        () =>
            reportes.materiales.map((material) => ({
                ...material,
                id: material.id,
            })),
        [reportes.materiales],
    );

    const aplicar = (evento: FormEvent): void => {
        evento.preventDefault();

        if (formulario.desde > formulario.hasta) {
            notify.error('La fecha inicial no puede ser mayor que la final.');
            return;
        }

        router.get('/reportes', formulario, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const limpiar = (): void => {
        setFormulario({ ...aFormulario(filtros), desde: '', hasta: '' });
        router.get(
            '/reportes',
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const exportar = (): void => {
        if (filas.length === 0) {
            notify.info('No hay filas para exportar con los filtros actuales.');
            return;
        }

        const contenido = toCsv(
            filas.map((fila) => ({
                material: fila.material,
                codigo: fila.codigo,
                almacen: fila.almacen,
                movimientos: fila.movimientos,
                salidas: fila.salidas,
                stock_actual: fila.stock,
            })),
        );

        downloadCsv(
            `reporte-materiales-${reportes.filtros.desde}-${reportes.filtros.hasta}.csv`,
            contenido,
        );
        notify.success('Reporte exportado en CSV.');
    };

    return (
        <PageShell
            title="Reportes e Indicadores"
            subtitle="Impacto del software en inventarios multi-almacén: stock, mermas, rotación y cumplimiento con datos reales"
            breadcrumb={['Panel', 'Reportes']}
            actions={
                <Button variant="mint" onClick={exportar}>
                    <IconFileText size={16} />
                    Exportar CSV
                </Button>
            }
        >
            <Card className="p-4">
                <form
                    onSubmit={aplicar}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
                    aria-label="Filtros de reportes"
                >
                    <Field label="Desde">
                        <Input
                            type="date"
                            value={formulario.desde}
                            onChange={(e) =>
                                setFormulario({
                                    ...formulario,
                                    desde: e.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Hasta">
                        <Input
                            type="date"
                            value={formulario.hasta}
                            onChange={(e) =>
                                setFormulario({
                                    ...formulario,
                                    hasta: e.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Obra">
                        <Select
                            value={formulario.obra_id}
                            onChange={(e) =>
                                setFormulario({
                                    ...formulario,
                                    obra_id: e.target.value,
                                    almacen_id: '',
                                })
                            }
                        >
                            <option value="">Todas las obras</option>
                            {catalogos.obras.map((obra) => (
                                <option key={obra.id} value={obra.id}>
                                    {obra.codigo} — {obra.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Almacén">
                        <Select
                            value={formulario.almacen_id}
                            onChange={(e) =>
                                setFormulario({
                                    ...formulario,
                                    almacen_id: e.target.value,
                                })
                            }
                        >
                            <option value="">Todos los almacenes</option>
                            {almacenesVisibles.map((almacen) => (
                                <option key={almacen.id} value={almacen.id}>
                                    {almacen.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Categoría">
                        <Select
                            value={formulario.categoria_id}
                            onChange={(e) =>
                                setFormulario({
                                    ...formulario,
                                    categoria_id: e.target.value,
                                })
                            }
                        >
                            <option value="">Todas las categorías</option>
                            {catalogos.categorias.map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>
                                    {categoria.nombre}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="flex items-end gap-2">
                        <Button type="submit" variant="primary">
                            <IconSearch size={15} />
                            Aplicar
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={limpiar}
                        >
                            <IconRefresh size={15} />
                            Limpiar
                        </Button>
                    </div>
                </form>
            </Card>

            <KpiRow>
                <KpiTile
                    label="Valor del inventario"
                    value={indicadores.valor_inventario}
                    formato="moneda"
                    detalle={`${formatNum(indicadores.skus)} SKUs · ${formatNum(indicadores.unidades)} unidades`}
                    icon={<IconDollar size={18} />}
                    variante="dark"
                />
                <KpiTile
                    label="Stock crítico"
                    value={indicadores.stock_critico}
                    formato="numero"
                    detalle="SKUs por debajo del mínimo"
                    icon={<IconAlertTriangle size={18} />}
                    progresoTono="danger"
                />
                <KpiTile
                    label="Mermas del período"
                    value={indicadores.mermas_cantidad}
                    formato="numero"
                    detalle={`${indicadores.mermas_registros} registros · ${formatMoneda(indicadores.mermas_valor)}`}
                    icon={<IconTrendingUp size={18} />}
                    variante="brand"
                />
                <KpiTile
                    label="Cumplimiento de transferencias"
                    value={indicadores.cumplimiento}
                    formato="porcentaje"
                    detalle={`${indicadores.transferencias} transferencias en el período`}
                    icon={<IconBoxes size={18} />}
                    progreso={indicadores.cumplimiento}
                    progresoTono={
                        (indicadores.cumplimiento ?? 0) >= 90
                            ? 'ok'
                            : (indicadores.cumplimiento ?? 0) >= 70
                              ? 'warn'
                              : 'danger'
                    }
                />
            </KpiRow>

            <section className="grid grid-cols-1 gap-[var(--gap)] lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <DataSection
                        title="Movimientos por día"
                        subtitle={`Ingresos y salidas de kardex · ${reportes.filtros.desde} a ${reportes.filtros.hasta}`}
                        vacio={reportes.serie.length === 0}
                        mensajeVacio="Sin movimientos en el rango seleccionado."
                    >
                        <TendenciasChart serie={reportes.serie} />
                    </DataSection>
                </div>
                <div className="lg:col-span-4">
                    <MiniBarChart
                        titulo="Valor por categoría"
                        subtitulo="Distribución del inventario filtrado"
                        items={reportes.categorias.map((categoria) => ({
                            label: categoria.categoria,
                            valor: categoria.valor,
                            detalle: `${categoria.skus} SKUs`,
                        }))}
                        prefijo="S/ "
                        vacio="Sin stock para las categorías filtradas."
                    />
                </div>
            </section>

            <DataSection
                title="Materiales con mayor movimiento"
                subtitle="Top 10 por movimientos absolutos en el período"
                vacio={filas.length === 0}
                mensajeVacio="No hay movimientos de materiales para los filtros."
            >
                <DataTable
                    rows={filas}
                    emptyLabel="Sin materiales para mostrar."
                    columns={[
                        {
                            key: 'material',
                            header: 'Material',
                            cell: (fila) => (
                                <span className="block">
                                    <span className="text-ink block font-semibold">
                                        {fila.material}
                                    </span>
                                    <span className="text-muted block font-mono text-xs">
                                        {fila.codigo}
                                    </span>
                                </span>
                            ),
                        },
                        { key: 'almacen', header: 'Almacén' },
                        {
                            key: 'movimientos',
                            header: 'Movimientos',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'salidas',
                            header: 'Salidas',
                            align: 'right',
                            mono: true,
                        },
                        {
                            key: 'stock',
                            header: 'Stock actual',
                            align: 'right',
                            mono: true,
                        },
                    ]}
                />
            </DataSection>

            <section className="grid grid-cols-1 gap-[var(--gap)] lg:grid-cols-3">
                <Card title="Rotación estimada" className="p-4">
                    <p className="font-display text-ink text-3xl font-bold">
                        {indicadores.rotacion ?? '—'}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                        Salidas sobre existencias en el período. Valores mayores
                        a 1 indican mayor dinamismo.
                    </p>
                </Card>
                <Card title="Compras del período" className="p-4">
                    <p className="font-display text-ink text-3xl font-bold">
                        {formatMoneda(indicadores.compras)}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                        Órdenes de compra registradas para la obra o almacén
                        filtrado.
                    </p>
                </Card>
                <Card title="Avance de obras" className="p-4">
                    <p className="font-display text-ink text-3xl font-bold">
                        {indicadores.avance_promedio ?? '—'}%
                    </p>
                    <p className="text-muted mt-1 text-xs">
                        {indicadores.obras_activas} obras activas en el ámbito
                        consultado.
                    </p>
                </Card>
            </section>

            <DataSection
                title="Impacto funcional"
                subtitle="Cómo estos indicadores sustentan la toma de decisiones"
            >
                <div className="text-ink grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div className="space-y-2">
                        <p>
                            <strong>Problema:</strong> el consorcio gestiona
                            inventarios en varios almacenes de obra y necesita
                            reducir quiebres, compras urgentes y pérdidas por
                            merma.
                        </p>
                        <p>
                            <strong>Información visible:</strong> valor del
                            inventario, SKUs críticos, mermas, cumplimiento de
                            transferencias, compras y avance de obras, con
                            filtros por fecha, obra, almacén y categoría.
                        </p>
                        <p>
                            <strong>Indicadores de resultado:</strong> stock
                            crítico, rotación, mermas y cumplimiento permiten
                            evaluar si el proceso logístico mejora.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p>
                            <strong>Decisiones:</strong> priorizar
                            redistribuciones, compras y conteos físicos donde el
                            stock crítico o la merma son mayores.
                        </p>
                        <p>
                            <strong>Optimización:</strong> reducir traslados
                            innecesarios, detectar materiales de baja rotación y
                            focalizar auditorías de inventario.
                        </p>
                        <p className="text-muted text-xs">
                            Datos generados el {reportes.generado_en} desde los
                            registros almacenados en el sistema. Si no existe
                            historial suficiente, los beneficios son potenciales
                            y se identifican como tales.
                        </p>
                    </div>
                </div>
            </DataSection>
        </PageShell>
    );
}
