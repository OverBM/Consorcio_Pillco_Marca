<?php

namespace Database\Seeders;

use App\Models\Despacho;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Datos de demostración para la capa analítica y el tracking:
 * lead times, 120 días de demanda, stock realista y posiciones de despacho.
 *
 * Es idempotente: no duplica kardex ni posiciones si ya existen.
 */
class AnaliticaDemoSeeder extends Seeder
{
    /**
     * Demanda base diaria por código de material.
     *
     * @var array<string, float>
     */
    private const DEMANDA_BASE = [
        'MAT-CEM-01' => 18.0,
        'MAT-ACE-01' => 10.0,
        'MAT-AGR-01' => 8.0,
        'MAT-EPP-01' => 2.0,
    ];

    public function run(): void
    {
        $materiales = DB::table('materiales')->where('activo', true)->get();
        $almacenes = DB::table('almacenes')->where('activo', true)->orderBy('id')->get();
        $proveedores = DB::table('proveedores')->where('activo', true)->orderBy('id')->get();

        if ($materiales->isEmpty() || $almacenes->isEmpty()) {
            $this->command?->warn('No hay materiales o almacenes para sembrar analítica.');

            return;
        }

        $usuarioId = DB::table('usuarios')->orderBy('id')->value('id');
        $proveedor = $proveedores->first();

        foreach ($materiales as $material) {
            $base = self::DEMANDA_BASE[$material->codigo] ?? 5.0;

            if ($proveedor !== null) {
                DB::table('material_proveedor')->updateOrInsert(
                    [
                        'material_id' => $material->id,
                        'proveedor_id' => $proveedor->id,
                    ],
                    [
                        'lead_time_dias' => 5 + ($material->id % 8),
                        'costo_pedido' => 40 + ($material->id * 17),
                        'precio_unitario' => max((float) $material->costo_referencial, 1),
                        'es_principal' => true,
                        'activo' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }

            foreach ($almacenes as $almacen) {
                $existeStock = DB::table('stock_almacen')
                    ->where('almacen_id', $almacen->id)
                    ->where('material_id', $material->id)
                    ->exists();

                if (! $existeStock) {
                    DB::table('stock_almacen')->insert([
                        'almacen_id' => $almacen->id,
                        'material_id' => $material->id,
                        'cantidad' => round($base * 25, 3),
                        'cantidad_reservada' => 0,
                        'stock_minimo' => round($base * 2, 3),
                        'stock_seguridad' => round($base * 3, 3),
                        'punto_reorden' => round($base * 4, 3),
                        'stock_maximo' => round($base * 40, 3),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $this->sembrarDemanda(
                    (int) $almacen->id,
                    (int) $material->id,
                    $base,
                    $usuarioId !== null ? (int) $usuarioId : null,
                );
            }
        }

        $this->sembrarPosiciones();
    }

    private function sembrarDemanda(
        int $almacenId,
        int $materialId,
        float $base,
        ?int $usuarioId,
    ): void {
        $yaExiste = DB::table('kardex')
            ->where('almacen_id', $almacenId)
            ->where('material_id', $materialId)
            ->where('documento_tipo', 'demo_analitica')
            ->exists();

        if ($yaExiste) {
            return;
        }

        $filas = [];
        $saldo = $base * 35;
        $hoy = Carbon::today();

        for ($dia = 119; $dia >= 0; $dia--) {
            $fecha = $hoy->copy()->subDays($dia)->setTime(12, 0);
            $diaSemana = (int) $fecha->dayOfWeek;
            $factorDia = match ($diaSemana) {
                0 => 0.25,
                6 => 0.7,
                default => 1.0,
            };
            $variacion = 1 + 0.18 * sin(($dia + $materialId * 3) * 0.9);
            $cantidad = round(max(0.0, $base * $factorDia * $variacion), 3);

            if ($cantidad <= 0) {
                continue;
            }

            $saldo = max(0.0, $saldo - $cantidad);

            $filas[] = [
                'almacen_id' => $almacenId,
                'material_id' => $materialId,
                'tipo_movimiento' => 'salida_consumo',
                'cantidad' => -$cantidad,
                'saldo_resultante' => round($saldo, 3),
                'costo_unitario' => null,
                'documento_tipo' => 'demo_analitica',
                'documento_id' => null,
                'usuario_id' => $usuarioId,
                'observacion' => 'Demanda demo para analítica',
                'created_at' => $fecha,
            ];
        }

        foreach (array_chunk($filas, 100) as $lote) {
            DB::table('kardex')->insert($lote);
        }
    }

    private function sembrarPosiciones(): void
    {
        $despachos = Despacho::query()
            ->with(['transferencia.almacenOrigen', 'transferencia.almacenDestino'])
            ->whereHas('transferencia', fn ($query) => $query->where('estado', 'en_transito'))
            ->get();

        foreach ($despachos as $despacho) {
            if ($despacho->posiciones()->exists()) {
                continue;
            }

            $origen = $despacho->transferencia?->almacenOrigen;
            $destino = $despacho->transferencia?->almacenDestino;

            if ($origen?->latitud === null || $origen?->longitud === null
                || $destino?->latitud === null || $destino?->longitud === null) {
                continue;
            }

            for ($paso = 1; $paso <= 8; $paso++) {
                $avance = $paso / 9;
                $lat = (float) $origen->latitud + ((float) $destino->latitud - (float) $origen->latitud) * $avance;
                $lng = (float) $origen->longitud + ((float) $destino->longitud - (float) $origen->longitud) * $avance;
                $capturada = now()->subMinutes((9 - $paso) * 6);

                $id = DB::table('despacho_posiciones')->insertGetId([
                    'despacho_id' => $despacho->id,
                    'latitud' => round($lat, 7),
                    'longitud' => round($lng, 7),
                    'precision_m' => 8,
                    'velocidad_kmh' => 28 + ($paso % 3) * 6,
                    'rumbo' => 90,
                    'origen' => 'demo',
                    'uuid' => (string) Str::uuid(),
                    'capturada_en' => $capturada,
                    'recibida_en' => $capturada,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (DB::getDriverName() === 'pgsql') {
                    DB::update(
                        'UPDATE despacho_posiciones SET ubicacion = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?',
                        [round($lng, 7), round($lat, 7), $id],
                    );
                }
            }
        }
    }
}
