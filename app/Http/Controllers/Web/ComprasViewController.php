<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
use App\Models\Cotizacion;
use App\Models\DevolucionProveedor;
use App\Models\Material;
use App\Models\MaterialProveedor;
use App\Models\OrdenCompra;
use App\Models\Proveedor;
use App\Models\Recepcion;
use App\Models\Requerimiento;
use Inertia\Inertia;
use Inertia\Response;

class ComprasViewController extends Controller
{
    use FiltraContextoOperativo;

    public function index(): Response
    {
        $ordenes = $this->filtrarContexto(OrdenCompra::query(), 'obra_id', 'almacen_destino_id');

        $porEstado = (clone $ordenes)
            ->selectRaw('estado, COUNT(*) as ordenes, COALESCE(SUM(total), 0) as monto')
            ->groupBy('estado')
            ->orderByDesc('monto')
            ->get()
            ->map(fn ($fila): array => [
                'label' => ucfirst(str_replace('_', ' ', (string) $fila->estado)),
                'valor' => (int) $fila->ordenes,
                'detalle' => 'S/ '.number_format((float) $fila->monto, 0),
                'tono' => 'brand',
            ])
            ->values()
            ->all();

        $porProveedor = OrdenCompra::query()
            ->with('proveedor:id,razon_social')
            ->selectRaw('proveedor_id, COUNT(*) as ordenes, COALESCE(SUM(total), 0) as monto')
            ->groupBy('proveedor_id')
            ->orderByDesc('monto')
            ->limit(6)
            ->get()
            ->map(fn ($fila): array => [
                'label' => $fila->proveedor?->razon_social ?? 'Sin proveedor',
                'valor' => round((float) $fila->monto, 0),
                'detalle' => $fila->ordenes.' órdenes',
                'tono' => 'ok',
            ])
            ->values()
            ->all();

        return Inertia::render('ComprasPage', [
            'resumenCompras' => [
                'requerimientos' => Requerimiento::count(),
                'requerimientosPendientes' => Requerimiento::whereNotIn('estado', ['atendido', 'cerrado', 'rechazado'])->count(),
                'cotizaciones' => Cotizacion::count(),
                'ordenes' => OrdenCompra::count(),
                'montoOrdenes' => round((float) OrdenCompra::sum('total'), 2),
                'proveedores' => Proveedor::count(),
                'recepciones' => Recepcion::count(),
                'devoluciones' => DevolucionProveedor::count(),
            ],
            'ordenesPorEstado' => $porEstado,
            'comprasPorProveedor' => $porProveedor,
        ]);
    }

    public function requerimientos(): Response
    {
        $requerimientos = $this->filtrarContexto(Requerimiento::query())
            ->with(['obra', 'detalles.material'])
            ->get();

        return Inertia::render('RequerimientosPage', [
            'requerimientosDb' => $requerimientos,
        ]);
    }

    public function cotizaciones(): Response
    {
        $cotizaciones = $this->filtrarContextoVinculado(Cotizacion::query(), 'requerimiento')
            ->with(['requerimiento', 'proveedor', 'detalles.material'])
            ->get();

        $requerimientos = $this->filtrarContexto(Requerimiento::query())
            ->with(['obra', 'detalles.material'])
            ->get();

        $proveedores = Proveedor::orderBy('razon_social')->get();

        return Inertia::render('CotizacionesPage', [
            'cotizacionesDb' => $cotizaciones,
            'requerimientosDb' => $requerimientos,
            'proveedoresDb' => $proveedores,
        ]);
    }

    public function ordenesCompra(): Response
    {
        $ordenes = $this->filtrarContexto(OrdenCompra::query(), 'obra_id', 'almacen_destino_id')
            ->with(['proveedor', 'almacenDestino', 'detalles.material'])
            ->get();

        $cotizaciones = Cotizacion::where('estado', 'seleccionada')
            ->with(['proveedor', 'requerimiento.obra', 'detalles.material'])
            ->get();

        return Inertia::render('OrdenesCompraPage', [
            'ordenesDb' => $ordenes,
            'cotizacionesDb' => $cotizaciones,
        ]);
    }

    public function proveedores(): Response
    {
        $proveedores = Proveedor::all();

        return Inertia::render('ProveedoresPage', [
            'proveedoresDb' => $proveedores,
            'materialesDb' => Material::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'codigo', 'nombre']),
            'parametrosAbastecimientoDb' => MaterialProveedor::query()
                ->where('activo', true)
                ->get([
                    'id',
                    'material_id',
                    'proveedor_id',
                    'lead_time_dias',
                    'costo_pedido',
                    'precio_unitario',
                    'es_principal',
                ]),
        ]);
    }

    public function devoluciones(): Response
    {
        $devoluciones = DevolucionProveedor::with(['proveedor', 'recepcion.almacen', 'detalles.material'])->get();
        $recepciones = Recepcion::with(['almacen', 'ordenCompra.proveedor', 'detalles.material'])->get();

        return Inertia::render('DevolucionesPage', [
            'devolucionesDb' => $devoluciones,
            'recepcionesDb' => $recepciones,
        ]);
    }
}
