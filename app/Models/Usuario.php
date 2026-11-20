<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Usuario extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $table = 'usuarios';

    protected $with = ['persona'];

    protected $fillable = [
        'persona_id',
        'name',
        'email',
        'password',
        'dni',
        'telefono',
        'activo',
        'intentos_fallidos',
        'bloqueado_hasta',
        'ultimo_acceso_en',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'name',
        'dni',
        'telefono',
        'nombre_completo',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'bloqueado_hasta' => 'datetime',
            'ultimo_acceso_en' => 'datetime',
            'activo' => 'boolean',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Usuario $usuario): void {
            $tieneNombre = array_key_exists('name', $usuario->attributes);
            $tieneDni = array_key_exists('dni', $usuario->attributes);
            $tieneTelefono = array_key_exists('telefono', $usuario->attributes);

            if (! $tieneNombre && ! $tieneDni && ! $tieneTelefono) {
                return;
            }

            $persona = $usuario->persona;
            $datos = array_filter([
                'dni' => $tieneDni ? $usuario->attributes['dni'] : null,
                'nombres' => $tieneNombre ? $usuario->attributes['name'] : null,
                'telefono' => $tieneTelefono ? $usuario->attributes['telefono'] : null,
            ], static fn ($valor) => $valor !== null);

            if ($persona === null) {
                $persona = isset($datos['dni'])
                    ? Persona::firstOrCreate(['dni' => $datos['dni']], $datos)
                    : Persona::create($datos + ['nombres' => $usuario->email]);
                $usuario->persona_id = $persona->id;
            } elseif ($datos !== []) {
                $persona->fill($datos)->save();
            }

            unset(
                $usuario->attributes['name'],
                $usuario->attributes['dni'],
                $usuario->attributes['telefono'],
            );

            $usuario->setRelation('persona', $persona);
        });
    }

    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'persona_id');
    }

    public function getNameAttribute(): ?string
    {
        return $this->persona?->nombres;
    }

    public function getDniAttribute(): ?string
    {
        return $this->persona?->dni;
    }

    public function getTelefonoAttribute(): ?string
    {
        return $this->persona?->telefono;
    }

    public function getNombreCompletoAttribute(): string
    {
        return $this->name ?? $this->email;
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'usuario_rol', 'usuario_id', 'rol_id');
    }

    public function rol(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'usuario_rol', 'usuario_id', 'rol_id');
    }

    public function obras(): BelongsToMany
    {
        return $this->belongsToMany(Obra::class, 'usuario_obra', 'usuario_id', 'obra_id')
            ->withPivot('rol_id');
    }

    public function almacenes(): BelongsToMany
    {
        return $this->belongsToMany(Almacen::class, 'usuario_almacen', 'usuario_id', 'almacen_id')
            ->withPivot('tipo');
    }

    public function tieneRol(string $codigoRol): bool
    {
        return $this->roles()->where('codigo', $codigoRol)->exists();
    }

    public function tienePermiso(string $codigoPermiso): bool
    {
        return $this->roles()
            ->whereHas('permisos', function ($q) use ($codigoPermiso) {
                $q->where('codigo', $codigoPermiso);
            })
            ->exists();
    }
}
