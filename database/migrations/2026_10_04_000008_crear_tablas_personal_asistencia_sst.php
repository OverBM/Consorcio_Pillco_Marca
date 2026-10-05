<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trabajadores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->unique()->constrained('usuarios');
            $table->foreignId('obra_id')->nullable()->constrained('obras');
            $table->string('dni', 12)->unique();
            $table->string('nombres', 160);
            $table->string('cargo', 80)->nullable();
            $table->foreignId('frente_id')->nullable()->constrained('frentes_trabajo');
            $table->boolean('activo')->default(true);
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('marcaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trabajador_id')->constrained('trabajadores');
            $table->foreignId('obra_id')->constrained('obras');
            $table->string('tipo', 8);
            $table->timestampTz('marcado_en')->useCurrent();
            $table->decimal('distancia_a_obra_m', 10, 1)->nullable();
            $table->boolean('dentro_geocerca')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['trabajador_id', 'marcado_en'], 'idx_marc_trab_fecha');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE marcaciones ADD COLUMN ubicacion geography(Point,4326)');
        } else {
            Schema::table('marcaciones', function (Blueprint $table) {
                $table->text('ubicacion')->nullable();
            });
        }

        Schema::create('asistencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trabajador_id')->constrained('trabajadores');
            $table->foreignId('obra_id')->constrained('obras');
            $table->date('fecha');
            $table->decimal('horas_trabajadas', 5, 2)->default(0);
            $table->string('inconsistencia', 25)->nullable();
            $table->string('estado', 15)->default('consolidada');
            $table->foreignId('corregida_por')->nullable()->constrained('usuarios');
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->text('motivo_correccion')->nullable();
            $table->timestampsTz();

            $table->unique(['trabajador_id', 'fecha']);
        });

        Schema::create('planillas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras');
            $table->string('periodo', 20);
            $table->string('estado', 12)->default('abierta');
            $table->decimal('total', 14, 2)->default(0);
            $table->foreignId('procesada_por')->nullable()->constrained('usuarios');
            $table->timestampsTz();

            $table->unique(['obra_id', 'periodo']);
        });

        Schema::create('planilla_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planilla_id')->constrained('planillas')->cascadeOnDelete();
            $table->foreignId('trabajador_id')->constrained('trabajadores');
            $table->smallInteger('dias_laborados');
            $table->decimal('horas_totales', 7, 2);
            $table->decimal('monto', 12, 2);

            $table->unique(['planilla_id', 'trabajador_id']);
        });

        Schema::create('capacitaciones', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 15);
            $table->string('titulo', 200);
            $table->foreignId('obra_id')->nullable()->constrained('obras');
            $table->timestampTz('fecha_programada');
            $table->string('instructor', 120)->nullable();
            $table->decimal('nota_minima', 4, 1)->default(11);
            $table->smallInteger('vigencia_meses')->nullable();
            $table->foreignId('programada_por')->constrained('usuarios');
            $table->string('estado', 12)->default('programada');
            $table->timestampsTz();
        });

        Schema::create('capacitacion_participantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('capacitacion_id')->constrained('capacitaciones')->cascadeOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
            $table->foreignId('trabajador_id')->nullable()->constrained('trabajadores');
            $table->decimal('nota', 4, 1)->nullable();
            $table->smallInteger('intento')->default(1);
            $table->boolean('aprobado')->nullable();
            $table->string('certificado_ruta', 255)->nullable();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE capacitacion_participantes ADD CONSTRAINT chk_participante_usuario_o_trabajador CHECK (usuario_id IS NOT NULL OR trabajador_id IS NOT NULL)');
        }

        Schema::create('certificaciones_usuario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->foreignId('capacitacion_id')->constrained('capacitaciones');
            $table->string('tipo', 15)->default('sistema_almacen');
            $table->date('vigente_desde')->useCurrent();
            $table->date('vigente_hasta')->nullable();
            $table->timestampsTz();
        });

        Schema::create('incidentes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->foreignId('obra_id')->constrained('obras');
            $table->foreignId('trabajador_id')->nullable()->constrained('trabajadores');
            $table->foreignId('reportado_por')->constrained('usuarios');
            $table->string('tipo', 10);
            $table->string('gravedad', 10);
            $table->timestampTz('ocurrido_en');
            $table->text('descripcion');
            $table->boolean('requiere_traslado')->default(false);
            $table->string('estado', 15)->default('reportado');
            $table->text('causas')->nullable();
            $table->foreignId('reporte_tecnico_id')->nullable()->constrained('documentos');
            $table->foreignId('validado_por')->nullable()->constrained('usuarios');
            $table->timestampTz('remitido_en')->nullable();
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE incidentes ADD COLUMN ubicacion geography(Point,4326)');
        } else {
            Schema::table('incidentes', function (Blueprint $table) {
                $table->text('ubicacion')->nullable();
            });
        }

        Schema::create('acciones_correctivas', function (Blueprint $table) {
            $table->id();
            $table->string('origen_tipo', 20);
            $table->unsignedBigInteger('origen_id');
            $table->text('descripcion');
            $table->string('tipo', 12);
            $table->foreignId('responsable_id')->nullable()->constrained('usuarios');
            $table->date('fecha_limite')->nullable();
            $table->string('estado', 12)->default('pendiente');
            $table->timestampsTz();
        });

        Schema::create('epp_solicitudes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trabajador_id')->constrained('trabajadores');
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad', 10, 2)->default(1);
            $table->foreignId('autorizada_por')->nullable()->constrained('usuarios');
            $table->string('estado', 15)->default('solicitada');
            $table->foreignId('requerimiento_id')->nullable()->constrained('requerimientos');
            $table->timestampsTz();
        });

        Schema::create('epp_asignaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trabajador_id')->constrained('trabajadores');
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->string('numero_serie', 60)->nullable();
            $table->foreignId('entregado_por')->constrained('usuarios');
            $table->timestampTz('entregado_en')->useCurrent();
            $table->string('estado', 12)->default('vigente');

            $table->unique(['material_id', 'numero_serie']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('epp_asignaciones');
        Schema::dropIfExists('epp_solicitudes');
        Schema::dropIfExists('acciones_correctivas');
        Schema::dropIfExists('incidentes');
        Schema::dropIfExists('certificaciones_usuario');
        Schema::dropIfExists('capacitacion_participantes');
        Schema::dropIfExists('capacitaciones');
        Schema::dropIfExists('planilla_detalles');
        Schema::dropIfExists('planillas');
        Schema::dropIfExists('asistencias');
        Schema::dropIfExists('marcaciones');
        Schema::dropIfExists('trabajadores');
    }
};
