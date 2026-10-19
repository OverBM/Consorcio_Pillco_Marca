<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Usuario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class AuthWebController extends Controller
{
    public function showLogin()
    {
        if (Auth::check() || session()->has('user_id')) {
            return redirect()->route('panel');
        }

        return view('login');
    }

    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $usuario = Usuario::where('email', $request->email)->first();

        if ($usuario && $usuario->bloqueado_hasta && $usuario->bloqueado_hasta->isFuture()) {
            return back()->withErrors([
                'email' => 'La cuenta está bloqueada temporalmente por intentos fallidos. Intenta nuevamente más tarde.',
            ])->withInput($request->only('email'));
        }

        // Autenticar únicamente contra el hash almacenado del usuario.
        if ($usuario && $usuario->activo && Hash::check($request->password, $usuario->password)) {
            $usuario->forceFill([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null,
                'ultimo_acceso_en' => now(),
            ])->save();

            Auth::login($usuario);

            // Guardar usuario y rol en sesión
            session([
                'user_id' => $usuario->id,
                'user_name' => $usuario->nombre_completo,
                'user_email' => $usuario->email,
                'user_role' => $usuario->roles()->first()?->codigo ?? 'residente_obra',
            ]);

            Auditoria::registrar('login', 'usuarios', $usuario->id, null, ['email' => $usuario->email]);

            return redirect()->intended(route('panel'))->with('success', 'Bienvenido a ObraFlow CPM');
        }

        $this->registrarIntentoFallido($usuario);

        return back()->withErrors([
            'email' => 'Las credenciales ingresadas son incorrectas o no cuenta con autorización para acceder.',
        ])->withInput($request->only('email'));
    }

    /**
     * Incrementa el contador de intentos fallidos y bloquea la cuenta
     * cuando supera el umbral configurado.
     */
    private function registrarIntentoFallido(?Usuario $usuario): void
    {
        if (! $usuario) {
            return;
        }

        $maxIntentos = (int) config('auth.policy.max_attempts', 5);
        $minutosBloqueo = (int) config('auth.policy.lockout_minutes', 15);

        $intentos = $usuario->intentos_fallidos + 1;

        if ($intentos >= $maxIntentos) {
            $usuario->forceFill([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => now()->addMinutes($minutosBloqueo),
            ])->save();

            return;
        }

        $usuario->forceFill(['intentos_fallidos' => $intentos])->save();
    }

    public function logout(Request $request): Response
    {
        $usuarioId = Auth::id();

        if ($usuarioId !== null) {
            Auditoria::registrar('logout', 'usuarios', (int) $usuarioId);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Inertia::location(route('home'));
    }
}
