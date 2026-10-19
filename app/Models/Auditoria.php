<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Auditoria extends Model
{
    protected $table = 'auditorias';

    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'accion',
        'entidad',
        'entidad_id',
        'antes',
        'despues',
        'ip',
        'user_agent',
        'hash_anterior',
        'hash_registro',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'antes' => 'array',
            'despues' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    /**
     * Registra una entrada de bitácora y la encadena con la anterior.
     *
     * @param  array<string, mixed>|null  $antes
     * @param  array<string, mixed>|null  $despues
     */
    public static function registrar(
        string $accion,
        string $entidad,
        ?int $entidadId = null,
        ?array $antes = null,
        ?array $despues = null,
        ?int $usuarioId = null,
    ): self {
        $request = request();
        $ip = $request?->ip();
        $userAgent = $request?->userAgent();

        return DB::transaction(function () use ($accion, $entidad, $entidadId, $antes, $despues, $usuarioId, $ip, $userAgent): self {
            $anterior = static::query()->orderByDesc('id')->lockForUpdate()->first();
            $hashAnterior = $anterior?->hash_registro;

            $registro = new static([
                'usuario_id' => $usuarioId ?? Auth::id(),
                'accion' => $accion,
                'entidad' => $entidad,
                'entidad_id' => $entidadId,
                'antes' => $antes,
                'despues' => $despues,
                'ip' => $ip,
                'user_agent' => $userAgent,
                'hash_anterior' => $hashAnterior,
                'created_at' => now(),
            ]);

            $registro->hash_registro = hash('sha256', ($hashAnterior ?? '').$registro->firmaContenido());
            $registro->save();

            return $registro;
        });
    }

    /**
     * Verifica la integridad de la cadena de hashes.
     *
     * @return array{valida: bool, rota_en: int|null}
     */
    public static function verificarCadena(): array
    {
        $hashAnterior = null;

        foreach (static::query()->orderBy('id')->cursor() as $registro) {
            $esperado = hash('sha256', ($hashAnterior ?? '').$registro->firmaContenido());

            if ($registro->hash_anterior !== $hashAnterior || $registro->hash_registro !== $esperado) {
                return ['valida' => false, 'rota_en' => $registro->id];
            }

            $hashAnterior = $registro->hash_registro;
        }

        return ['valida' => true, 'rota_en' => null];
    }

    private function firmaContenido(): string
    {
        return hash('sha256', implode('|', [
            (string) ($this->usuario_id ?? ''),
            $this->accion,
            $this->entidad,
            (string) ($this->entidad_id ?? ''),
            $this->jsonCanonico($this->antes),
            $this->jsonCanonico($this->despues),
            (string) ($this->ip ?? ''),
            (string) ($this->user_agent ?? ''),
        ]));
    }

    /**
     * @param  array<string, mixed>|null  $valor
     */
    private function jsonCanonico(?array $valor): string
    {
        if ($valor === null) {
            return '';
        }

        return (string) json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
