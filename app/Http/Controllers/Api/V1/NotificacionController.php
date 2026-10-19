<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Alerta;
use App\Models\AlertaLeida;
use App\Models\Notificacion;
use App\Models\Usuario;
use App\Support\NotificacionesFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => NotificacionesFeed::paraUsuario($this->usuario($request)),
        ]);
    }

    public function marcarLeida(Request $request, int $id): JsonResponse
    {
        $usuario = $this->usuario($request);

        Notificacion::query()
            ->where('usuario_id', $usuario->id)
            ->whereKey($id)
            ->whereNull('leida_en')
            ->update(['leida_en' => now()]);

        return response()->json([
            'success' => true,
            'data' => NotificacionesFeed::paraUsuario($usuario),
        ]);
    }

    public function marcarTodas(Request $request): JsonResponse
    {
        $usuario = $this->usuario($request);

        Notificacion::query()
            ->where('usuario_id', $usuario->id)
            ->whereNull('leida_en')
            ->update(['leida_en' => now()]);

        $ahora = now();

        Alerta::query()
            ->where('estado', 'abierta')
            ->pluck('id')
            ->each(function (int $alertaId) use ($usuario, $ahora): void {
                AlertaLeida::query()->updateOrCreate(
                    ['alerta_id' => $alertaId, 'usuario_id' => $usuario->id],
                    ['leida_en' => $ahora],
                );
            });

        return response()->json([
            'success' => true,
            'data' => NotificacionesFeed::paraUsuario($usuario),
        ]);
    }

    public function marcarAlertaLeida(Request $request, int $id): JsonResponse
    {
        $usuario = $this->usuario($request);

        if (! Alerta::query()->whereKey($id)->exists()) {
            abort(404);
        }

        AlertaLeida::query()->updateOrCreate(
            ['alerta_id' => $id, 'usuario_id' => $usuario->id],
            ['leida_en' => now()],
        );

        return response()->json([
            'success' => true,
            'data' => NotificacionesFeed::paraUsuario($usuario),
        ]);
    }

    private function usuario(Request $request): Usuario
    {
        $usuario = $request->user();

        abort_unless($usuario instanceof Usuario, 401);

        return $usuario;
    }
}
