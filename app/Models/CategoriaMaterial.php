<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategoriaMaterial extends Model
{
    protected $table = 'categorias_material';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function materiales(): HasMany
    {
        return $this->hasMany(Material::class, 'categoria_id');
    }
}
