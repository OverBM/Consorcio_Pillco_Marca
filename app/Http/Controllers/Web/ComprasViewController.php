<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
use App\Models\Cotizacion;
use App\Models\DevolucionProveedor;
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
        return Inertia::render('ComprasPage');
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
