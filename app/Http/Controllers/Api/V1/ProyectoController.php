<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Project\EvaluadorCriteriosFase;
use App\Domain\Proyectos\EvmService;
use App\Enums\EstadoFase;
use App\Enums\FaseCicloVida;
use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\FaseCriterio;
use App\Models\Hito;
use App\Models\LineaBaseCosto;
use App\Models\Obra;
use App\Models\ObraFase;
use App\Models\Valorizacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProyectoController extends Controller
{
    public function __construct(
        protected EvmService $evmService,
        protected EvaluadorCriteriosFase $evaluador
    ) {}

    /**
     * Listado público de proyectos para la portada.
     *
     * Expone únicamente los campos de presentación pública
     * (identificador, nombre, programa, distrito, estado y avance)
     * y permite filtrar por estado y/o distrito.
     */
    public function index(Request $request): JsonResponse
    {
        $proyectos = Obra::query()
            ->with('programa:id,nombre')
            ->when($request->filled('estado'), fn ($q) => $q->where('estado', $request->input('estado')))
            ->when($request->filled('distrito'), fn ($q) => $q->where('distrito', $request->input('distrito')))
            ->orderBy('nombre')
            ->get()
            ->map(fn (Obra $obra): array => [
                'id' => $obra->id,
                'codigo' => $obra->codigo,
                'nombre' => $obra->nombre,
                'programa' => $obra->programa?->nombre,
                'distrito' => $obra->distrito,
                'estado' => $obra->estado,
                'avance' => (float) $obra->avance_fisico_pct,
            ])
            ->all();

        return response()->json([
            'success' => true,
            'data' => $proyectos,
            'meta' => [
                'total' => count($proyectos),
            ],
        ]);
    }

    /**
     * Detalle completo del proyecto con análisis EVM y cronograma.
     */
    public function show(int $id): JsonResponse
    {
        $obra = Obra::with(['fases', 'hitos', 'lineasBaseCosto', 'avancesFisicos.partida', 'valorizaciones'])
            ->findOrFail($id);

        $lineaBase = LineaBaseCosto::where('obra_id', $obra->id)->where('vigente', true)->first();
        $bac = (float) ($lineaBase?->bac ?? 0);

        // Última valorización para cálculo EVM
        $ultimaVal = Valorizacion::where('obra_id', $obra->id)->orderBy('periodo', 'desc')->first();

        $pv = (float) ($ultimaVal?->valor_planificado ?? 0);
        $ev = (float) ($ultimaVal?->valor_ganado ?? 0);
        $ac = (float) ($ultimaVal?->costo_real ?? 0);

        $evm = $this->evmService->calcularMetricas($pv, $ev, $ac, $bac);

        return response()->json([
            'success' => true,
            'data' => [
                'obra' => $obra,
                'linea_base' => $lineaBase,
                'evm' => $evm,
            ],
        ]);
    }

    /**
     * Gestionar o avanzar fase del ciclo de vida PMI.
     */
    public function gestionarFase(Request $request, int $obraId): JsonResponse
    {
        $validated = $request->validate([
            'fase' => ['required', 'string', Rule::in(FaseCicloVida::valores())],
            'estado' => ['required', 'string', Rule::in(EstadoFase::valores())],
            'observaciones' => ['nullable', 'string'],
            'justificaciones' => ['nullable', 'array'],
            'justificaciones.*' => ['nullable', 'string'],
        ]);

        $obra = Obra::findOrFail($obraId);
        $fase = FaseCicloVida::from($validated['fase']);
        $usuarioId = $request->user()?->id ?? 1;

        if ($validated['estado'] === EstadoFase::Aprobada->value) {
            $faseAnterior = $fase->anterior();

            if ($faseAnterior !== null) {
                $anteriorAprobada = ObraFase::where('obra_id', $obra->id)
                    ->where('fase', $faseAnterior->value)
                    ->where('estado', EstadoFase::Aprobada->value)
                    ->exists();

                if (! $anteriorAprobada) {
                    return response()->json([
                        'success' => false,
                        'message' => sprintf('No se puede aprobar %s: la fase previa %s debe estar aprobada.', $fase->etiqueta(), $faseAnterior->etiqueta()),
                        'errors' => [
                            'fase_previa' => [sprintf('La fase %s no está aprobada.', $faseAnterior->etiqueta())],
                        ],
                    ], 422);
                }
            }

            $resultados = $this->evaluarCriteriosObligatorios($obra, $fase, $validated['justificaciones'] ?? []);

            if ($resultados['faltantes'] !== []) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se cumplen los criterios obligatorios de la fase.',
                    'errors' => [
                        'criterios' => array_map(
                            fn (array $c) => $c['detalle'],
                            $resultados['faltantes']
                        ),
                    ],
                    'data' => [
                        'evaluaciones' => $resultados['evaluaciones'],
                    ],
                ], 422);
            }
        }

        $obraFase = ObraFase::updateOrCreate(
            ['obra_id' => $obra->id, 'fase' => $fase->value],
            [
                'estado' => $validated['estado'],
                'aprobada_por' => $validated['estado'] === EstadoFase::Aprobada->value ? $usuarioId : null,
                'aprobada_en' => $validated['estado'] === EstadoFase::Aprobada->value ? now() : null,
                'observaciones' => $validated['observaciones'] ?? null,
            ]
        );

        Auditoria::registrar('gestionar_fase', 'obra_fases', $obraFase->id, null, [
            'obra_id' => $obra->id,
            'fase' => $fase->value,
            'estado' => $validated['estado'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Fase del proyecto actualizada exitosamente.',
            'data' => $obraFase,
        ]);
    }

    /**
     * Evalúa los criterios activos de una fase y separa los obligatorios incumplidos.
     *
     * @param  array<string, string>  $justificaciones
     * @return array{evaluaciones: array<int, array<string, mixed>>, faltantes: array<int, array<string, mixed>>}
     */
    private function evaluarCriteriosObligatorios(Obra $obra, FaseCicloVida $fase, array $justificaciones): array
    {
        $criterios = FaseCriterio::query()->activos()->deFase($fase->value)->orderBy('orden')->get();

        $evaluaciones = $this->evaluador->evaluar($obra, $fase, $criterios, $justificaciones);
        $faltantes = array_values(array_filter(
            $evaluaciones,
            fn (array $e) => $e['obligatorio'] && ! $e['cumple']
        ));

        return ['evaluaciones' => $evaluaciones, 'faltantes' => $faltantes];
    }

    /**
     * Crear hito de cronograma.
     */
    public function crearHito(Request $request, int $obraId): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:160',
            'fecha_planificada' => 'required|date',
            'fecha_real' => 'nullable|date',
            'estado' => 'nullable|string|in:pendiente,en_proceso,cumplido,retrasado',
        ]);

        $obra = Obra::findOrFail($obraId);

        $hito = Hito::create([
            'obra_id' => $obra->id,
            'nombre' => $validated['nombre'],
            'fecha_planificada' => $validated['fecha_planificada'],
            'fecha_real' => $validated['fecha_real'] ?? null,
            'estado' => $validated['estado'] ?? 'pendiente',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hito registrado exitosamente.',
            'data' => $hito,
        ], 201);
    }
}
