<?php

use App\Models\Usuario;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

beforeEach(function () {
    Route::middleware(['api'])->get('/api/v1/_test_identidad', function (Request $request) {
        return response()->json(['id' => $request->user()?->id]);
    });
});

function crearUsuarioAutenticable(): Usuario
{
    return Usuario::create([
        'name' => 'Ing. Residente Prueba',
        'email' => 'residente.'.Str::random(6).'@pillcomarca.pe',
        'password' => Hash::make('secreto123'),
        'dni' => (string) random_int(10000000, 99999999),
        'activo' => true,
    ]);
}

test('un Bearer válido resuelve el usuario autenticado', function () {
    $usuario = crearUsuarioAutenticable();
    $token = Str::random(60);
    $usuario->forceFill(['remember_token' => $token])->save();

    $response = $this->getJson('/api/v1/_test_identidad', [
        'Authorization' => 'Bearer '.$token,
    ]);

    $response->assertOk()->assertJson(['id' => $usuario->id]);
});

test('un Bearer inválido deja la identidad nula y no bloquea la llamada', function () {
    $response = $this->getJson('/api/v1/_test_identidad', [
        'Authorization' => 'Bearer token-inexistente',
    ]);

    $response->assertOk()->assertJson(['id' => null]);
});

test('la sesión web resuelve el usuario autenticado', function () {
    $usuario = crearUsuarioAutenticable();

    $response = $this->actingAsConRol($usuario)->getJson('/api/v1/_test_identidad');

    $response->assertOk()->assertJson(['id' => $usuario->id]);
});

test('sin credenciales la identidad es nula y la llamada sigue funcionando', function () {
    $response = $this->getJson('/api/v1/_test_identidad');

    $response->assertOk()->assertJson(['id' => null]);
});

test('el grupo api descifra la cookie de sesión antes de iniciarla (EncryptCookies antes de StartSession)', function () {
    $api = app(Kernel::class)->getMiddlewareGroups()['api'];

    $encrypt = array_search(EncryptCookies::class, $api, true);
    $start = array_search(StartSession::class, $api, true);

    expect($encrypt)->not->toBeFalse()
        ->and($start)->not->toBeFalse()
        ->and($encrypt)->toBeLessThan($start);
});
