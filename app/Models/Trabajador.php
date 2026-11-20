<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Trabajador extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'trabajadores';

    protected $with = ['persona'];

    protected $fillable = [
        'persona_id',
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

    protected $appends = [
        'nombres',
        'dni',
        'usuario_id',
    ];

    protected static function booted(): void
    {
        static::saving(function (Trabajador $trabajador): void {
            $tieneNombres = array_key_exists('nombres', $trabajador->attributes);
            $tieneDni = array_key_exists('dni', $trabajador->attributes);
            $tieneUsuario = array_key_exists('usuario_id', $trabajador->attributes);

            if (! $tieneNombres && ! $tieneDni && ! $tieneUsuario) {
                return;
            }

            $persona = $trabajador->persona;

            if ($persona === null && $tieneUsuario) {
                $usuario = Usuario::find($trabajador->attributes['usuario_id']);
                $persona = $usuario?->persona;
            }

            if ($persona === null) {
                $datos = array_filter([
                    'dni' => $tieneDni ? $trabajador->attributes['dni'] : null,
                    'nombres' => $tieneNombres ? $trabajador->attributes['nombres'] : null,
                ], static fn ($valor) => $valor !== null);

                $persona = isset($datos['dni'])
                    ? Persona::firstOrCreate(['dni' => $datos['dni']], $datos)
                    : Persona::create($datos + ['nombres' => 'Trabajador sin nombre']);
                $trabajador->persona_id = $persona->id;
            } elseif ($tieneNombres || $tieneDni) {
                $persona->fill(array_filter([
                    'dni' => $tieneDni ? $trabajador->attributes['dni'] : null,
                    'nombres' => $tieneNombres ? $trabajador->attributes['nombres'] : null,
                ], static fn ($valor) => $valor !== null))->save();
            }

            unset(
                $trabajador->attributes['nombres'],
                $trabajador->attributes['dni'],
                $trabajador->attributes['usuario_id'],
            );

            $trabajador->setRelation('persona', $persona);
        });
    }

    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'persona_id');
    }

    public function usuario(): HasOne
    {
        return $this->hasOne(Usuario::class, 'persona_id', 'persona_id');
    }

    public function getNombresAttribute(): ?string
    {
        return $this->persona?->nombres;
    }

    public function getDniAttribute(): ?string
    {
        return $this->persona?->dni;
    }

    public function getUsuarioIdAttribute(): ?int
    {
        return $this->persona?->usuario?->id;
    }

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
