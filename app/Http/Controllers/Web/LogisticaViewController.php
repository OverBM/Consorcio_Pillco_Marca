<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
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
    use FiltraContextoOperativo;

    public function stock(): Response
    {
        $stock = $this->filtrarContextoAlmacen(StockAlmacen::query())
            ->with(['almacen', 'material.unidadMedida'])
            ->get()
            ->map(fn ($s) => [
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
        $recepciones = $this->filtrarContextoAlmacen(Recepcion::query())
            ->with(['almacen', 'ordenCompra.proveedor', 'detalles.material'])
            ->get();
        $ordenesCompra = $this->filtrarContexto(OrdenCompra::query(), 'obra_id', 'almacen_destino_id')
            ->with(['proveedor', 'detalles.material'])
            ->get();

        return Inertia::render('RecepcionPage', [
            'recepcionesDb' => $recepciones,
            'ordenesDb' => $ordenesCompra,
        ]);
    }

    public function solicitudes(): Response
    {
        $solicitudes = $this->filtrarContexto(SolicitudMaterial::query())
            ->with(['obra', 'detalles.material'])
            ->get();

        return Inertia::render('SolicitudesPage', [
            'solicitudesDb' => $solicitudes,
        ]);
    }

    public function despachos(): Response
    {
        $despachos = Despacho::with([
            'transferencia.almacenOrigen',
            'transferencia.almacenDestino',
            'transferencia.detalles.material',
            'despachador',
        ])->orderBy('id', 'desc')->get();

        $transferenciasAprobadas = Transferencia::with([
            'almacenOrigen',
            'almacenDestino',
            'detalles.material',
        ])
            ->where('estado', 'aprobada')
            ->whereDoesntHave('despacho')
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('DespachosPage', [
            'despachosDb' => $despachos,
            'transferenciasDb' => $transferenciasAprobadas,
        ]);
    }

    public function transferencias(): Response
    {
        $query = Transferencia::query()
            ->with(['almacenOrigen', 'almacenDestino', 'detalles.material']);

        $almacenId = $this->almacenActivoId();
        $obraId = $this->obraActivaId();

        if ($almacenId !== null) {
            $query->where(function ($q) use ($almacenId) {
                $q->where('almacen_origen_id', $almacenId)
                    ->orWhere('almacen_destino_id', $almacenId);
            });
        } elseif ($obraId !== null) {
            $query->where(function ($q) use ($obraId) {
                $q->whereHas('almacenOrigen', fn ($sub) => $sub->where('obra_id', $obraId))
                    ->orWhereHas('almacenDestino', fn ($sub) => $sub->where('obra_id', $obraId));
            });
        }

        $transferencias = $query->get();

        return Inertia::render('TransferenciasPage', [
            'transferenciasDb' => $transferencias,
        ]);
    }

    public function inventarioFisico(): Response
    {
        $inventarios = $this->filtrarContextoAlmacen(InventarioFisico::query())
            ->with(['almacen', 'detalles.material'])
            ->get();

        return Inertia::render('InventarioFisicoPage', [
            'inventariosDb' => $inventarios,
        ]);
    }

    public function mermas(): Response
    {
        $mermas = $this->filtrarContextoAlmacen(Merma::query())
            ->with(['almacen', 'material'])
            ->get();

        return Inertia::render('MermasPage', [
            'mermasDb' => $mermas,
        ]);
    }
}
