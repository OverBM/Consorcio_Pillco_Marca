<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $existe = DB::selectOne("SELECT 1 FROM pg_extension WHERE extname = 'postgis'");
            if ($existe === null) {
                DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
            }
        }
    }

    public function down(): void
    {
        // No drop extension en rollback estándar
    }
};
