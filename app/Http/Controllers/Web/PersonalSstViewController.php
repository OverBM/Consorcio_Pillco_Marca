<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\Auditoria;
use App\Models\Capacitacion;
use App\Models\EppAsignacion;
use App\Models\Incidente;
use App\Models\MedicionAmbiental;
use App\Models\Obra;
use App\Models\ObservacionTecnica;
use App\Models\Planilla;
use App\Models\Residuo;
use App\Models\Usuario;
use Inertia\Inertia;
use Inertia\Response;

class PersonalSstViewController extends Controller
{
    public function asistencia(): Response
    {
        $asistencias = Asistencia::with(['trabajador', 'obra'])->latest()->take(50)->get();
        $obras = Obra::all();

        return Inertia::render('AsistenciaPage', [
            'asistenciasDb' => $asistencias,
            'obrasDb' => $obras,
        ]);
    }

    public function planillas(): Response
    {
        $planillas = Planilla::with(['obra', 'detalles'])->latest()->get();

        return Inertia::render('PlanillasPage', [
            'planillasDb' => $planillas,
        ]);
    }

    public function capacitaciones(): Response
    {
        $capacitaciones = Capacitacion::with('obra')->latest()->get();

        return Inertia::render('CapacitacionesPage', [
            'capacitacionesDb' => $capacitaciones,
        ]);
    }

    public function incidentes(): Response
    {
        $incidentes = Incidente::with('obra')->latest()->get();

        return Inertia::render('IncidentesPage', [
            'incidentesDb' => $incidentes,
        ]);
    }

    public function epp(): Response
    {
        $asignaciones = EppAsignacion::with(['trabajador', 'obra', 'material'])->latest()->get();

        return Inertia::render('EppPage', [
            'asignacionesDb' => $asignaciones,
        ]);
    }

    public function calidad(): Response
    {
        $observaciones = ObservacionTecnica::with('obra')->latest()->get();

        return Inertia::render('CalidadPage', [
            'observacionesDb' => $observaciones,
        ]);
    }

    public function monitoreo(): Response
    {
        $mediciones = MedicionAmbiental::with('obra')->latest()->get();

        return Inertia::render('MonitoreoAmbientalPage', [
            'medicionesDb' => $mediciones,
        ]);
    }

    public function residuos(): Response
    {
        $residuos = Residuo::with(['obra', 'empresaEors'])->latest()->get();

        return Inertia::render('ResiduosPage', [
            'residuosDb' => $residuos,
        ]);
    }

    public function adelantos(): Response
    {
        $obras = Obra::all();

        return Inertia::render('AdelantosPage', [
            'obrasDb' => $obras,
        ]);
    }

    public function presupuesto(): Response
    {
        $obras = Obra::all();

        return Inertia::render('PresupuestoPage', [
            'obrasDb' => $obras,
        ]);
    }

    public function usuarios(): Response
    {
        $usuarios = Usuario::with(['roles', 'obras'])->get()->map(fn ($u) => [
            'id' => (string) $u->id,
            'nombre' => $u->name ?? $u->email,
            'email' => $u->email,
            'rol' => $u->roles->first()?->nombre ?? 'Residente de Obra',
            'obra' => $u->obras->first()?->nombre ?? 'Todas las Obras',
            'estado' => $u->activo ? 'activo' : 'inactivo',
        ]);

        return Inertia::render('UsuariosPage', [
            'usuariosDb' => $usuarios,
        ]);
    }

    public function auditoria(): Response
    {
        $auditoria = Auditoria::with('usuario')->latest()->take(100)->get();

        return Inertia::render('AuditoriaPage', [
            'auditoriaDb' => $auditoria,
        ]);
    }
}
