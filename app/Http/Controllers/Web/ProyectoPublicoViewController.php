<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Hito;
use App\Models\Obra;
use App\Models\ObraFase;
use Illuminate\View\View;

/**
 * Página pública de detalle de un proyecto.
 *
 * Expone únicamente campos de presentación saneados (sin coordenadas exactas,
 * costos ni métricas financieras internas). El detalle financiero/EVM queda
 * reservado a los endpoints internos autenticados.
 */
class ProyectoPublicoViewController extends Controller
{
    /** Orden canónico de las fases del ciclo de vida. */
    private const FASES = [
        'inicio' => 'Inicio',
        'planificacion' => 'Planificación',
        'ejecucion' => 'Ejecución',
        'monitoreo_control' => 'Monitoreo y Control',
        'cierre' => 'Cierre',
    ];

    private const ESTADOS = [
        'planificacion' => 'Planificación',
        'ejecucion' => 'Ejecución',
        'cerrada' => 'Cerrada',
        'paralizada' => 'Paralizada',
    ];

    private const ESTADOS_FASE = [
        'pendiente' => 'Pendiente',
        'en_proceso' => 'En proceso',
        'aprobada' => 'Aprobada',
        'rechazada' => 'Rechazada',
    ];

    /** Centro del Valle del Mantaro (Huancayo, Junín). */
    private const MANTARO_CENTER = [-12.068, -75.21];

    /** Ubicación aproximada por distrito cuando la obra no tiene coordenadas. */
    private const COORDENADAS_DISTRITO = [
        'Huancayo' => [-12.065, -75.21],
        'El Tambo' => [-12.045, -75.228],
        'Chilca' => [-12.088, -75.205],
        'San Agustín de Cajas' => [-12.05, -75.25],
        'San Jerónimo de Tunán' => [-11.98, -75.28],
    ];

    public function show(int $id): View
    {
        $obra = Obra::with('programa:id,nombre,descripcion,entidad_contratante')->findOrFail($id);

        $hitos = Hito::query()
            ->where('obra_id', $obra->id)
            ->orderBy('fecha_planificada')
            ->get(['id', 'nombre', 'fecha_planificada', 'fecha_real', 'estado']);

        $fases = ObraFase::query()
            ->where('obra_id', $obra->id)
            ->get(['fase', 'estado', 'observaciones'])
            ->sortBy(fn (ObraFase $fase) => array_search($fase->fase, array_keys(self::FASES), true))
            ->values();

        $estadoLabel = self::ESTADOS[$obra->estado] ?? $obra->estado;
        $descripcion = $obra->programa?->descripcion;

        if (blank($descripcion)) {
            $descripcion = sprintf(
                '%s es una obra del programa %s ubicada en el distrito de %s. Se encuentra en estado %s con un avance físico registrado de %d%%.',
                $obra->nombre,
                $obra->programa?->nombre ?? 'Consorcio Pillco Marca',
                $obra->distrito ?? 'la región',
                strtolower($estadoLabel),
                (int) $obra->avance_fisico_pct,
            );
        }

        return view('proyecto', [
            'obra' => [
                'id' => $obra->id,
                'codigo' => $obra->codigo,
                'nombre' => $obra->nombre,
                'programa' => $obra->programa?->nombre,
                'programa_descripcion' => $obra->programa?->descripcion,
                'descripcion' => $descripcion,
                'entidad_contratante' => $obra->programa?->entidad_contratante,
                'distrito' => $obra->distrito,
                'direccion' => $obra->direccion,
                'estado' => $obra->estado,
                'estado_label' => $estadoLabel,
                'avance' => (float) $obra->avance_fisico_pct,
                'fecha_inicio' => $obra->fecha_inicio,
                'fecha_fin_prevista' => $obra->fecha_fin_prevista,
            ],
            'mapa' => $this->mapaAproximado($obra),
            'hitos' => $hitos,
            'fases' => $fases,
            'etiquetasFase' => self::FASES,
            'etiquetasEstadoFase' => self::ESTADOS_FASE,
        ]);
    }

    /**
     * Construye una vista de mapa aproximada (nivel distrito) para la página
     * pública, sin exponer las coordenadas exactas de la obra.
     *
     * @return array{embed_url: string, externo_url: string}|null
     */
    private function mapaAproximado(Obra $obra): ?array
    {
        $lat = $obra->latitud;
        $lng = $obra->longitud;

        if ($lat === null || $lng === null) {
            [$lat, $lng] = self::COORDENADAS_DISTRITO[$obra->distrito] ?? self::MANTARO_CENTER;
        }

        // Redondeo a ~1 km para publicar solo la ubicación aproximada.
        $lat = round($lat, 2);
        $lng = round($lng, 2);

        $bbox = implode('%2C', [$lng - 0.035, $lat - 0.022, $lng + 0.035, $lat + 0.022]);

        return [
            'embed_url' => "https://www.openstreetmap.org/export/embed.html?bbox={$bbox}&layer=mapnik&marker={$lat}%2C{$lng}",
            'externo_url' => "https://www.openstreetmap.org/?mlat={$lat}&mlon={$lng}#map=14/{$lat}/{$lng}",
        ];
    }
}
