<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FaseRequisito extends Model
{
    use Auditable;
    use HasFactory;

    protected $table = 'fase_requisitos';

    protected $fillable = [
        'fase',
        'codigo',
        'nombre',
        'descripcion',
        'orden',
        'activo',
    ];

    protected $casts = [
        'orden' => 'integer',
        'activo' => 'boolean',
    ];

    /**
     * @param  Builder<FaseRequisito>  $query
     * @return Builder<FaseRequisito>
     */
    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    /**
     * @param  Builder<FaseRequisito>  $query
     * @return Builder<FaseRequisito>
     */
    public function scopeDeFase(Builder $query, string $fase): Builder
    {
        return $query->where('fase', $fase);
    }
}
