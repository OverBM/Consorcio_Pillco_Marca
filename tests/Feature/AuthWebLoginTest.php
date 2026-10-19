<?php

use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function crearUsuarioLogin(string $password = 'Correcta1!'): Usuario
{
    return Usuario::create([
        'name' => 'Usuario Login',
        'email' => 'login@pillcomarca.pe',
        'password' => $password,
        'activo' => true,
    ]);
}

test('rechaza las contraseñas fijas por defecto que no coinciden con el hash almacenado', function (string $fija) {
    $usuario = crearUsuarioLogin();

    $this->post('/login', [
        'email' => $usuario->email,
        'password' => $fija,
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
})->with(['password123', '12345678']);

test('autentica con la contraseña correcta y registra el último acceso', function () {
    $usuario = crearUsuarioLogin('Correcta1!');

    $this->post('/login', [
        'email' => $usuario->email,
        'password' => 'Correcta1!',
    ])->assertRedirect('/panel');

    $this->assertAuthenticatedAs($usuario);
    expect($usuario->fresh()->ultimo_acceso_en)->not->toBeNull();
});

test('bloquea la cuenta tras superar el número de intentos fallidos configurado', function () {
    config(['auth.policy.max_attempts' => 3, 'auth.policy.lockout_minutes' => 10]);

    $usuario = crearUsuarioLogin('Correcta1!');

    foreach (range(1, 3) as $intento) {
        $this->post('/login', [
            'email' => $usuario->email,
            'password' => 'incorrecta',
        ]);
    }

    expect($usuario->fresh()->bloqueado_hasta)->not->toBeNull();

    // Incluso con la contraseña correcta, la cuenta queda bloqueada.
    $this->post('/login', [
        'email' => $usuario->email,
        'password' => 'Correcta1!',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});
