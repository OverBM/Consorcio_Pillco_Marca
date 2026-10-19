<?php

namespace App\Models\Concerns;

use App\Models\Auditoria;

/**
 * Registra automáticamente en la bitácora las altas, cambios y bajas del modelo.
 *
 * Nunca expone credenciales: `password` y `remember_token` se excluyen del payload.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model): void {
            Auditoria::registrar('crear', $model->getTable(), $model->getKey(), null, $model->auditoriaPayload());
        });

        static::updated(function ($model): void {
            $cambios = $model->auditoriaCambios();

            if ($cambios === []) {
                return;
            }

            Auditoria::registrar('actualizar', $model->getTable(), $model->getKey(), $cambios['antes'], $cambios['despues']);
        });

        static::deleted(function ($model): void {
            Auditoria::registrar('eliminar', $model->getTable(), $model->getKey(), $model->auditoriaPayload(), null);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function auditoriaPayload(): array
    {
        return $this->auditoriaLimpiar($this->attributesToArray());
    }

    /**
     * @return array{antes: array<string, mixed>, despues: array<string, mixed>}
     */
    public function auditoriaCambios(): array
    {
        $antes = [];
        $despues = [];

        foreach ($this->getChanges() as $campo => $nuevo) {
            if (in_array($campo, ['password', 'remember_token'], true)) {
                continue;
            }

            $antes[$campo] = $this->getOriginal($campo);
            $despues[$campo] = $nuevo;
        }

        return ['antes' => $antes, 'despues' => $despues];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function auditoriaLimpiar(array $payload): array
    {
        unset($payload['password'], $payload['remember_token']);

        return $payload;
    }
}
