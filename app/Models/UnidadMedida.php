<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnidadMedida extends Model
{
    protected $table = 'unidades_medida';

    public $timestamps = false;

    protected $fillable = [
        'codigo',
        'nombre',
    ];

    public function materiales(): HasMany
    {
        return $this->hasMany(Material::class, 'unidad_id');
    }
}
