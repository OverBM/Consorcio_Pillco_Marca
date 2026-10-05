<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('obra_fases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('fase', 24);
            $table->string('estado', 12)->default('pendiente');
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->timestampTz('aprobada_en')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestampsTz();

            $table->unique(['obra_id', 'fase']);
        });

        Schema::create('hitos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('nombre', 160);
            $table->date('fecha_planificada');
            $table->date('fecha_real')->nullable();
            $table->string('estado', 12)->default('pendiente');
            $table->timestampsTz();
        });

        Schema::create('avances_fisicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->foreignId('frente_id')->nullable()->constrained('frentes_trabajo');
            $table->foreignId('partida_id')->constrained('partidas');
            $table->date('periodo');
            $table->decimal('metrado_ejecutado', 14, 3);
            $table->decimal('avance_pct_acumulado', 5, 2);
            $table->foreignId('registrado_por')->constrained('usuarios');
            $table->timestampsTz();

            $table->unique(['partida_id', 'periodo']);
        });

        Schema::create('lineas_base_costo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->smallInteger('version');
            $table->decimal('bac', 14, 2);
            $table->boolean('vigente')->default(true);
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->timestampsTz();

            $table->unique(['obra_id', 'version']);
        });

        Schema::create('valorizaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->date('periodo');
            $table->decimal('valor_planificado', 14, 2);
            $table->decimal('valor_ganado', 14, 2);
            $table->decimal('costo_real', 14, 2);
            $table->string('estado', 12)->default('borrador');
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->timestampsTz();

            $table->unique(['obra_id', 'periodo']);
        });

        Schema::create('adelantos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras');
            $table->string('tipo', 12);
            $table->decimal('monto', 14, 2);
            $table->string('estado', 15)->default('solicitado');
            $table->string('banco_fideicomitente', 120)->nullable();
            $table->foreignId('solicitado_por')->constrained('usuarios');
            $table->foreignId('registrado_por_financiera')->nullable()->constrained('usuarios');
            $table->boolean('garantia_fiel_cumplimiento')->default(false);
            $table->timestampsTz();
        });

        Schema::create('adelanto_eventos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adelanto_id')->constrained('adelantos')->cascadeOnDelete();
            $table->string('evento', 20);
            $table->text('detalle')->nullable();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
            $table->timestampTz('created_at')->useCurrent();
        });

        Schema::create('riesgos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->text('descripcion');
            $table->string('categoria', 20);
            $table->smallInteger('probabilidad');
            $table->smallInteger('impacto');
            $table->text('respuesta')->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('usuarios');
            $table->string('estado', 12)->default('abierto');
            $table->string('origen', 10)->default('manual');
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE riesgos ADD COLUMN severidad smallint GENERATED ALWAYS AS (probabilidad * impacto) STORED');
        } else {
            Schema::table('riesgos', function (Blueprint $table) {
                $table->smallInteger('severidad')->nullable();
            });
        }

        Schema::create('alertas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->nullable()->constrained('obras');
            $table->string('tipo', 40);
            $table->string('severidad', 8)->default('media');
            $table->text('mensaje');
            $table->string('referencia_tipo', 40)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->string('estado', 10)->default('abierta');
            $table->timestampsTz();

            $table->index(['estado', 'severidad'], 'idx_alertas_estado');
        });

        Schema::create('solicitudes_cambio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('tipo', 10);
            $table->text('descripcion');
            $table->integer('impacto_plazo_dias')->default(0);
            $table->decimal('impacto_costo', 14, 2)->default(0);
            $table->string('estado', 12)->default('solicitada');
            $table->foreignId('solicitada_por')->constrained('usuarios');
            $table->foreignId('decidida_por')->nullable()->constrained('usuarios');
            $table->timestampTz('decidida_en')->nullable();
            $table->timestampsTz();
        });

        Schema::create('interesados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->nullable()->constrained('obras')->cascadeOnDelete();
            $table->string('nombre', 160);
            $table->string('tipo', 20);
            $table->smallInteger('influencia')->nullable();
            $table->smallInteger('interes')->nullable();
            $table->string('contacto', 160)->nullable();
            $table->timestampsTz();
        });

        Schema::create('documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->nullable()->constrained('obras');
            $table->string('tipo', 30);
            $table->string('titulo', 200);
            $table->string('ruta', 255);
            $table->char('hash_sha256', 64)->nullable();
            $table->smallInteger('version')->default(1);
            $table->foreignId('subido_por')->constrained('usuarios');
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('comunicaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->foreignId('interesado_id')->nullable()->constrained('interesados');
            $table->string('tipo', 15);
            $table->string('sentido', 10);
            $table->string('asunto', 240);
            $table->date('fecha');
            $table->string('estado', 12)->default('pendiente');
            $table->foreignId('documento_id')->nullable()->constrained('documentos');
            $table->timestampsTz();
        });

        Schema::create('cierres_obra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->unique()->constrained('obras');
            $table->date('fecha_ejecucion_100')->nullable();
            $table->foreignId('informe_final_id')->nullable()->constrained('documentos');
            $table->date('fecha_recepcion_obra')->nullable();
            $table->foreignId('acta_recepcion_id')->nullable()->constrained('documentos');
            $table->string('estado', 15)->default('abierto');
            $table->boolean('excedentes_evaluados')->default(false);
            $table->timestampsTz();
        });

        Schema::create('lecciones_aprendidas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('area_conocimiento', 20);
            $table->text('descripcion');
            $table->text('recomendacion')->nullable();
            $table->foreignId('registrada_por')->nullable()->constrained('usuarios');
            $table->timestampsTz();
        });

        Schema::create('equipos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->nullable()->constrained('obras');
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 160);
            $table->string('tipo', 60)->nullable();
            $table->string('estado', 15)->default('disponible');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipos');
        Schema::dropIfExists('lecciones_aprendidas');
        Schema::dropIfExists('cierres_obra');
        Schema::dropIfExists('comunicaciones');
        Schema::dropIfExists('documentos');
        Schema::dropIfExists('interesados');
        Schema::dropIfExists('solicitudes_cambio');
        Schema::dropIfExists('alertas');
        Schema::dropIfExists('riesgos');
        Schema::dropIfExists('adelanto_eventos');
        Schema::dropIfExists('adelantos');
        Schema::dropIfExists('valorizaciones');
        Schema::dropIfExists('lineas_base_costo');
        Schema::dropIfExists('avances_fisicos');
        Schema::dropIfExists('hitos');
        Schema::dropIfExists('obra_fases');
    }
};
