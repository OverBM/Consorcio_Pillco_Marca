<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ParametroSistema extends Model
{
    protected $table = 'parametros_sistema';

    protected $fillable = [
        'clave',
        'valor',
        'tipo',
        'descripcion',
    ];

    public static function getValor(string $clave, mixed $default = null): mixed
    {
        $param = static::where('clave', $clave)->first();
        if (! $param) {
            return $default;
        }

        return match ($param->tipo) {
            'numero' => is_numeric($param->valor) ? (float) $param->valor : $param->valor,
            'booleano' => filter_var($param->valor, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($param->valor, true),
            default => $param->valor,
        };
    }
}
