<?php

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

test('permite el inicio de sesión con credenciales válidas y retorna token bearer', function () {
    $rol = Rol::firstOrCreate(
        ['codigo' => 'residente_obra'],
        ['nombre' => 'Residente de Obra', 'es_externo' => false]
    );

    $usuario = Usuario::create([
        'name' => 'Ing. Bradley Residente',
        'email' => 'residente@pillcomarca.pe',
        'password' => Hash::make('secreto123'),
        'dni' => '10203040',
        'activo' => true,
    ]);

    $usuario->roles()->attach($rol->id);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'residente@pillcomarca.pe',
        'password' => 'secreto123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'mensaje',
            'token',
            'usuario' => [
                'id',
                'name',
                'email',
                'roles',
                'permisos',
            ],
        ]);
});

test('rechaza el inicio de sesión con contraseña incorrecta', function () {
    $usuario = Usuario::create([
        'name' => 'Usuario Test',
        'email' => 'test@pillcomarca.pe',
        'password' => Hash::make('password_valido'),
        'activo' => true,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'test@pillcomarca.pe',
        'password' => 'password_invalido',
    ]);

    $response->assertStatus(401)
        ->assertJson([
            'codigo' => 'CREDENCIALES_INVALIDAS',
        ]);
});
