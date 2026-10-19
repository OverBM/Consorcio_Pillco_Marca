<?php

namespace App\Domain\Project;

use App\Enums\FaseCicloVida;
use App\Models\Alerta;
use App\Models\Documento;
use App\Models\FaseCriterio;
use App\Models\Hito;
use App\Models\LineaBaseCosto;
use App\Models\Obra;
use App\Models\Partida;
use App\Models\SolicitudCambio;
use App\Models\Transferencia;
use App\Models\Valorizacion;
use Illuminate\Support\Collection;

/**
 * Verificador tipado de criterios de aprobación de fase.
 *
 * Cada tipo de criterio se evalúa contra datos reales de la obra; el resultado
 * incluye si cumple y un detalle legible para mostrar al usuario.
 */
class EvaluadorCriteriosFase
{
    /**
     * Tipos de verificación soportados por el sistema.
     *
     * @var array<int, string>
     */
    public const TIPOS_SOPORTADOS = [
        'documento_existe',
        'hitos_cumplidos_pct',
        'linea_base_costo',
        'valorizaciones_aprobadas',
        'sin_observaciones_abiertas',
        'sin_transferencias_transito',
        'kpi_valor',
        'partidas_avance_pct',
        'cambios_aprobados',
        'manual_justificado',
    ];

    public static function esTipoSoportado(string $tipo): bool
    {
        return in_array($tipo, self::TIPOS_SOPORTADOS, true);
    }

    /**
     * @param  Collection<int, FaseCriterio>  $criterios
     * @param  array<string, string>  $justificaciones  Justificaciones manuales indexadas por código de criterio.
     * @return array<int, array{criterio_id: int, codigo: string, nombre: string, tipo: string, obligatorio: bool, cumple: bool, detalle: string}>
     */
    public function evaluar(Obra $obra, FaseCicloVida $fase, Collection $criterios, array $justificaciones = []): array
    {
        return $criterios
            ->map(fn (FaseCriterio $criterio) => $this->evaluarCriterio($obra, $fase, $criterio, $justificaciones))
            ->values()
            ->all();
    }

    /**
     * @param  array<string, string>  $justificaciones
     * @return array{criterio_id: int, codigo: string, nombre: string, tipo: string, obligatorio: bool, cumple: bool, detalle: string}
     */
    public function evaluarCriterio(Obra $obra, FaseCicloVida $fase, FaseCriterio $criterio, array $justificaciones = []): array
    {
        [$cumple, $detalle] = $this->verificar($obra, $fase, $criterio, $justificaciones);

        return [
            'criterio_id' => (int) $criterio->id,
            'codigo' => $criterio->codigo,
            'nombre' => $criterio->nombre,
            'tipo' => $criterio->tipo,
            'obligatorio' => (bool) $criterio->obligatorio,
            'cumple' => $cumple,
            'detalle' => $detalle,
        ];
    }

    /**
     * @param  array<string, string>  $justificaciones
     * @return array{0: bool, 1: string}
     */
    private function verificar(Obra $obra, FaseCicloVida $fase, FaseCriterio $criterio, array $justificaciones): array
    {
        $parametros = $criterio->parametros ?? [];

        return match ($criterio->tipo) {
            'documento_existe' => $this->verificarDocumentoExiste($obra, $parametros),
            'hitos_cumplidos_pct' => $this->verificarHitosCumplidos($obra, $criterio->umbral),
            'linea_base_costo' => $this->verificarLineaBase($obra),
            'valorizaciones_aprobadas' => $this->verificarValorizaciones($obra, $criterio->umbral),
            'sin_observaciones_abiertas' => $this->verificarSinObservaciones($obra),
            'sin_transferencias_transito' => $this->verificarSinTransferencias($obra),
            'kpi_valor' => $this->verificarKpiValor($obra, $parametros),
            'partidas_avance_pct' => $this->verificarPartidasAvance($obra, $criterio->umbral),
            'cambios_aprobados' => $this->verificarCambiosAprobados($obra),
            'manual_justificado' => $this->verificarManual($criterio, $justificaciones),
            default => [false, 'Tipo de verificación no soportado: '.$criterio->tipo],
        };
    }

