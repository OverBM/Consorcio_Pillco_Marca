<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Interesado extends Model
{
    use HasFactory;

    protected $table = 'interesados';

    protected $fillable = [
        'obra_id',
        'nombre',
        'tipo',
        'influencia',
        'interes',
        'contacto',
    ];

    public function obra(): BelongsTo
    {
        return $this->belongsTo(Obra::class, 'obra_id');
    }
}
