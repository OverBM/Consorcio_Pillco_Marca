<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProveedorController extends Controller
{
    /**
     * Listar directorio de proveedores homologados y activos.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Proveedor::where('activo', true)->orderBy('razon_social');

        if ($request->filled('q')) {
            $term = '%'.$request->input('q').'%';
            $query->where(function ($q) use ($term) {
                $q->where('razon_social', 'like', $term)
                    ->orWhere('ruc', 'like', $term);
            });
        }

        $proveedores = $query->paginate($request->integer('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $proveedores->items(),
            'meta' => [
                'current_page' => $proveedores->currentPage(),
                'last_page' => $proveedores->lastPage(),
                'total' => $proveedores->total(),
            ],
        ]);
    }

    /**
     * Registrar nuevo proveedor en el directorio.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ruc' => 'required|string|size:11|unique:proveedores,ruc',
            'razon_social' => 'required|string|max:200',
            'contacto' => 'nullable|string|max:120',
            'telefono' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:160',
            'direccion' => 'nullable|string|max:240',
            'calificacion' => 'nullable|numeric|between:0,5',
        ]);

        $proveedor = Proveedor::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Proveedor registrado exitosamente.',
            'data' => $proveedor,
        ], 201);
    }
}