    /**
     * @param  array<string, mixed>  $parametros
     * @return array{0: bool, 1: string}
     */
    private function verificarDocumentoExiste(Obra $obra, array $parametros): array
    {
        $tipo = $parametros['tipo_documento'] ?? null;

        $query = Documento::query()->where('obra_id', $obra->id);
        if (is_string($tipo) && $tipo !== '') {
            $query->where('tipo', $tipo);
        }

        $existe = $query->exists();

        return [$existe, $existe ? 'Documento requerido registrado.' : 'No se encontró el documento requerido.'];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarHitosCumplidos(Obra $obra, mixed $umbral): array
    {
        $total = Hito::where('obra_id', $obra->id)->count();
        if ($total === 0) {
            return [false, 'La obra no tiene hitos planificados.'];
        }

        $cumplidos = Hito::where('obra_id', $obra->id)->where('estado', 'cumplido')->count();
        $pct = round($cumplidos / $total * 100, 1);
        $requerido = $umbral !== null ? (float) $umbral : 100.0;

        return [$pct >= $requerido, sprintf('%s%% de hitos cumplidos (requerido %s%%).', $pct, $requerido)];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarLineaBase(Obra $obra): array
    {
        $existe = LineaBaseCosto::where('obra_id', $obra->id)->where('vigente', true)->exists();

        return [$existe, $existe ? 'Línea base de costo vigente.' : 'Sin línea base de costo vigente.'];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarValorizaciones(Obra $obra, mixed $umbral): array
    {
        $aprobadas = Valorizacion::where('obra_id', $obra->id)->where('estado', 'aprobada')->count();
        $requerido = $umbral !== null ? (int) $umbral : 1;

        return [$aprobadas >= $requerido, sprintf('%d valorizaciones aprobadas (requerido %d).', $aprobadas, $requerido)];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarSinObservaciones(Obra $obra): array
    {
        $abiertas = Alerta::where('obra_id', $obra->id)->where('estado', 'abierta')->count();

        return [$abiertas === 0, $abiertas === 0 ? 'Sin observaciones abiertas.' : sprintf('%d observaciones abiertas.', $abiertas)];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarSinTransferencias(Obra $obra): array
    {
        $enTransito = Transferencia::where('estado', 'en_transito')
            ->whereHas('almacenOrigen', fn ($q) => $q->where('obra_id', $obra->id))
            ->count();

        return [$enTransito === 0, $enTransito === 0 ? 'Sin transferencias en tránsito.' : sprintf('%d transferencias en tránsito.', $enTransito)];
    }

    /**
     * @param  array<string, mixed>  $parametros
     * @return array{0: bool, 1: string}
     */
    private function verificarKpiValor(Obra $obra, array $parametros): array
    {
        $metrica = $parametros['metrica'] ?? null;
        $operador = $parametros['operador'] ?? '>=';
        $objetivo = $parametros['valor'] ?? null;

        $campos = [
            'avance_fisico_pct' => (float) $obra->avance_fisico_pct,
            'presupuesto_base' => (float) $obra->presupuesto_base,
        ];

        if (! is_string($metrica) || ! array_key_exists($metrica, $campos) || ! is_numeric($objetivo)) {
            return [false, 'Configuración KPI inválida (metrica/valor).'];
        }

        $actual = $campos[$metrica];
        $objetivo = (float) $objetivo;

        $cumple = match ($operador) {
            '>=' => $actual >= $objetivo,
            '>' => $actual > $objetivo,
            '<=' => $actual <= $objetivo,
            '<' => $actual < $objetivo,
            '==' => abs($actual - $objetivo) < 0.0001,
            default => false,
        };

        return [$cumple, sprintf('%s = %s (requerido %s %s).', $metrica, $actual, $operador, $objetivo)];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarPartidasAvance(Obra $obra, mixed $umbral): array
    {
        $partidas = Partida::where('obra_id', $obra->id)->get();
        if ($partidas->isEmpty()) {
            return [false, 'La obra no tiene partidas registradas.'];
        }

        $requerido = $umbral !== null ? (float) $umbral : 100.0;
        $cumplen = $partidas->filter(fn ($p) => (float) $p->avance_pct >= $requerido)->count();

        return [
            $cumplen === $partidas->count(),
            sprintf('%d de %d partidas con avance >= %s%%.', $cumplen, $partidas->count(), $requerido),
        ];
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function verificarCambiosAprobados(Obra $obra): array
    {
        $pendientes = SolicitudCambio::where('obra_id', $obra->id)
            ->whereIn('estado', ['solicitada', 'en_revision'])
            ->count();

        return [$pendientes === 0, $pendientes === 0 ? 'Sin cambios pendientes de decisión.' : sprintf('%d cambios sin decidir.', $pendientes)];
    }

    /**
     * @param  array<string, string>  $justificaciones
     * @return array{0: bool, 1: string}
     */
    private function verificarManual(FaseCriterio $criterio, array $justificaciones): array
    {
        $justificacion = trim((string) ($justificaciones[$criterio->codigo] ?? ''));
        $cumple = $justificacion !== '';

        return [$cumple, $cumple ? 'Justificación registrada.' : 'Se requiere justificación manual.'];
    }
}
