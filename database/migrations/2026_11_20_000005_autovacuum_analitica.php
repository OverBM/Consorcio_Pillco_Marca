<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (['kardex', 'auditorias', 'pronosticos_demanda'] as $tabla) {
            if (! Schema::hasTable($tabla)) {
                continue;
            }

            DB::statement(sprintf(
                'ALTER TABLE %s SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02)',
                '"'.$tabla.'"',
            ));
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (['kardex', 'auditorias', 'pronosticos_demanda'] as $tabla) {
            if (! Schema::hasTable($tabla)) {
                continue;
            }

            DB::statement(sprintf(
                'ALTER TABLE %s RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor)',
                '"'.$tabla.'"',
            ));
        }
    }
};
