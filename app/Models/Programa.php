<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Programa extends Model
{
    use SoftDeletes;

    protected $table = 'programas';

    protected $fillable = [
        'nombre',
        'descripcion',
        'entidad_contratante',
        'estado',
    ];

    public function obras(): HasMany
    {
        return $this->hasMany(Obra::class, 'programa_id');
    }
}
