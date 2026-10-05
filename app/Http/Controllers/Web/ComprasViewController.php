<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\DevolucionProveedor;
use App\Models\OrdenCompra;
use App\Models\Proveedor;
use App\Models\Requerimiento;
use Inertia\Inertia;
use Inertia\Response;

class ComprasViewController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('ComprasPage');
    }

    public function requerimientos(): Response
    {
        $requerimientos = Requerimiento::with(['obra', 'detalles.material'])->get();

        return Inertia::render('RequerimientosPage', [
            'requerimientosDb' => $requerimientos,
        ]);
    }

    public function cotizaciones(): Response
    {
        $cotizaciones = Cotizacion::with(['requerimiento', 'proveedor', 'detalles'])->get();

        return Inertia::render('CotizacionesPage', [
            'cotizacionesDb' => $cotizaciones,
        ]);
    }

    public function ordenesCompra(): Response
    {
        $ordenes = OrdenCompra::with(['requerimiento', 'proveedor', 'almacenDestino', 'detalles.material'])->get();

        return Inertia::render('OrdenesCompraPage', [
            'ordenesDb' => $ordenes,
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
        $devoluciones = DevolucionProveedor::with(['ordenCompra.proveedor', 'detalles.material'])->get();

        return Inertia::render('DevolucionesPage', [
            'devolucionesDb' => $devoluciones,
        ]);
    }
}
