<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObservacionEvidencia extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'observacion_evidencias';

    protected $fillable = [
        'observacion_id',
        'etapa',
        'ruta',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function observacion(): BelongsTo
    {
        return $this->belongsTo(ObservacionTecnica::class, 'observacion_id');
    }
}
