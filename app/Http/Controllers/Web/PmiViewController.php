<?php

namespace App\Http\Controllers\Web;

use App\Domain\Optimization\AhpOptimizationService;
use App\Domain\Project\EvaluadorCriteriosFase;
use App\Domain\Project\EvmProjectService;
use App\Enums\FaseCicloVida;
use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\ExcedenteDetectado;
use App\Models\FaseCriterio;
use App\Models\FaseRequisito;
use App\Models\Hito;
use App\Models\Material;
use App\Models\Obra;
use App\Models\ObraFase;
use App\Models\ParametroSistema;
use App\Models\Partida;
use App\Models\Riesgo;
use App\Models\SolicitudCambio;
use App\Models\Valorizacion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PmiViewController extends Controller
{
    public function __construct(
        protected EvmProjectService $evmService,
        protected AhpOptimizationService $ahpService,
        protected EvaluadorCriteriosFase $evaluadorFases
    ) {}

    public function programa(): Response
    {
        $obras = Obra::with(['residente', 'almacenes'])->get()->map(fn ($o) => [
            'id' => (string) $o->id,
            'codigo' => $o->codigo ?? 'OBR-'.$o->id,
            'nombre' => $o->nombre,
            'distrito' => $o->distrito ?? 'Huancayo',
            'responsable' => $o->residente?->nombre_completo ?? 'Ing. Residente General',
            'estado' => $o->estado ?? 'activa',
            'pctAvance' => (float) ($o->avance_fisico_pct ?? 65.0),
            'presupuesto' => (float) ($o->presupuesto_base ?? 1850000.0),
        ]);

        $evmConsolidado = $this->evmService->calcularConsolidadoPrograma();

        return Inertia::render('ProgramaPage', [
            'obrasDb' => $obras,
            'evmConsolidado' => $evmConsolidado,
        ]);
    }

    public function redistribucion(): Response
    {
        $excedentes = ExcedenteDetectado::with(['obra', 'almacen', 'material.unidadMedida'])->get();
        $parametros = ParametroSistema::all();

        // Calcular ranking AHP para las obras en ejecución
        $obraDestino = Obra::where('estado', 'ejecucion')->first() ?? Obra::first();
        $materialSobrante = Material::first();

        $transferenciasSugeridas = [];
        if ($obraDestino && $materialSobrante) {
            $transferenciasSugeridas = $this->ahpService->calcularRankingTransferencias(
                $obraDestino->id,
                $materialSobrante->id,
                100.0
            );
        }

        return Inertia::render('RedistribucionPage', [
            'excedentesDb' => $excedentes,
            'parametrosDb' => $parametros,
            'transferenciasAhpDb' => $transferenciasSugeridas,
            'obrasDb' => Obra::orderBy('nombre')->get(['id', 'nombre']),
            'almacenesDb' => Almacen::with('obra:id,nombre')->orderBy('nombre')->get(['id', 'nombre', 'obra_id']),
            'materialesDb' => Material::with('unidadMedida')->orderBy('nombre')->get(['id', 'nombre', 'unidad_medida_id']),
        ]);
    }

    public function cicloVida(): Response
    {
        $obras = Obra::all();
        $fases = ObraFase::with('obra')->get();

        $requisitos = FaseRequisito::query()->activos()->orderBy('orden')->get();
        $criterios = FaseCriterio::query()->activos()->orderBy('orden')->get();

        $evaluaciones = [];
        foreach ($obras as $obra) {
            foreach (FaseCicloVida::cases() as $fase) {
                $evaluaciones[(string) $obra->id][$fase->value] = $this->evaluadorFases->evaluar(
                    $obra,
                    $fase,
                    $criterios->where('fase', $fase->value)->values()
                );
            }
        }

        return Inertia::render('CicloVidaPage', [
            'obrasDb' => $obras,
            'fasesDb' => $fases,
            'fasesCatalogo' => FaseCicloVida::secuencia(),
            'requisitosDb' => $requisitos,
            'criteriosDb' => $criterios,
            'evaluacionesDb' => $evaluaciones,
        ]);
    }

    public function fases(): Response
    {
        return Inertia::render('FasesAdminPage', [
            'fasesCatalogo' => FaseCicloVida::secuencia(),
            'requisitosDb' => FaseRequisito::query()->orderBy('orden')->get(),
            'criteriosDb' => FaseCriterio::query()->orderBy('orden')->get(),
            'tiposCriterioDb' => FaseCriterio::tiposSoportados(),
        ]);
    }

    public function partidas(): Response
    {
        $partidas = Partida::with('obra')->get();

        return Inertia::render('PartidasPage', [
            'partidasDb' => $partidas,
        ]);
    }

    public function cronogramaEvm(): Response
    {
        $obras = Obra::all();
        $obraActiva = Obra::first();
        $evmData = $obraActiva ? $this->evmService->calcularEvmObra($obraActiva->id) : [];
        $hitos = Hito::with('obra')->get();

        return Inertia::render('CronogramaEvmPage', [
            'obrasDb' => $obras,
            'evmData' => $evmData,
            'hitosDb' => $hitos,
        ]);
    }

    public function valorizaciones(): Response
    {
        $valorizaciones = Valorizacion::with('obra')->get();

        return Inertia::render('ValorizacionesPage', [
            'valorizacionesDb' => $valorizaciones,
        ]);
    }

    public function riesgos(): Response
    {
        $riesgos = Riesgo::with('obra')->get();

        return Inertia::render('RiesgosPage', [
            'riesgosDb' => $riesgos,
        ]);
    }

    public function cambios(): Response
    {
        $cambios = SolicitudCambio::with('obra')->get();

        return Inertia::render('CambiosPage', [
            'cambiosDb' => $cambios,
        ]);
    }

    public function cierre(): Response
    {
        $obras = Obra::all();

        return Inertia::render('CierreObraPage', [
            'obrasDb' => $obras,
        ]);
    }

    public function parametros(): Response
    {
        $parametros = ParametroSistema::all();

        return Inertia::render('ParametrosPage', [
            'parametrosDb' => $parametros,
        ]);
    }

    public function actualizarParametros(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'ahp_peso_distancia' => 'nullable|numeric|min:0|max:1',
            'ahp_peso_stock' => 'nullable|numeric|min:0|max:1',
            'ahp_peso_criticidad' => 'nullable|numeric|min:0|max:1',
            'factor_sinuosidad_vial' => 'nullable|numeric|min:1',
            'radio_geocerca_metros' => 'nullable|numeric|min:10',
            'dias_tolerancia_demora' => 'nullable|numeric|min:0',
        ]);

        foreach ($datos as $clave => $valor) {
            if ($valor !== null) {
                ParametroSistema::updateOrCreate(
                    ['clave' => $clave],
                    ['valor' => (string) $valor]
                );
            }
        }

        if ($request->filled('clave')) {
            $generico = $request->validate([
                'clave' => 'required|string|exists:parametros_sistema,clave',
                'valor' => 'nullable|string',
            ]);

            ParametroSistema::where('clave', $generico['clave'])->update([
                'valor' => (string) ($generico['valor'] ?? ''),
            ]);
        }

        return back()->with('success', 'Parámetros del sistema y AHP actualizados exitosamente.');
    }
}
