<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Trabajador extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'trabajadores';

    protected $fillable = [
        'usuario_id',
        'obra_id',
        'dni',
        'nombres',
        'cargo',
        'frente_id',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }

    public function marcaciones(): HasMany
    {
        return $this->hasMany(Marcacion::class, 'trabajador_id');
    }

    public function asistencias(): HasMany
    {
        return $this->hasMany(Asistencia::class, 'trabajador_id');
    }
}
