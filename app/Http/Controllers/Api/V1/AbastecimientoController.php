<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\MaterialProveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AbastecimientoController extends Controller
{
    /**
     * Parámetros de abastecimiento de un material por proveedor.
     */
    public function index(Material $material): JsonResponse
    {
        $parametros = MaterialProveedor::query()
            ->with('proveedor:id,ruc,razon_social')
            ->where('material_id', $material->id)
            ->orderByDesc('es_principal')
            ->orderBy('lead_time_dias')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $parametros,
        ]);
    }

    /**
     * Registrar las condiciones de compra de un proveedor para el material.
     */
    public function store(Request $request, Material $material): JsonResponse
    {
        $validated = $this->validar($request, $material);

        $existe = MaterialProveedor::query()
            ->where('material_id', $material->id)
            ->where('proveedor_id', $validated['proveedor_id'])
            ->exists();

        if ($existe) {
            return response()->json([
                'message' => 'El proveedor ya tiene parámetros para este material.',
                'errors' => ['proveedor_id' => ['Ya existe una configuración para ese proveedor.']],
            ], 422);
        }

        $parametro = DB::transaction(function () use ($material, $validated): MaterialProveedor {
            if (($validated['es_principal'] ?? false) === true) {
                $this->quitarPrincipal($material->id);
            }

            return MaterialProveedor::create([
                ...$validated,
                'material_id' => $material->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Parámetros de abastecimiento registrados.',
            'data' => $parametro->load('proveedor:id,ruc,razon_social'),
        ], 201);
    }

    /**
     * Actualizar las condiciones de compra de un proveedor.
     */
    public function update(Request $request, Material $material, int $proveedorId): JsonResponse
    {
        $parametro = MaterialProveedor::query()
            ->where('material_id', $material->id)
            ->where('proveedor_id', $proveedorId)
            ->firstOrFail();

        $validated = $this->validar($request, $material, $proveedorId);

        DB::transaction(function () use ($material, $parametro, $validated): void {
            if (($validated['es_principal'] ?? false) === true) {
                $this->quitarPrincipal($material->id, $parametro->id);
            }

            $parametro->update($validated);
        });

        return response()->json([
            'success' => true,
            'message' => 'Parámetros de abastecimiento actualizados.',
            'data' => $parametro->fresh()->load('proveedor:id,ruc,razon_social'),
        ]);
    }

    /**
     * Desactivar la configuración de un proveedor para el material.
     */
    public function destroy(Material $material, int $proveedorId): JsonResponse
    {
        $parametro = MaterialProveedor::query()
            ->where('material_id', $material->id)
            ->where('proveedor_id', $proveedorId)
            ->firstOrFail();

        $parametro->update(['activo' => false, 'es_principal' => false]);
        $parametro->delete();

        return response()->json([
            'success' => true,
            'message' => 'Parámetros de abastecimiento desactivados.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validar(Request $request, Material $material, ?int $proveedorId = null): array
    {
        $validated = $request->validate([
            'proveedor_id' => $proveedorId === null
                ? 'required|integer|exists:proveedores,id'
                : 'sometimes|integer',
            'lead_time_dias' => 'required|numeric|min:0.1|max:365',
            'costo_pedido' => 'required|numeric|min:0',
            'precio_unitario' => 'nullable|numeric|min:0',
            'es_principal' => 'sometimes|boolean',
            'activo' => 'sometimes|boolean',
        ], [
            'lead_time_dias.required' => 'El lead time es obligatorio para calcular el ROP.',
            'costo_pedido.required' => 'El costo de pedido es obligatorio para calcular el EOQ.',
        ]);

        $validated['precio_unitario'] ??= (float) $material->costo_referencial;
        $validated['es_principal'] ??= false;
        $validated['activo'] ??= true;

        return $validated;
    }

    private function quitarPrincipal(int $materialId, ?int $exceptoId = null): void
    {
        MaterialProveedor::query()
            ->where('material_id', $materialId)
            ->when($exceptoId !== null, fn ($query) => $query->whereKeyNot($exceptoId))
            ->update(['es_principal' => false]);
    }
}
