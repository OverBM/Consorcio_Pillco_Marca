<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\Auditoria;
use App\Models\Capacitacion;
use App\Models\EmpresaEors;
use App\Models\EppAsignacion;
use App\Models\Incidente;
use App\Models\IndicadorAmbiental;
use App\Models\MedicionAmbiental;
use App\Models\Obra;
use App\Models\ObservacionTecnica;
use App\Models\Planilla;
use App\Models\Residuo;
use App\Models\Rol;
use App\Models\Trabajador;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PersonalSstViewController extends Controller
{
    /**
     * Agrupación de tablas auditadas por módulo funcional del sistema.
     *
     * @var array<string, array{nombre: string, entidades: array<int, string>}>
     */
    private const MODULOS_AUDITORIA = [
        'almacen_logistica' => [
            'nombre' => 'Almacén y Logística',
            'entidades' => ['almacenes', 'stock_almacen', 'recepciones', 'transferencias', 'materiales'],
        ],
        'pmi' => [
            'nombre' => 'Gestión de Proyectos (PMI/PMU)',
            'entidades' => ['obras', 'obra_fases', 'fase_requisitos', 'fase_criterios', 'hitos', 'partidas', 'valorizaciones'],
        ],
        'compras' => [
            'nombre' => 'Compras y Proveedores',
            'entidades' => ['ordenes_compra', 'requerimientos'],
        ],
        'administracion' => [
            'nombre' => 'Administración',
            'entidades' => ['roles', 'solicitudes_acceso', 'parametros_sistema'],
        ],
        'seguridad' => [
            'nombre' => 'Seguridad y Sesiones',
            'entidades' => ['usuarios', 'sesion'],
        ],
    ];

    public function asistencia(): Response
    {
        $asistencias = Asistencia::with(['trabajador', 'obra'])->latest()->take(50)->get();
        $obras = Obra::all();
        $trabajadores = Trabajador::where('activo', true)->orderBy('nombres')->get(['id', 'nombres', 'cargo', 'obra_id']);

        return Inertia::render('AsistenciaPage', [
            'asistenciasDb' => $asistencias,
            'obrasDb' => $obras,
            'trabajadoresDb' => $trabajadores,
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
        $trabajadores = Trabajador::where('activo', true)->orderBy('nombres')->get(['id', 'nombres', 'cargo', 'obra_id']);

        return Inertia::render('IncidentesPage', [
            'incidentesDb' => $incidentes,
            'trabajadoresDb' => $trabajadores,
        ]);
    }

    public function epp(): Response
    {
        $asignaciones = EppAsignacion::with(['trabajador', 'material', 'almacen'])->orderBy('entregado_en', 'desc')->get();
        $trabajadores = Trabajador::where('activo', true)->orderBy('nombres')->get(['id', 'nombres', 'cargo', 'obra_id']);

        return Inertia::render('EppPage', [
            'asignacionesDb' => $asignaciones,
            'trabajadoresDb' => $trabajadores,
        ]);
    }

    public function calidad(): Response
    {
        $observaciones = ObservacionTecnica::with(['obra', 'responsable', 'evidencias'])->orderByDesc('id')->get();

        return Inertia::render('CalidadPage', [
            'observacionesDb' => $observaciones,
        ]);
    }

    public function monitoreo(): Response
    {
        $mediciones = MedicionAmbiental::with(['obra', 'indicador'])->orderByDesc('id')->get();
        $indicadores = IndicadorAmbiental::orderBy('nombre')->get();

        return Inertia::render('MonitoreoAmbientalPage', [
            'medicionesDb' => $mediciones,
            'indicadoresDb' => $indicadores,
        ]);
    }

    public function residuos(): Response
    {
        $residuos = Residuo::with(['obra', 'almacen', 'material', 'eors'])->orderByDesc('id')->get();
        $eors = EmpresaEors::orderBy('razon_social')->get();

        return Inertia::render('ResiduosPage', [
            'residuosDb' => $residuos,
            'eorsDb' => $eors,
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
        $usuarios = Usuario::with(['roles', 'obras'])->orderBy('name')->get()->map(fn ($u) => [
            'id' => (string) $u->id,
            'nombre' => $u->name ?? $u->email,
            'email' => $u->email,
            'dni' => $u->dni,
            'telefono' => $u->telefono,
            'rol' => $u->roles->first()?->nombre ?? 'Sin rol asignado',
            'rol_codigo' => $u->roles->first()?->codigo,
            'obra' => $u->obras->first()?->nombre ?? 'Todas las Obras',
            'obra_id' => $u->obras->first()?->id,
            'activo' => (bool) $u->activo,
            'estado' => $u->activo ? 'activo' : 'inactivo',
        ]);

        $roles = Rol::orderBy('nombre')->get(['id', 'codigo', 'nombre'])->map(fn ($rol) => [
            'codigo' => $rol->codigo,
            'nombre' => $rol->nombre,
        ]);

        return Inertia::render('UsuariosPage', [
            'usuariosDb' => Inertia::defer(fn () => $usuarios),
            'rolesDb' => $roles,
        ]);
    }

    /**
     * Bitácora de auditoría con filtros por usuario/módulo y paginación.
     */
    public function auditoria(Request $request): Response
    {
        $usuarioId = $request->string('usuario_id')->toString();
        $modulo = $request->string('modulo')->toString();
        $entidades = self::MODULOS_AUDITORIA[$modulo]['entidades'] ?? null;

        $registros = Auditoria::with('usuario')
            ->when($usuarioId !== '', fn ($query) => $query->where('usuario_id', $usuarioId))
            ->when($entidades !== null, fn ($query) => $query->whereIn('entidad', $entidades))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Auditoria $registro): array => [
                'id' => $registro->id,
                'accion' => $registro->accion,
                'entidad' => $registro->entidad,
                'entidad_id' => $registro->entidad_id,
                'ip' => $registro->ip,
                'antes' => $registro->antes,
                'despues' => $registro->despues,
                'created_at' => $registro->created_at?->toIso8601String(),
                'usuario' => $registro->usuario ? [
                    'name' => $registro->usuario->name,
                    'email' => $registro->usuario->email,
                ] : null,
            ]);

        $usuarios = Usuario::query()
            ->whereIn('id', Auditoria::query()->whereNotNull('usuario_id')->select('usuario_id'))
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (Usuario $usuario): array => [
                'id' => (string) $usuario->id,
                'nombre' => $usuario->name ?? $usuario->email,
                'email' => $usuario->email,
            ])
            ->values();

        return Inertia::render('AuditoriaPage', [
            'auditoriaDb' => $registros,
            'usuariosDb' => $usuarios,
            'modulosDb' => collect(self::MODULOS_AUDITORIA)
                ->map(fn (array $modulo, string $codigo): array => ['codigo' => $codigo, 'nombre' => $modulo['nombre']])
                ->values(),
            'filtros' => ['usuario_id' => $usuarioId, 'modulo' => $modulo],
        ]);
    }
}
