<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes_acceso', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_completo', 150);
            $table->string('email', 160);
            $table->string('dni', 12)->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('empresa', 150)->nullable();
            $table->string('cargo', 150)->nullable();
            $table->string('rol_solicitado', 40);
            $table->text('motivo');
            $table->string('estado', 20)->default('pendiente');
            $table->foreignId('revisado_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestampTz('revisado_en')->nullable();
            $table->text('notas_revision')->nullable();
            $table->ipAddress('ip')->nullable();
            $table->timestampsTz();

            $table->index(['estado', 'created_at'], 'idx_solicitudes_estado');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_acceso');
    }
};
