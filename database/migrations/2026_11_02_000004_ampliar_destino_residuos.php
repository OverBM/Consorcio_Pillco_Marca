<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El catálogo de residuos usa destinos como `reaprovechamiento` (17),
     * que no caben en varchar(15). PostgreSQL rechaza el truncamiento.
     */
    public function up(): void
    {
        Schema::table('residuos', function (Blueprint $table) {
            $table->string('destino', 30)->nullable()->change();
            $table->string('estado', 20)->default('registrado')->change();
        });
    }

    public function down(): void
    {
        Schema::table('residuos', function (Blueprint $table) {
            $table->string('destino', 15)->nullable()->change();
            $table->string('estado', 12)->default('registrado')->change();
        });
    }
};
