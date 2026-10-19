<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\SolicitudAcceso;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Bandeja de solicitudes de acceso pendientes para su revisión.
 */
class SolicitudesAccesoController extends Controller
{
    public function index(Request $request): Response
    {
        $solicitudes = SolicitudAcceso::query()
            ->with('revisor:id,name')
            ->latest()
            ->get()
            ->map(fn (SolicitudAcceso $solicitud): array => [
                'id' => (string) $solicitud->id,
                'nombre_completo' => $solicitud->nombre_completo,
                'email' => $solicitud->email,
                'dni' => $solicitud->dni,
                'telefono' => $solicitud->telefono,
                'empresa' => $solicitud->empresa,
                'ruc' => $solicitud->ruc,
                'cargo' => $solicitud->cargo,
                'rol_solicitado' => $solicitud->rol_solicitado,
                'motivo' => $solicitud->motivo,
                'estado' => $solicitud->estado,
                'notas_revision' => $solicitud->notas_revision,
                'revisado_por' => $solicitud->revisor?->name,
                'revisado_en' => $solicitud->revisado_en?->format('d/m/Y H:i'),
                'creada_en' => $solicitud->created_at?->format('d/m/Y H:i'),
            ])
            ->values();

        return Inertia::render('SolicitudesAccesoPage', [
            'solicitudesDb' => $solicitudes,
        ]);
    }
}
