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

        $tablas = DB::select("
            SELECT c.relname AS table_name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
              AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
            ORDER BY c.relname
        ");

        foreach ($tablas as $tabla) {
            DB::statement(sprintf(
                'COMMENT ON TABLE %s IS %s',
                $this->ident($tabla->table_name),
                $this->literal('Tabla del modelo consolidado Consorcio Pillco Marca'),
            ));
        }

        foreach (EstadoCatalogo::todas() as $clave => $valores) {
            [$tabla, $columna] = explode('.', $clave, 2);

            $existe = DB::selectOne(
                "SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = ? AND column_name = ?",
                [$tabla, $columna],
            );

            if ($existe === null) {
                continue;
            }

            DB::statement(sprintf(
                'COMMENT ON COLUMN %s.%s IS %s',
                $this->ident($tabla),
                $this->ident($columna),
                $this->literal(EstadoCatalogo::comentario($tabla, $columna)),
            ));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $tablas = DB::select("
            SELECT c.relname AS table_name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
              AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
        ");

        foreach ($tablas as $tabla) {
            DB::statement(sprintf('COMMENT ON TABLE %s IS NULL', $this->ident($tabla->table_name)));
        }
    }

    private function ident(string $ident): string
    {
        return '"'.str_replace('"', '""', $ident).'"';
    }

    private function literal(string $valor): string
    {
        return "'".str_replace("'", "''", $valor)."'";
    }
};
