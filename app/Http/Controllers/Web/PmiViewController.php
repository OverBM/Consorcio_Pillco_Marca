<?php

namespace App\Http\Controllers\Web;

use App\Domain\Optimization\AhpOptimizationService;
use App\Domain\Project\EvmProjectService;
use App\Http\Controllers\Controller;
use App\Models\ExcedenteDetectado;
use App\Models\Material;
use App\Models\Obra;
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
        protected AhpOptimizationService $ahpService
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
        $excedentes = ExcedenteDetectado::with(['obraOrigen', 'almacen', 'material.unidadMedida'])->get();
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
        ]);
    }

    public function cicloVida(): Response
    {
        $obras = Obra::all();

        return Inertia::render('CicloVidaPage', [
            'obrasDb' => $obras,
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

        return Inertia::render('CronogramaEvmPage', [
            'obrasDb' => $obras,
            'evmData' => $evmData,
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

        return back()->with('success', 'Parámetros del sistema y AHP actualizados exitosamente.');
    }
}
