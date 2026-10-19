<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacion extends Model
{
    protected $table = 'notificaciones';

    protected $fillable = [
        'usuario_id',
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

    public function scopeNoLeidas($query)
    {
        return $query->whereNull('leida_en');
    }
}
