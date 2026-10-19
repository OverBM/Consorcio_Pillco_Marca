<?php

namespace Tests;

use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Autentica al usuario garantizando el rol indicado (por defecto, administrador).
     */
    protected function actingAsConRol(Authenticatable $usuario, string $codigoRol = 'administrador_sistema'): static
    {
        if ($usuario instanceof Usuario) {
            $this->asignarRol($usuario, $codigoRol);
        }

        return $this->actingAs($usuario);
    }

    /**
     * Sincroniza el rol indicado sobre el usuario, sembrando permisos si hace falta.
     */
    protected function asignarRol(Usuario $usuario, string $codigoRol = 'administrador_sistema'): Usuario
    {
        $this->seed(PermisoSeeder::class);

        $rol = Rol::query()->where('codigo', $codigoRol)->firstOrFail();

        $usuario->roles()->syncWithoutDetaching([$rol->id]);
        $usuario->unsetRelation('roles');

        return $usuario;
    }

    /**
     * Crea y autentica un usuario con el rol indicado.
     */
    protected function usuarioConRol(string $codigoRol = 'administrador_sistema'): Usuario
    {
        $usuario = Usuario::create([
            'name' => 'Usuario '.$codigoRol,
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'activo' => true,
        ]);

        $this->asignarRol($usuario, $codigoRol);

        return $usuario;
    }
}
