<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 160);
            $table->text('descripcion')->nullable();
            $table->string('entidad_contratante', 160)->nullable();
            $table->string('estado', 20)->default('activo');
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('obras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('programa_id')->constrained('programas');
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 200);
            $table->string('direccion', 240)->nullable();
            $table->string('distrito', 80)->nullable();
            $table->string('estado', 20)->default('planificacion');
            $table->string('fase_ciclo', 24)->default('iniciacion');
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin_prevista')->nullable();
            $table->date('fecha_fin_real')->nullable();
            $table->decimal('avance_fisico_pct', 5, 2)->default(0);
            $table->decimal('presupuesto_base', 14, 2)->default(0);
            $table->foreignId('residente_id')->nullable()->constrained('usuarios');
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE obras ADD COLUMN ubicacion geography(Point,4326) NOT NULL');
            DB::statement('CREATE INDEX idx_obras_ubicacion ON obras USING GIST (ubicacion)');
        } else {
            Schema::table('obras', function (Blueprint $table) {
                $table->text('ubicacion')->nullable();
            });
        }

        Schema::create('usuario_obra', function (Blueprint $table) {
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->foreignId('rol_id')->nullable()->constrained('roles');
            $table->primary(['usuario_id', 'obra_id']);
        });

        Schema::create('almacenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras');
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 160);
            $table->integer('radio_geocerca_m')->default(150);
            $table->decimal('capacidad_referencial', 12, 2)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index('obra_id', 'idx_almacenes_obra');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE almacenes ADD COLUMN ubicacion geography(Point,4326) NOT NULL');
            DB::statement('CREATE INDEX idx_almacenes_ubicacion ON almacenes USING GIST (ubicacion)');
        } else {
            Schema::table('almacenes', function (Blueprint $table) {
                $table->text('ubicacion')->nullable();
            });
        }

        Schema::create('usuario_almacen', function (Blueprint $table) {
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->string('tipo', 10)->default('operador');
            $table->primary(['usuario_id', 'almacen_id']);
        });

        Schema::create('ubicaciones_almacen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('descripcion', 160)->nullable();
            $table->unique(['almacen_id', 'codigo']);
        });

        Schema::create('frentes_trabajo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('nombre', 160);
            $table->foreignId('maestro_obra_id')->nullable()->constrained('usuarios');
            $table->string('estado', 15)->default('activo');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('frentes_trabajo');
        Schema::dropIfExists('ubicaciones_almacen');
        Schema::dropIfExists('usuario_almacen');
        Schema::dropIfExists('almacenes');
        Schema::dropIfExists('usuario_obra');
        Schema::dropIfExists('obras');
        Schema::dropIfExists('programas');
    }
};
