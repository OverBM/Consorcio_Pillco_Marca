<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('ruc', 11)->unique();
            $table->string('razon_social', 200);
            $table->string('contacto', 120)->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('email', 160)->nullable();
            $table->string('direccion', 240)->nullable();
            $table->string('tipo', 20)->default('material');
            $table->string('autorizacion', 80)->nullable();
            $table->date('vigente_hasta')->nullable();
            $table->decimal('calificacion', 3, 2)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('solicitudes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('tipo', 10);
            $table->foreignId('obra_id')->constrained('obras');
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('solicitante_id')->constrained('usuarios');
            $table->foreignId('partida_id')->nullable()->constrained('partidas');
            $table->foreignId('frente_id')->nullable()->constrained('frentes_trabajo');
            $table->unsignedBigInteger('observacion_tecnica_id')->nullable();
            $table->string('prioridad', 10)->nullable();
            $table->boolean('urgente')->default(false);
            $table->text('justificacion')->nullable();
            $table->date('fecha_requerida')->nullable();
            $table->string('estado', 20);
            $table->timestampTz('atendida_en')->nullable();
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios');
            $table->timestampTz('aprobado_en')->nullable();
            $table->text('motivo_rechazo')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['tipo', 'estado'], 'idx_solicitudes_tipo_estado');
            $table->index(['obra_id', 'estado'], 'idx_solicitudes_obra_estado');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE solicitudes ADD COLUMN ubicacion_solicitud geography(Point,4326)');
            DB::statement('CREATE INDEX idx_solicitudes_ubicacion ON solicitudes USING GIST (ubicacion_solicitud)');
        } else {
            Schema::table('solicitudes', function (Blueprint $table) {
                $table->text('ubicacion_solicitud')->nullable();
            });
        }

        Schema::create('solicitud_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad', 14, 3);
            $table->decimal('cantidad_atendida', 14, 3)->default(0);
            $table->unique(['solicitud_id', 'material_id']);
        });

        Schema::create('cotizaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes');
            $table->foreignId('proveedor_id')->constrained('proveedores');
            $table->decimal('total', 14, 2)->default(0);
            $table->smallInteger('plazo_entrega_dias')->nullable();
            $table->text('condiciones')->nullable();
            $table->string('estado', 12)->default('recibida');
            $table->text('motivo_seleccion')->nullable();
            $table->timestampsTz();
        });

        Schema::create('cotizacion_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_id')->constrained('cotizaciones')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad', 14, 3);
            $table->decimal('precio_unitario', 14, 4);
        });

        Schema::create('ordenes_compra', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->foreignId('solicitud_id')->nullable()->constrained('solicitudes');
            $table->foreignId('cotizacion_id')->nullable()->constrained('cotizaciones');
            $table->foreignId('proveedor_id')->constrained('proveedores');
            $table->foreignId('obra_id')->constrained('obras');
            $table->foreignId('almacen_destino_id')->constrained('almacenes');
            $table->boolean('urgente')->default(false);
            $table->string('estado', 20)->default('emitida');
            $table->decimal('total', 14, 2)->default(0);
            $table->foreignId('emitida_por')->constrained('usuarios');
            $table->date('fecha_entrega_prometida')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['obra_id', 'estado'], 'idx_oc_obra_estado');
        });

        Schema::create('orden_compra_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orden_compra_id')->constrained('ordenes_compra')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->decimal('cantidad', 14, 3);
            $table->decimal('precio_unitario', 14, 4);
            $table->jsonb('especificaciones_tecnicas')->default('{}');
        });

        Schema::create('transportes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orden_compra_id')->nullable()->constrained('ordenes_compra');
            $table->unsignedBigInteger('transferencia_id')->nullable();
            $table->string('transportista', 160)->nullable();
            $table->string('conductor', 120)->nullable();
            $table->string('placa', 12)->nullable();
            $table->string('telefono', 30)->nullable();
            $table->string('guia_remision', 40)->nullable();
            $table->string('estado', 15)->default('programado');
            $table->timestampTz('salida_en')->nullable();
            $table->timestampTz('llegada_estimada_en')->nullable();
            $table->timestampTz('llegada_real_en')->nullable();
            $table->timestampsTz();
        });

        Schema::create('recepciones', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->foreignId('almacen_id')->constrained('almacenes');
            $table->foreignId('orden_compra_id')->constrained('ordenes_compra');
            $table->foreignId('almacenero_id')->constrained('usuarios');
            $table->string('guia_remision', 40)->nullable();
            $table->string('estado', 15)->default('en_verificacion');
            $table->timestampTz('recibida_en')->useCurrent();
            $table->string('firma_ruta', 255)->nullable();
            $table->string('foto_ruta', 255)->nullable();
            $table->text('observaciones')->nullable();
            $table->timestampsTz();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE recepciones ADD COLUMN ubicacion_recepcion geography(Point,4326)');
        } else {
            Schema::table('recepciones', function (Blueprint $table) {
                $table->text('ubicacion_recepcion')->nullable();
            });
        }

        Schema::create('lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained('materiales');
            $table->string('codigo_lote', 60);
            $table->foreignId('proveedor_id')->nullable()->constrained('proveedores');
            $table->date('fecha_vencimiento')->nullable();
            $table->string('estado', 12)->default('cuarentena');
            $table->string('codigo_qr', 120)->nullable();
            $table->timestampsTz();

            $table->unique(['material_id', 'codigo_lote']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE kardex ADD CONSTRAINT fk_kardex_lote FOREIGN KEY (lote_id) REFERENCES lotes(id)');
        }

        Schema::create('recepcion_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recepcion_id')->constrained('recepciones')->cascadeOnDelete();
            $table->foreignId('orden_compra_detalle_id')->constrained('orden_compra_detalles');
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('lote_id')->nullable()->constrained('lotes');
            $table->foreignId('ubicacion_id')->nullable()->constrained('ubicaciones_almacen');
            $table->decimal('cantidad_ordenada', 14, 3);
            $table->decimal('cantidad_recibida', 14, 3);
            $table->boolean('cumple_especificaciones')->nullable();
            $table->jsonb('detalle_validacion')->nullable();
            $table->text('motivo_rechazo')->nullable();
        });

        Schema::create('devoluciones_proveedor', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->foreignId('recepcion_id')->constrained('recepciones');
            $table->foreignId('proveedor_id')->constrained('proveedores');
            $table->text('motivo');
            $table->string('estado', 15)->default('registrada');
            $table->foreignId('registrada_por')->constrained('usuarios');
            $table->foreignId('aprobada_por')->nullable()->constrained('usuarios');
            $table->timestampsTz();
        });

        Schema::create('devolucion_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('devolucion_id')->constrained('devoluciones_proveedor')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales');
            $table->foreignId('lote_id')->nullable()->constrained('lotes');
            $table->decimal('cantidad', 14, 3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devolucion_detalles');
        Schema::dropIfExists('devoluciones_proveedor');
        Schema::dropIfExists('recepcion_detalles');
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE kardex DROP CONSTRAINT IF EXISTS fk_kardex_lote');
        }
        Schema::dropIfExists('lotes');
        Schema::dropIfExists('recepciones');
        Schema::dropIfExists('transportes');
        Schema::dropIfExists('orden_compra_detalles');
        Schema::dropIfExists('ordenes_compra');
        Schema::dropIfExists('cotizacion_detalles');
        Schema::dropIfExists('cotizaciones');
        Schema::dropIfExists('solicitud_detalles');
        Schema::dropIfExists('solicitudes');
        Schema::dropIfExists('proveedores');
    }
};
