<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Despacho;
use App\Models\InventarioFisico;
use App\Models\Merma;
use App\Models\OrdenCompra;
use App\Models\Recepcion;
use App\Models\SolicitudMaterial;
use App\Models\StockAlmacen;
use App\Models\Transferencia;
use Inertia\Inertia;
use Inertia\Response;

class LogisticaViewController extends Controller
{
    public function stock(): Response
    {
        $stock = StockAlmacen::with(['almacen', 'material.unidadMedida'])->get()->map(fn ($s) => [
            'id' => (string) $s->id,
            'almacenId' => (string) $s->almacen_id,
            'almacenNombre' => $s->almacen?->nombre ?? 'Almacén',
            'materialId' => (string) $s->material_id,
            'materialCodigo' => $s->material?->codigo ?? 'MAT-00',
            'materialNombre' => $s->material?->nombre ?? 'Material',
            'unidad' => $s->material?->unidadMedida?->codigo ?? 'UND',
            'cantidad' => (float) $s->cantidad,
            'cantidadReservada' => (float) $s->cantidad_reservada,
            'disponible' => max(0, (float) $s->cantidad - (float) $s->cantidad_reservada),
            'stockMinimo' => (float) $s->stock_minimo,
            'stockSeguridad' => (float) $s->stock_seguridad,
            'puntoReorden' => (float) $s->punto_reorden,
            'estado' => $s->cantidad <= $s->stock_seguridad ? 'critico' : ($s->cantidad <= $s->stock_minimo ? 'bajo' : 'optimo'),
        ]);

        return Inertia::render('StockPage', [
            'stockDb' => $stock,
        ]);
    }

    public function recepcion(): Response
    {
        $recepciones = Recepcion::with(['almacen', 'ordenCompra.proveedor', 'detalles.material'])->get();
        $ordenesCompra = OrdenCompra::with(['proveedor', 'detalles.material'])->get();

        return Inertia::render('RecepcionPage', [
            'recepcionesDb' => $recepciones,
            'ordenesDb' => $ordenesCompra,
        ]);
    }

    public function solicitudes(): Response
    {
        $solicitudes = SolicitudMaterial::with(['obra', 'detalles.material'])->get();

        return Inertia::render('SolicitudesPage', [
            'solicitudesDb' => $solicitudes,
        ]);
    }

    public function despachos(): Response
    {
        $despachos = Despacho::with(['almacenOrigen', 'obraDestino', 'vehiculo', 'detalles.material'])->get();

        return Inertia::render('DespachosPage', [
            'despachosDb' => $despachos,
        ]);
    }

    public function transferencias(): Response
    {
        $transferencias = Transferencia::with(['almacenOrigen', 'almacenDestino', 'detalles.material'])->get();

        return Inertia::render('TransferenciasPage', [
            'transferenciasDb' => $transferencias,
        ]);
    }

    public function inventarioFisico(): Response
    {
        $inventarios = InventarioFisico::with(['almacen', 'detalles.material'])->get();

        return Inertia::render('InventarioFisicoPage', [
            'inventariosDb' => $inventarios,
        ]);
    }

    public function mermas(): Response
    {
        $mermas = Merma::with(['almacen', 'material'])->get();

        return Inertia::render('MermasPage', [
            'mermasDb' => $mermas,
        ]);
    }
}
