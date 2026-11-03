<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['obras', 'almacenes', 'marcaciones'] as $tabla) {
            if (Schema::hasColumn($tabla, 'latitud')) {
                continue;
            }

            Schema::table($tabla, function (Blueprint $table) {
                $table->decimal('latitud', 10, 7)->nullable();
                $table->decimal('longitud', 10, 7)->nullable();
            });
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('UPDATE obras SET latitud = ST_Y(ubicacion::geometry), longitud = ST_X(ubicacion::geometry) WHERE ubicacion IS NOT NULL');
            DB::statement('UPDATE almacenes SET latitud = ST_Y(ubicacion::geometry), longitud = ST_X(ubicacion::geometry) WHERE ubicacion IS NOT NULL');
            DB::statement('UPDATE marcaciones SET latitud = ST_Y(ubicacion::geometry), longitud = ST_X(ubicacion::geometry) WHERE ubicacion IS NOT NULL');
        }
    }

    public function down(): void
    {
        foreach (['marcaciones', 'almacenes', 'obras'] as $tabla) {
            Schema::table($tabla, function (Blueprint $table) {
                $table->dropColumn(['latitud', 'longitud']);
            });
        }
    }
};
