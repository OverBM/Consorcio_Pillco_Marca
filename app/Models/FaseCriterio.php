<?php

namespace App\Models;

use App\Domain\Project\EvaluadorCriteriosFase;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FaseCriterio extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'fase_criterios';

    protected $fillable = [
        'fase',
        'codigo',
        'nombre',
        'tipo',
        'parametros',
        'umbral',
        'obligatorio',
        'orden',
        'activo',
    ];

    protected $casts = [
        'parametros' => 'array',
        'umbral' => 'decimal:3',
        'obligatorio' => 'boolean',
        'orden' => 'integer',
        'activo' => 'boolean',
    ];

    /**
     * Tipos de verificación soportados por el sistema.
     *
     * @return array<int, string>
     */
    public static function tiposSoportados(): array
    {
        return EvaluadorCriteriosFase::TIPOS_SOPORTADOS;
    }

    /**
     * @param  Builder<FaseCriterio>  $query
     * @return Builder<FaseCriterio>
     */
    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    /**
     * @param  Builder<FaseCriterio>  $query
     * @return Builder<FaseCriterio>
     */
    public function scopeDeFase(Builder $query, string $fase): Builder
    {
        return $query->where('fase', $fase);
    }
}
