<?php

namespace App\Http\Controllers\Web;

use App\Domain\Analitica\SerieAnaliticaService;
use App\Domain\Geo\ResumenCuotaRuteo;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\FiltraContextoOperativo;
use App\Models\AlertaAbastecimiento;
use App\Models\Almacen;
use App\Models\EjecucionAnalitica;
use App\Models\Material;
use App\Models\ParametroInventario;
use App\Models\PronosticoDemanda;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AnaliticaViewController extends Controller
{
    use FiltraContextoOperativo;

    public function __construct(
        private readonly ResumenCuotaRuteo $cuotaRuteo,
        private readonly SerieAnaliticaService $serieAnalitica,
    ) {}

    public function index(): Response
    {
        $parametros = $this->filtrarContextoAlmacen(ParametroInventario::query())
            ->with(['almacen:id,nombre,obra_id', 'material:id,codigo,nombre,unidad_id'])
            ->where('vigente', true)
            ->orderBy('clase_abc')
            ->orderBy('material_id')
            ->limit(500)
            ->get();

        $alertas = $this->filtrarContextoAlmacen(AlertaAbastecimiento::query())
            ->with(['almacen:id,nombre', 'material:id,codigo,nombre'])
            ->where('estado', 'vigente')
            ->orderByRaw("CASE severidad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END")
            ->orderBy('fecha_estimada')
            ->limit(200)
            ->get();

        $pronosticos = $this->filtrarContextoAlmacen(PronosticoDemanda::query())
            ->with(['almacen:id,nombre', 'material:id,codigo,nombre'])
            ->whereDate('fecha', '>=', now()->subDays(7)->toDateString())
            ->orderBy('fecha')
            ->limit(500)
            ->get();

        return Inertia::render('AnaliticaPage', [
            'resumen' => $this->resumen($parametros, $alertas),
            'parametrosDb' => $parametros,
            'alertasDb' => $alertas,
            'pronosticosDb' => $pronosticos,
            'ejecucionesDb' => EjecucionAnalitica::query()->latest('inicio')->limit(30)->get(),
            'cuotaRuteo' => $this->cuotaRuteo->hoy(),
            'cuotaRuteoSemana' => $this->cuotaRuteo->ultimosDias(7),
            'serieAnalitica' => $this->serieAnalitica->resumen(30, 30),
            'materialesDb' => Material::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'codigo', 'nombre']),
            'almacenesDb' => $this->filtrarContextoAlmacenes(Almacen::query())
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'obra_id']),
        ]);
    }

    /**
     * @param  Collection<int, ParametroInventario>  $parametros
     * @param  Collection<int, AlertaAbastecimiento>  $alertas
     * @return array<string, mixed>
     */
    private function resumen($parametros, $alertas): array
    {
        $demanda = (float) $parametros->sum('demanda_media_diaria');
        $ultima = EjecucionAnalitica::query()->latest('inicio')->first();

        return [
            'parametros_vigentes' => $parametros->count(),
            'alertas_vigentes' => $alertas->count(),
            'alertas_criticas' => $alertas->where('severidad', 'critica')->count(),
            'quiebres_7d' => $alertas
                ->where('tipo', 'quiebre_proyectado')
                ->filter(fn (AlertaAbastecimiento $alerta) => $alerta->fecha_estimada !== null
                    && $alerta->fecha_estimada->lte(now()->addDays(7)))
                ->count(),
            'eoq_promedio_a' => $parametros
                ->where('clase_abc', 'A')
                ->whereNotNull('eoq')
                ->avg('eoq'),
            'demanda_media_total' => round($demanda, 3),
            'ultima_ejecucion' => $ultima,
        ];
    }
}
