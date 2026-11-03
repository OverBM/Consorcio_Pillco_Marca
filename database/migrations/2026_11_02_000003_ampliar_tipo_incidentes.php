<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `tipo` no admitía valores usados por el catálogo SST (casi_accidente).
     * PostgreSQL rechaza el truncamiento; SQLite lo ignoraba.
     */
    public function up(): void
    {
        Schema::table('incidentes', function (Blueprint $table) {
            $table->string('tipo', 30)->change();
        });
    }

    public function down(): void
    {
        Schema::table('incidentes', function (Blueprint $table) {
            $table->string('tipo', 10)->change();
        });
    }
};
