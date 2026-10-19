<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use App\Models\SolicitudAcceso;
use App\Models\Usuario;
use App\Support\PasswordPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Revisión de solicitudes de acceso: aprobar (crea la cuenta con una clave
 * temporal mostrada una sola vez) o rechazar (solo cambia el estado).
 */
class SolicitudAccesoController extends Controller
{
    public function aprobar(Request $request, SolicitudAcceso $solicitud): JsonResponse
    {
        $validated = $request->validate([
            'notas_revision' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($solicitud->estado !== SolicitudAcceso::ESTADO_PENDIENTE) {
            return $this->respuestaError('Esta solicitud ya fue revisada.');
        }

        if (Usuario::withTrashed()->where('email', $solicitud->email)->exists()) {
            return $this->respuestaError('Ya existe una cuenta con el correo de esta solicitud.');
        }

        if ($solicitud->dni && Usuario::withTrashed()->where('dni', $solicitud->dni)->exists()) {
            return $this->respuestaError('Ya existe una cuenta con el DNI de esta solicitud.');
        }

        $rol = Rol::where('codigo', $solicitud->rol_solicitado)->first();

        if (! $rol) {
            return $this->respuestaError('El rol solicitado ya no está disponible.');
        }

        $claveTemporal = $this->generarClaveTemporal();

        $usuario = DB::transaction(function () use ($solicitud, $rol, $claveTemporal, $validated, $request): Usuario {
            $usuario = Usuario::create([
                'name' => $solicitud->nombre_completo,
                'email' => $solicitud->email,
                'password' => $claveTemporal,
                'dni' => $solicitud->dni,
                'telefono' => $solicitud->telefono,
                'activo' => true,
            ]);

            $usuario->roles()->sync([$rol->id]);

            $solicitud->update([
                'estado' => SolicitudAcceso::ESTADO_APROBADA,
                'revisado_por' => $request->user()->id,
                'revisado_en' => now(),
                'notas_revision' => $validated['notas_revision'] ?? null,
            ]);

            return $usuario;
        });

        return response()->json([
            'success' => true,
            'message' => 'Solicitud aprobada. Comparte la contraseña temporal con la persona.',
            'data' => [
                'solicitud_id' => (string) $solicitud->id,
                'estado' => $solicitud->estado,
                'password_temporal' => $claveTemporal,
                'usuario' => [
                    'id' => $usuario->id,
                    'name' => $usuario->name,
                    'email' => $usuario->email,
                    'rol' => $rol->nombre,
                ],
            ],
        ]);
    }

    public function rechazar(Request $request, SolicitudAcceso $solicitud): JsonResponse
    {
        $validated = $request->validate([
            'notas_revision' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($solicitud->estado !== SolicitudAcceso::ESTADO_PENDIENTE) {
            return $this->respuestaError('Esta solicitud ya fue revisada.');
        }

        $solicitud->update([
            'estado' => SolicitudAcceso::ESTADO_RECHAZADA,
            'revisado_por' => $request->user()->id,
            'revisado_en' => now(),
            'notas_revision' => $validated['notas_revision'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Solicitud rechazada.',
            'data' => [
                'solicitud_id' => (string) $solicitud->id,
                'estado' => $solicitud->estado,
            ],
        ]);
    }

    private function respuestaError(string $mensaje): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $mensaje,
        ], 422);
    }

    /**
     * Genera una contraseña temporal que cumple la política del sistema.
     */
    private function generarClaveTemporal(): string
    {
        $pools = [
            'abcdefghijkmnpqrstuvwxyz',
            'ABCDEFGHJKLMNPQRSTUVWXYZ',
            '23456789',
            '!@#$%&*?',
        ];

        do {
            $caracteres = [];

            foreach ($pools as $pool) {
                $caracteres[] = $pool[random_int(0, strlen($pool) - 1)];
            }

            $todos = implode('', $pools);

            for ($i = count($caracteres); $i < 12; $i++) {
                $caracteres[] = $todos[random_int(0, strlen($todos) - 1)];
            }

            shuffle($caracteres);
            $clave = implode('', $caracteres);
        } while (PasswordPolicy::failures($clave) !== []);

        return $clave;
    }
}
