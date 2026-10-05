<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observaciones_tecnicas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras');
            $table->string('numero_acta', 40)->nullable();
            $table->text('descripcion');
            $table->string('origen', 12)->default('supervision');
            $table->date('plazo_subsanacion')->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('usuarios');
            $table->string('estado', 15)->default('notificada');
            $table->foreignId('acta_levantamiento_id')->nullable()->constrained('documentos');
            $table->boolean('planos_asbuilt_actualizados')->default(false);
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE requerimientos ADD CONSTRAINT fk_req_obs FOREIGN KEY (observacion_tecnica_id) REFERENCES observaciones_tecnicas(id)');
        }

        Schema::create('observacion_evidencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('observacion_id')->constrained('observaciones_tecnicas')->cascadeOnDelete();
            $table->string('etapa', 12);
            $table->string('ruta', 255);
            $table->timestampTz('created_at')->useCurrent();
        });

        Schema::create('indicadores_ambientales', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('nombre', 80);
            $table->string('unidad', 20);
            $table->decimal('limite_maximo', 12, 3);
        });

        Schema::create('plan_manejo_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('descripcion', 240);
            $table->string('frecuencia', 20)->default('semanal');
            $table->timestampsTz();
        });

        Schema::create('plan_manejo_verificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('plan_manejo_items')->cascadeOnDelete();
            $table->foreignId('verificado_por')->constrained('usuarios');
            $table->boolean('cumple');
            $table->text('observacion')->nullable();
            $table->timestampTz('verificado_en')->useCurrent();
        });

        Schema::create('mediciones_ambientales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras');
            $table->foreignId('indicador_id')->constrained('indicadores_ambientales');
            $table->decimal('valor', 12, 3);
            $table->boolean('fuera_de_limite');
            $table->text('medida_correctiva')->nullable();
            $table->foreignId('medida_aplicada_por')->nullable()->constrained('usuarios');
            $table->foreignId('medido_por')->constrained('usuarios');
            $table->timestampTz('medido_en')->useCurrent();
            $table->timestampsTz();
        });

        Schema::create('empresas_eors', function (Blueprint $table) {
            $table->id();
            $table->string('ruc', 11)->unique();
            $table->string('razon_social', 200);
            $table->string('autorizacion', 80)->nullable();
            $table->date('vigente_hasta')->nullable();
            $table->timestampsTz();
        });

        Schema::create('residuos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras');
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->string('clase', 12);
            $table->string('descripcion', 200);
            $table->foreignId('material_id')->nullable()->constrained('materiales');
            $table->decimal('volumen', 12, 3);
            $table->string('unidad', 10);
            $table->foreignId('registrado_por')->constrained('usuarios');
            $table->string('destino', 15)->nullable();
            $table->foreignId('transferencia_id')->nullable()->constrained('transferencias');
            $table->foreignId('eors_id')->nullable()->constrained('empresas_eors');
            $table->foreignId('manifiesto_id')->nullable()->constrained('documentos');
            $table->string('estado', 12)->default('registrado');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residuos');
        Schema::dropIfExists('empresas_eors');
        Schema::dropIfExists('mediciones_ambientales');
        Schema::dropIfExists('plan_manejo_verificaciones');
        Schema::dropIfExists('plan_manejo_items');
        Schema::dropIfExists('indicadores_ambientales');
        Schema::dropIfExists('observacion_evidencias');
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE requerimientos DROP CONSTRAINT IF EXISTS fk_req_obs');
        }
        Schema::dropIfExists('observaciones_tecnicas');
    }
};
