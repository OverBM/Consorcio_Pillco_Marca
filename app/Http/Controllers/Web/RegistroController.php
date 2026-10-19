<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use App\Models\ParametroSistema;
use App\Models\Rol;
use App\Models\SolicitudAcceso;
use App\Models\Usuario;
use App\Support\Ruc;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

/**
 * Registro público de solicitudes de acceso.
 *
 * Persiste la solicitud con estado pendiente, avisa al responsable por el
 * centro de notificaciones y ofrece un enlace saliente (WhatsApp / correo)
 * para acelerar el contacto. No crea credenciales ni otorga acceso.
 */
class RegistroController extends Controller
{
    /**
     * Roles que solo puede asignar el administrador: nunca se solicitan
     * desde el formulario público.
     *
     * @var array<int, string>
     */
    private const ROLES_BLOQUEADOS = [
        'administrador_sistema',
        'gerente_general',
        'auditor',
        'banco_fideicomitente',
        'supervision_obra_entidad',
    ];

    public function show(): View
    {
        $responsable = $this->responsable();

        return view('registro', [
            'roles' => Rol::query()
                ->whereNotIn('codigo', self::ROLES_BLOQUEADOS)
                ->orderBy('nombre')
                ->get(['codigo', 'nombre']),
            'enviada' => session()->has('solicitud_enviada'),
            'contactoWhatsapp' => $this->enlaceWhatsapp($responsable),
            'contactoEmail' => $this->enlaceEmail($responsable),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'nombre_completo' => ['required', 'string', 'min:5', 'max:150', 'regex:/^[\pL\s.\'-]+$/u'],
            'email' => [
                'required',
                'email',
                'max:160',
                Rule::unique('solicitudes_acceso', 'email')->where('estado', SolicitudAcceso::ESTADO_PENDIENTE),
            ],
            'dni' => ['required', 'digits:8'],
            'telefono' => ['required', 'string', 'min:6', 'max:30', 'regex:/^[0-9+\-\s()]+$/'],
            'empresa' => ['required', 'string', 'min:2', 'max:150'],
            'ruc' => ['required', 'string', new Ruc],
            'cargo' => ['nullable', 'string', 'max:150'],
            'rol_solicitado' => ['required', 'string', Rule::exists('roles', 'codigo'), Rule::notIn(self::ROLES_BLOQUEADOS)],
            'motivo' => ['required', 'string', 'min:10', 'max:1000'],
        ], [
            'nombre_completo.regex' => 'El nombre completo solo puede contener letras y espacios.',
            'nombre_completo.min' => 'Ingresa tus nombres y apellidos completos.',
            'email.unique' => 'Ya existe una solicitud pendiente con este correo.',
            'dni.digits' => 'El DNI debe tener 8 dígitos.',
            'telefono.regex' => 'El teléfono solo puede contener números, espacios y los signos + - ( ).',
            'rol_solicitado.exists' => 'El rol solicitado no es válido.',
            'rol_solicitado.not_in' => 'Ese rol solo puede ser asignado por el administrador del sistema.',
            'motivo.min' => 'Cuéntanos brevemente el motivo de tu solicitud.',
        ]);

        $solicitud = SolicitudAcceso::create([
            ...$datos,
            'estado' => SolicitudAcceso::ESTADO_PENDIENTE,
            'ip' => $request->ip(),
        ]);

        $this->notificarResponsable($solicitud);

        return redirect()
            ->route('registro')
            ->with('solicitud_enviada', true);
    }

    private function responsable(): ?Usuario
    {
        return Usuario::query()
            ->where('activo', true)
            ->whereHas('roles', fn ($query) => $query->where('codigo', 'administrador_sistema'))
            ->orderBy('id')
            ->first();
    }

    private function notificarResponsable(SolicitudAcceso $solicitud): void
    {
        $responsables = Usuario::query()
            ->where('activo', true)
            ->whereHas('roles', fn ($query) => $query->where('codigo', 'administrador_sistema'))
            ->get();

        foreach ($responsables as $responsable) {
            Notificacion::create([
                'usuario_id' => $responsable->id,
                'tipo' => 'solicitud_acceso',
                'titulo' => 'Nueva solicitud de acceso',
                'cuerpo' => "{$solicitud->nombre_completo} ({$solicitud->email}) solicita acceso como {$solicitud->rol_solicitado}.",
                'referencia_tipo' => 'solicitud_acceso',
                'referencia_id' => $solicitud->id,
            ]);
        }
    }

    private function enlaceWhatsapp(?Usuario $responsable): ?string
    {
        $numeroParametro = ParametroSistema::getValor('registro_destino_whatsapp');
        $numero = preg_replace('/\D+/', '', (string) ($numeroParametro ?? ''));

        if ($numero === '') {
            return null;
        }

        $mensaje = rawurlencode('Hola, acabo de enviar una solicitud de acceso al sistema de Consorcio Pillco Marca y quisiera dar seguimiento.');

        return "https://wa.me/{$numero}?text={$mensaje}";
    }

    private function enlaceEmail(?Usuario $responsable): ?string
    {
        $correo = ParametroSistema::getValor('registro_destino_email') ?: $responsable?->email;

        if (! $correo) {
            return null;
        }

        $asunto = rawurlencode('Solicitud de acceso al sistema');
        $cuerpo = rawurlencode("Hola,\n\nAcabo de registrar una solicitud de acceso al sistema de Consorcio Pillco Marca. Quedo atento(a) a su contacto.\n\nGracias.");

        return "mailto:{$correo}?subject={$asunto}&body={$cuerpo}";
    }
}
