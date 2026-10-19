<?php

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function crearResponsableAprobador(): Usuario
{
    $rol = Rol::create(['codigo' => 'administrador_sistema', 'nombre' => 'Administrador del Sistema']);

    $responsable = Usuario::create([
        'name' => 'Admin Sistema',
        'email' => 'admin@pillcomarca.pe',
        'password' => 'Admin1234!',
        'activo' => true,
    ]);

    $responsable->roles()->attach($rol->id);

    return $responsable;
}

function crearRolSolicitado(): Rol
{
    return Rol::create(['codigo' => 'residente_obra', 'nombre' => 'Residente de Obra']);
}

function datosSolicitudValidos(): array
{
    return [
        'nombre_completo' => 'Juan Pérez',
        'email' => 'juan.perez@example.com',
        'dni' => '12345678',
        'telefono' => '+51 999888777',
        'empresa' => 'Constructora Andina',
        'ruc' => '20100070970',
        'cargo' => 'Ingeniero de campo',
        'rol_solicitado' => 'residente_obra',
        'motivo' => 'Necesito registrar avances de obra en el sistema.',
    ];
}

test('una solicitud válida se persiste pendiente, notifica al responsable y no crea usuario', function () {
    $responsable = crearResponsableAprobador();
    crearRolSolicitado();

    $this->post('/registro', datosSolicitudValidos())
        ->assertRedirect('/registro')
        ->assertSessionHas('solicitud_enviada');

    $this->assertDatabaseHas('solicitudes_acceso', [
        'email' => 'juan.perez@example.com',
        'rol_solicitado' => 'residente_obra',
        'estado' => 'pendiente',
    ]);

    $this->assertDatabaseHas('notificaciones', [
        'usuario_id' => $responsable->id,
        'tipo' => 'solicitud_acceso',
    ]);

    // Sin acceso automático: no se crea una credencial nueva.
    $this->assertDatabaseCount('usuarios', 1);
    $this->assertGuest();
});

test('un envío incompleto no registra la solicitud y devuelve errores por campo', function () {
    crearRolSolicitado();

    $this->from('/registro')->post('/registro', [
        'nombre_completo' => '',
        'email' => 'no-es-un-correo',
        'dni' => '123',
        'telefono' => '',
        'empresa' => '',
        'ruc' => '123',
        'rol_solicitado' => 'rol-inexistente',
        'motivo' => 'corto',
    ])->assertRedirect('/registro')->assertSessionHasErrors([
        'nombre_completo',
        'email',
        'dni',
        'telefono',
        'empresa',
        'ruc',
        'rol_solicitado',
        'motivo',
    ]);

    $this->assertDatabaseCount('solicitudes_acceso', 0);
});

test('un RUC con dígito verificador incorrecto no registra la solicitud', function () {
    crearRolSolicitado();

    $datos = datosSolicitudValidos();
    $datos['ruc'] = '20100070971';

    $this->from('/registro')->post('/registro', $datos)
        ->assertRedirect('/registro')
        ->assertSessionHasErrors('ruc');

    $this->assertDatabaseCount('solicitudes_acceso', 0);
});

test('una segunda solicitud pendiente con el mismo correo se rechaza', function () {
    crearRolSolicitado();

    $this->post('/registro', datosSolicitudValidos())->assertRedirect('/registro');

    $this->from('/registro')->post('/registro', datosSolicitudValidos())
        ->assertRedirect('/registro')
        ->assertSessionHasErrors('email');

    $this->assertDatabaseCount('solicitudes_acceso', 1);
});

test('el formulario público no ofrece roles de administración ni dirección', function () {
    crearResponsableAprobador();
    crearRolSolicitado();

    $this->get('/registro')
        ->assertOk()
        ->assertViewHas('roles', fn ($roles) => $roles->contains('codigo', 'residente_obra')
            && ! $roles->contains('codigo', 'administrador_sistema'));
});

test('el formulario público expone las reglas de validación en vivo por campo', function () {
    crearResponsableAprobador();
    crearRolSolicitado();

    $this->get('/registro')
        ->assertOk()
        ->assertSee('src="/registro.js"', false)
        ->assertSee('class="field-policy" data-policy="nombre_completo"', false)
        ->assertSee('data-policy="ruc"', false)
        ->assertSee('data-rule="verificador"', false)
        ->assertSee('data-policy="motivo"', false);
});

test('una solicitud con rol de administración no se registra', function () {
    crearResponsableAprobador();

    $datos = datosSolicitudValidos();
    $datos['rol_solicitado'] = 'administrador_sistema';

    $this->from('/registro')->post('/registro', $datos)
        ->assertRedirect('/registro')
        ->assertSessionHasErrors('rol_solicitado');

    $this->assertDatabaseCount('solicitudes_acceso', 0);
});

test('la bandeja del responsable lista las solicitudes recibidas', function () {
    $responsable = crearResponsableAprobador();
    crearRolSolicitado();

    $this->post('/registro', datosSolicitudValidos());

    $this->actingAsConRol($responsable)
        ->get('/admin/solicitudes')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('SolicitudesAccesoPage')
            ->has('solicitudesDb', 1)
            ->where('solicitudesDb.0.email', 'juan.perez@example.com')
            ->where('solicitudesDb.0.estado', 'pendiente'));
});
