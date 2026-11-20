<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permiso extends Model
{
    protected $table = 'permisos';

    protected static function booted(): void
    {
        static::saved(fn () => Rol::invalidarUsuarios());
        static::deleted(fn () => Rol::invalidarUsuarios());
    }

    protected $fillable = [
        'codigo',
        'modulo',
        'descripcion',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'permiso_rol', 'permiso_id', 'rol_id');
    }
}
