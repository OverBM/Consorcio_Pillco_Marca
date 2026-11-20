<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Notificacion extends Model
{
    protected $table = 'notificaciones';

    protected static function booted(): void
    {
        $olvidarFeed = function (self $notificacion): void {
            Cache::forget("notificaciones_feed_{$notificacion->usuario_id}");
        };

        static::saved($olvidarFeed);
        static::deleted($olvidarFeed);
    }

    protected $fillable = [
        'usuario_id',
        'alerta_id',
        'tipo',
        'titulo',
        'cuerpo',
        'referencia_tipo',
        'referencia_id',
        'leida_en',
    ];

    protected function casts(): array
    {
        return [
            'leida_en' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function alerta(): BelongsTo
    {
        return $this->belongsTo(Alerta::class, 'alerta_id');
    }

    public function scopeNoLeidas($query)
    {
        return $query->whereNull('leida_en');
    }
}
