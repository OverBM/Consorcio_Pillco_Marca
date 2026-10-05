<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Material;
use App\Models\Obra;
use App\Models\StockAlmacen;
use Inertia\Inertia;
use Inertia\Response;

class DashboardViewController extends Controller
{
    public function panel(): Response
    {
        $obras = Obra::all()->map(fn ($o) => [
            'id' => (string) $o->id,
            'codigo' => $o->codigo ?? 'OBR-'.$o->id,
            'nombre' => $o->nombre,
            'distrito' => $o->distrito ?? 'Huancayo',
            'responsable' => 'Ing. Residente General',
            'estado' => $o->estado ?? 'activa',
            'pctAvance' => (float) ($o->avance_fisico_pct ?? 65.0),
            'presupuesto' => (float) ($o->presupuesto_base ?? 1850000.0),
            'coords' => [
                'lat' => (float) ($o->latitud ?? -12.0650),
                'lng' => (float) ($o->longitud ?? -75.2100),
            ],
            'descripcion' => $o->direccion ?? 'Frente de Obra Valle del Mantaro',
            'fechaInicio' => $o->fecha_inicio ? $o->fecha_inicio->format('Y-m-d') : '2026-01-15',
        ]);

        $almacenes = Almacen::all()->map(fn ($a) => [
            'id' => (string) $a->id,
            'obraId' => (string) $a->obra_id,
            'codigo' => $a->codigo ?? 'ALM-'.$a->id,
            'nombre' => $a->nombre,
            'tipo' => 'frente',
            'capacidadM3' => (float) ($a->capacidad_referencial ?? 5000),
            'radioGeocercaM' => (int) ($a->radio_geocerca_m ?? 150),
            'activo' => (bool) $a->activo,
            'coords' => [
                'lat' => (float) ($a->latitud ?? -12.0652),
                'lng' => (float) ($a->longitud ?? -75.2102),
            ],
        ]);

        $materiales = Material::with(['categoria', 'unidadMedida'])->get()->map(fn ($m) => [
            'id' => (string) $m->id,
            'codigo' => $m->codigo,
            'nombre' => $m->nombre,
            'categoria' => $m->categoria?->nombre ?? 'General',
            'unidad' => $m->unidadMedida?->codigo ?? 'und',
            'stockMinimo' => 50,
            'costoReferencial' => (float) ($m->costo_referencial ?? 30.0),
            'criticidad' => $m->criticidad ?? 'normal',
        ]);

        $stock = StockAlmacen::with(['almacen', 'material'])->get()->map(fn ($s) => [
            'id' => (string) $s->id,
            'almacenId' => (string) $s->almacen_id,
            'materialId' => (string) $s->material_id,
            'cantidad' => (float) $s->cantidad,
            'cantidadReservada' => (float) $s->cantidad_reservada,
            'disponible' => max(0, (float) $s->cantidad - (float) $s->cantidad_reservada),
            'stockMinimo' => (float) $s->stock_minimo,
            'stockSeguridad' => (float) $s->stock_seguridad,
            'puntoReorden' => (float) $s->punto_reorden,
        ]);

        return Inertia::render('PanelGeneral', [
            'obrasDb' => $obras,
            'almacenesDb' => $almacenes,
            'materialesDb' => $materiales,
            'stockDb' => $stock,
        ]);
    }
}
