<?php

use App\Support\EstadoCatalogo;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (EstadoCatalogo::todas() as $clave => $valores) {
            if ($clave === 'solicitudes.estado') {
                continue;
            }

            [$tabla, $columna] = explode('.', $clave, 2);
            $constraint = 'chk_'.str_replace('.', '_', $clave);

            if ($this->existe($constraint)) {
                continue;
            }

            $lista = collect($valores)
                ->map(fn (string $valor): string => "'".str_replace("'", "''", $valor)."'")
                ->implode(', ');

            DB::statement(sprintf(
                'ALTER TABLE %s ADD CONSTRAINT %s CHECK (%s IN (%s)) NOT VALID',
                $this->ident($tabla),
                $this->ident($constraint),
                $this->ident($columna),
                $lista,
            ));

            DB::statement(sprintf(
                'ALTER TABLE %s VALIDATE CONSTRAINT %s',
                $this->ident($tabla),
                $this->ident($constraint),
            ));
        }

        if (! $this->existe('chk_solicitudes_tipo_estado')) {
            DB::statement("
                ALTER TABLE solicitudes ADD CONSTRAINT chk_solicitudes_tipo_estado CHECK (
                    (tipo = 'almacen' AND estado IN ('registrada', 'atendida', 'anulada')) OR
                    (tipo = 'compra' AND estado IN ('borrador', 'solicitado', 'aprobado', 'rechazado', 'atendido', 'cerrado'))
                ) NOT VALID
            ");
            DB::statement('ALTER TABLE solicitudes VALIDATE CONSTRAINT chk_solicitudes_tipo_estado');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (array_keys(EstadoCatalogo::todas()) as $clave) {
            if ($clave === 'solicitudes.estado') {
                continue;
            }

            [$tabla] = explode('.', $clave, 2);
            DB::statement(sprintf(
                'ALTER TABLE IF EXISTS %s DROP CONSTRAINT IF EXISTS %s',
                $this->ident($tabla),
                $this->ident('chk_'.str_replace('.', '_', $clave)),
            ));
        }

        DB::statement('ALTER TABLE IF EXISTS solicitudes DROP CONSTRAINT IF EXISTS chk_solicitudes_tipo_estado');
    }

    private function existe(string $constraint): bool
    {
        return DB::selectOne(
            'SELECT 1 FROM pg_constraint WHERE conname = ? AND connamespace = ?::regnamespace',
            [$constraint, 'public'],
        ) !== null;
    }

    private function ident(string $ident): string
    {
        return '"'.str_replace('"', '""', $ident).'"';
    }
};
