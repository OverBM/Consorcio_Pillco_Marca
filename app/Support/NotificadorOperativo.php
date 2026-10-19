<?php

namespace App\Support;

use App\Models\Notificacion;
use App\Models\Usuario;
use Illuminate\Support\Facades\Auth;

/**
 * Emite notificaciones operativas hacia los usuarios que cumplen un rol.
 */
final class NotificadorOperativo
{
    /**
     * Notifica a todos los usuarios activos con alguno de los roles indicados,
     * excluyendo al usuario que ejecuta la acción.
     *
     * @param  list<string>  $rolesCodigo
     * @return int Cantidad de notificaciones creadas.
     */
    public static function aRoles(
        array $rolesCodigo,
        string $tipo,
        string $titulo,
        ?string $cuerpo = null,
        ?string $referenciaTipo = null,
        ?int $referenciaId = null,
    ): int {
        $actorId = Auth::id();

        $usuarios = Usuario::query()
            ->where('activo', true)
            ->whereHas('roles', fn ($query) => $query->whereIn('codigo', $rolesCodigo))
            ->pluck('id');

        $creadas = 0;

        foreach ($usuarios as $usuarioId) {
            if ($actorId !== null && (int) $usuarioId === (int) $actorId) {
                continue;
            }

            Notificacion::create([
                'usuario_id' => $usuarioId,
                'tipo' => $tipo,
                'titulo' => $titulo,
                'cuerpo' => $cuerpo,
                'referencia_tipo' => $referenciaTipo,
                'referencia_id' => $referenciaId,
            ]);

            $creadas++;
        }

        return $creadas;
    }
}
