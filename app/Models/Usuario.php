<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Usuario extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $table = 'usuarios';

    protected $fillable = [
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

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'usuario_rol', 'usuario_id', 'rol_id');
    }

    public function rol(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'usuario_rol', 'usuario_id', 'rol_id');
    }

    public function getNombreCompletoAttribute(): string
    {
        return $this->name ?? $this->email;
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

    public function certificaciones(): HasMany
    {
        return $this->hasMany(CertificacionUsuario::class, 'usuario_id');
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
