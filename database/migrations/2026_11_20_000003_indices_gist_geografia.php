<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $columnas = DB::select("
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND udt_name = 'geography'
            ORDER BY table_name, column_name
        ");

        foreach ($columnas as $columna) {
            $existe = DB::selectOne(
                "SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'public' AND tablename = ?
                   AND indexdef ILIKE '%USING gist%' AND indexdef ILIKE ?",
                [$columna->table_name, '%'.$columna->column_name.'%'],
            );

            if ($existe !== null) {
                continue;
            }

            $nombre = 'idx_'.substr($columna->table_name, 0, 40).'_'.substr($columna->column_name, 0, 16).'_gist';

            DB::statement(sprintf(
                'CREATE INDEX IF NOT EXISTS %s ON %s USING GIST (%s)',
                $this->ident($nombre),
                $this->ident($columna->table_name),
                $this->ident($columna->column_name),
            ));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $columnas = DB::select("
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND udt_name = 'geography'
        ");

        foreach ($columnas as $columna) {
            $nombre = 'idx_'.substr($columna->table_name, 0, 40).'_'.substr($columna->column_name, 0, 16).'_gist';
            DB::statement(sprintf('DROP INDEX IF EXISTS %s', $this->ident($nombre)));
        }
    }

    private function ident(string $ident): string
    {
        return '"'.str_replace('"', '""', $ident).'"';
    }
};
