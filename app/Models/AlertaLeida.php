<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaLeida extends Model
{
    protected $table = 'notificaciones';

    protected $fillable = [
        'alerta_id',
        'usuario_id',
        'leida_en',
    ];

    protected $casts = [
        'leida_en' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $registro): void {
            $registro->attributes['tipo'] ??= 'alerta';
            $registro->attributes['titulo'] ??= 'Alerta';
            $registro->attributes['cuerpo'] ??= null;
            $registro->attributes['leida_en'] ??= now();
        });
    }

    public function alerta(): BelongsTo
    {
        return $this->belongsTo(Alerta::class, 'alerta_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
