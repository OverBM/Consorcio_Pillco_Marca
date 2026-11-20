<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Persona extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'personas';

    protected $fillable = [
        'dni',
        'nombres',
        'telefono',
    ];

    public function usuario(): HasOne
    {
        return $this->hasOne(Usuario::class, 'persona_id');
    }

    public function trabajador(): HasOne
    {
        return $this->hasOne(Trabajador::class, 'persona_id');
    }
}
