<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Obra;
use App\Models\Usuario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ContextoController extends Controller
{
    /**
     * Persist the active operational context (obra/almacén) in the session.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'obra_activa_id' => ['nullable', 'integer', 'exists:obras,id'],
            'almacen_activo_id' => ['nullable', 'integer', 'exists:almacenes,id'],
        ]);

        $usuario = $request->user();
        $obraId = $validated['obra_activa_id'] ?? null;
        $almacenId = $validated['almacen_activo_id'] ?? null;

        if ($obraId !== null && $usuario instanceof Usuario && $usuario->obras()->exists()) {
            $permitida = $usuario->obras()->whereKey($obraId)->exists();

            if (! $permitida) {
                throw ValidationException::withMessages([
                    'obra_activa_id' => 'No tiene acceso a la obra seleccionada.',
                ]);
            }
        }

        if ($almacenId !== null) {
            $almacen = Almacen::find($almacenId);

            if ($obraId !== null && $almacen && $almacen->obra_id !== $obraId) {
                throw ValidationException::withMessages([
                    'almacen_activo_id' => 'El almacén no pertenece a la obra activa.',
                ]);
            }

            if ($obraId === null && $almacen) {
                $obraId = $almacen->obra_id;
            }
        }

        if ($obraId !== null && ! Obra::whereKey($obraId)->exists()) {
            throw ValidationException::withMessages([
                'obra_activa_id' => 'La obra seleccionada no existe.',
            ]);
        }

        $request->session()->put('obra_activa_id', $obraId);
        $request->session()->put('almacen_activo_id', $almacenId);

        return redirect()->back();
    }
}
