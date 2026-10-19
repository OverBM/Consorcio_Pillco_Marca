<?php

use App\Models\SolicitudAcceso;
use App\Models\Usuario;
use App\Support\PasswordPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function crearSolicitudPendienteRevision(array $atributos = []): SolicitudAcceso
{
    return SolicitudAcceso::create(array_merge([
        'nombre_completo' => 'María Quispe',
        'email' => 'maria.quispe@example.com',
        'dni' => '87654321',
        'telefono' => '+51 988777666',
        'empresa' => 'Constructora Andina',
        'ruc' => '20100070970',
        'cargo' => 'Asistente técnico',
        'rol_solicitado' => 'residente_obra',
        'motivo' => 'Requiero acceso para registrar avances de obra.',
        'estado' => SolicitudAcceso::ESTADO_PENDIENTE,
    ], $atributos));
}

test('aprobar crea el usuario con el rol solicitado y devuelve una contraseña temporal válida', function () {
    $admin = $this->usuarioConRol('administrador_sistema');
    $solicitud = crearSolicitudPendienteRevision();

    $respuesta = $this->actingAs($admin)
        ->postJson("/api/v1/solicitudes-acceso/{$solicitud->id}/aprobar", ['notas_revision' => 'Verificado por RRHH.'])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->json();

    $claveTemporal = $respuesta['data']['password_temporal'];
    expect($claveTemporal)->toBeString()->not->toBeEmpty()
        ->and(PasswordPolicy::failures($claveTemporal))->toBe([]);

    $usuario = Usuario::where('email', 'maria.quispe@example.com')->firstOrFail();

    expect($usuario->activo)->toBeTrue()
        ->and($usuario->tieneRol('residente_obra'))->toBeTrue()
        ->and(Hash::check($claveTemporal, $usuario->password))->toBeTrue();

    $solicitud->refresh();
    expect($solicitud->estado)->toBe(SolicitudAcceso::ESTADO_APROBADA)
        ->and($solicitud->revisado_por)->toBe($admin->id)
        ->and($solicitud->revisado_en)->not->toBeNull()
        ->and($solicitud->notas_revision)->toBe('Verificado por RRHH.');
});

test('solo el administrador puede revisar solicitudes de acceso', function () {
    $usuario = $this->usuarioConRol('obrero_obra');
    $solicitud = crearSolicitudPendienteRevision();

    $this->actingAs($usuario)
        ->postJson("/api/v1/solicitudes-acceso/{$solicitud->id}/aprobar")
        ->assertForbidden();

    expect($solicitud->fresh()->estado)->toBe(SolicitudAcceso::ESTADO_PENDIENTE);
});

test('aprobar una solicitud cuyo correo ya tiene cuenta devuelve 422', function () {
    $admin = $this->usuarioConRol('administrador_sistema');

    Usuario::create([
        'name' => 'Cuenta Existente',
        'email' => 'maria.quispe@example.com',
        'password' => 'password123',
        'activo' => true,
    ]);

    $solicitud = crearSolicitudPendienteRevision();

    $this->actingAs($admin)
        ->postJson("/api/v1/solicitudes-acceso/{$solicitud->id}/aprobar")
        ->assertStatus(422)
        ->assertJsonPath('success', false);

    expect($solicitud->fresh()->estado)->toBe(SolicitudAcceso::ESTADO_PENDIENTE);
});

test('aprobar una solicitud cuyo DNI ya está registrado devuelve 422', function () {
    $admin = $this->usuarioConRol('administrador_sistema');

    Usuario::create([
        'name' => 'Cuenta Existente',
        'email' => 'otra.cuenta@example.com',
        'dni' => '87654321',
        'password' => 'password123',
        'activo' => true,
    ]);

    $solicitud = crearSolicitudPendienteRevision();

    $this->actingAs($admin)
        ->postJson("/api/v1/solicitudes-acceso/{$solicitud->id}/aprobar")
        ->assertStatus(422)
        ->assertJsonPath('success', false);

    expect($solicitud->fresh()->estado)->toBe(SolicitudAcceso::ESTADO_PENDIENTE);
});

test('rechazar marca la solicitud sin crear la cuenta', function () {
    $admin = $this->usuarioConRol('administrador_sistema');
    $solicitud = crearSolicitudPendienteRevision();

    $this->actingAs($admin)
        ->postJson("/api/v1/solicitudes-acceso/{$solicitud->id}/rechazar", ['notas_revision' => 'Documentación incompleta.'])
        ->assertOk()
        ->assertJsonPath('success', true);

    $solicitud->refresh();
    expect($solicitud->estado)->toBe(SolicitudAcceso::ESTADO_RECHAZADA)
        ->and($solicitud->notas_revision)->toBe('Documentación incompleta.')
        ->and(Usuario::where('email', 'maria.quispe@example.com')->exists())->toBeFalse();
});

test('una solicitud ya revisada no puede aprobarse de nuevo', function () {
    $admin = $this->usuarioConRol('administrador_sistema');
    $solicitud = crearSolicitudPendienteRevision(['estado' => SolicitudAcceso::ESTADO_RECHAZADA]);

    $this->actingAs($admin)
        ->postJson("/api/v1/solicitudes-acceso/{$solicitud->id}/aprobar")
        ->assertStatus(422)
        ->assertJsonPath('success', false);

    expect(Usuario::where('email', 'maria.quispe@example.com')->exists())->toBeFalse();
});
