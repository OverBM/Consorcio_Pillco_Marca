<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 40)->unique();
            $table->string('nombre', 120);
            $table->text('descripcion')->nullable();
            $table->boolean('es_externo')->default(false);
            $table->timestampsTz();
        });

        Schema::create('permisos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 80)->unique();
            $table->string('modulo', 60);
            $table->text('descripcion')->nullable();
            $table->timestampsTz();
        });

        Schema::create('permiso_rol', function (Blueprint $table) {
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permiso_id')->constrained('permisos')->cascadeOnDelete();
            $table->primary(['rol_id', 'permiso_id']);
        });

        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 160)->unique();
            $table->timestampTz('email_verified_at')->nullable();
            $table->string('password', 255);
            $table->string('dni', 12)->nullable()->unique();
            $table->string('telefono', 30)->nullable();
            $table->boolean('activo')->default(true);
            $table->smallInteger('intentos_fallidos')->default(0);
            $table->timestampTz('bloqueado_hasta')->nullable();
            $table->timestampTz('ultimo_acceso_en')->nullable();
            $table->rememberToken();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('usuario_rol', function (Blueprint $table) {
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->primary(['usuario_id', 'rol_id']);
        });

        Schema::create('parametros_sistema', function (Blueprint $table) {
            $table->id();
            $table->string('clave', 80)->unique();
            $table->text('valor');
            $table->string('tipo', 20)->default('texto');
            $table->text('descripcion')->nullable();
            $table->timestampsTz();
        });

        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('accion', 60);
            $table->string('entidad', 80);
            $table->unsignedBigInteger('entidad_id')->nullable();
            $table->jsonb('antes')->nullable();
            $table->jsonb('despues')->nullable();
            $table->ipAddress('ip')->nullable();
            $table->text('user_agent')->nullable();
            $table->char('hash_anterior', 64)->nullable();
            $table->char('hash_registro', 64)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['entidad', 'entidad_id'], 'idx_auditorias_entidad');
            $table->index(['usuario_id', 'created_at'], 'idx_auditorias_usuario');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestampTz('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('auditorias');
        Schema::dropIfExists('parametros_sistema');
        Schema::dropIfExists('usuario_rol');
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('permiso_rol');
        Schema::dropIfExists('permisos');
        Schema::dropIfExists('roles');
    }
};
