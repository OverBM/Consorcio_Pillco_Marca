<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdelantoEvento extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'adelanto_eventos';

    protected $fillable = [
        'adelanto_id',
        'evento',
        'detalle',
        'usuario_id',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function adelanto(): BelongsTo
    {
        return $this->belongsTo(Adelanto::class, 'adelanto_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
