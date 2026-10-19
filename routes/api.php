<?php

use App\Http\Controllers\Api\V1\AmbienteController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AvanceFisicoController;
use App\Http\Controllers\Api\V1\BusquedaMultialmacenController;
use App\Http\Controllers\Api\V1\CalidadController;
use App\Http\Controllers\Api\V1\CierreObraController;
use App\Http\Controllers\Api\V1\CotizacionController;
use App\Http\Controllers\Api\V1\DespachoController;
use App\Http\Controllers\Api\V1\DevolucionController;
use App\Http\Controllers\Api\V1\ExcedenteController;
use App\Http\Controllers\Api\V1\FaseConfigController;
use App\Http\Controllers\Api\V1\InventarioFisicoController;
use App\Http\Controllers\Api\V1\MermaController;
use App\Http\Controllers\Api\V1\NotificacionController;
use App\Http\Controllers\Api\V1\OrdenCompraController;
use App\Http\Controllers\Api\V1\ParametroSistemaController;
use App\Http\Controllers\Api\V1\PartidaController;
use App\Http\Controllers\Api\V1\PersonalController;
use App\Http\Controllers\Api\V1\ProveedorController;
use App\Http\Controllers\Api\V1\ProyectoController;
use App\Http\Controllers\Api\V1\RecepcionController;
use App\Http\Controllers\Api\V1\RequerimientoController;
use App\Http\Controllers\Api\V1\RiesgoController;
use App\Http\Controllers\Api\V1\SolicitudAccesoController;
use App\Http\Controllers\Api\V1\SolicitudCambioController;
use App\Http\Controllers\Api\V1\SolicitudMaterialController;
use App\Http\Controllers\Api\V1\SstController;
use App\Http\Controllers\Api\V1\StockController;
use App\Http\Controllers\Api\V1\TransferenciaController;
use App\Http\Controllers\Api\V1\UsuarioController;
use App\Http\Controllers\Api\V1\ValorizacionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Consorcio Pillco Marca (V1)
|--------------------------------------------------------------------------
| Lista blanca pública (solo lectura): `POST auth/login` y `GET proyectos`.
| Cualquier otra ruta exige identidad (sesión web o token Bearer).
| Las escrituras, además, exigen el permiso `<módulo>.editar`.
*/

Route::post('auth/login', [AuthController::class, 'login']);

// Lectura pública de la portada: campos públicos saneados.
Route::get('proyectos', [ProyectoController::class, 'index']);

Route::middleware('auth')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Centro de notificaciones (disponible para cualquier usuario autenticado).
    Route::prefix('notificaciones')->group(function () {
        Route::get('/', [NotificacionController::class, 'index']);
        Route::post('/marcar-todas', [NotificacionController::class, 'marcarTodas']);
        Route::post('/{id}/marcar-leida', [NotificacionController::class, 'marcarLeida'])->whereNumber('id');
    });
    Route::post('alertas/{id}/marcar-leida', [NotificacionController::class, 'marcarAlertaLeida'])->whereNumber('id');

    /*
    |--------------------------------------------------------------------------
    | Logística y almacén
    |--------------------------------------------------------------------------
    */

    Route::prefix('stock')->group(function () {
        Route::get('/', [StockController::class, 'index']);
        Route::get('/critico', [StockController::class, 'critico']);
        Route::get('/almacenes/{id}/kardex', [StockController::class, 'kardex']);
    });

    Route::prefix('recepciones')->group(function () {
        Route::get('/', [RecepcionController::class, 'index']);
        Route::get('/{id}', [RecepcionController::class, 'show']);
        Route::middleware('modulo:logistica,editar')->post('/', [RecepcionController::class, 'store']);
    });

    Route::prefix('solicitudes')->group(function () {
        Route::get('/', [SolicitudMaterialController::class, 'index']);
        Route::middleware('modulo:logistica,editar')->group(function () {
            Route::post('/', [SolicitudMaterialController::class, 'store']);
            Route::post('/{id}/atender', [SolicitudMaterialController::class, 'atender']);
        });
    });

    Route::prefix('busqueda-multialmacen')->group(function () {
        Route::middleware('modulo:logistica,editar')->post('/buscar', [BusquedaMultialmacenController::class, 'buscar']);
    });

    Route::prefix('transferencias')->group(function () {
        Route::get('/', [TransferenciaController::class, 'index']);
        Route::middleware('modulo:logistica,editar')->group(function () {
            Route::post('/', [TransferenciaController::class, 'store']);
            Route::post('/{id}/aprobar', [TransferenciaController::class, 'aprobar']);
            Route::post('/{id}/confirmar-recepcion', [TransferenciaController::class, 'confirmarRecepcion']);
        });
    });

    Route::prefix('despachos')->group(function () {
        Route::get('/', [DespachoController::class, 'index']);
        Route::middleware('modulo:logistica,editar')->post('/', [DespachoController::class, 'store']);
    });

    Route::prefix('mermas')->group(function () {
        Route::get('/', [MermaController::class, 'index']);
        Route::middleware('modulo:logistica,editar')->post('/', [MermaController::class, 'store']);
    });

    Route::prefix('inventario-fisico')->group(function () {
        Route::get('/', [InventarioFisicoController::class, 'index']);
        Route::middleware('modulo:logistica,editar')->group(function () {
            Route::post('/', [InventarioFisicoController::class, 'store']);
            Route::post('/{id}/conteos', [InventarioFisicoController::class, 'registrarConteosYAjustar']);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Programa: excedentes y redistribución
    |--------------------------------------------------------------------------
    */

    Route::prefix('excedentes')->group(function () {
        Route::get('/', [ExcedenteController::class, 'index']);
        Route::get('/{excedente}/sugerencias', [ExcedenteController::class, 'sugerir'])->whereNumber('excedente');
        Route::middleware('modulo:programa,editar')->group(function () {
            Route::post('/', [ExcedenteController::class, 'store']);
            Route::put('/{excedente}', [ExcedenteController::class, 'update'])->whereNumber('excedente');
            Route::delete('/{excedente}', [ExcedenteController::class, 'destroy'])->whereNumber('excedente');
            Route::post('/{excedente}/transferencia', [ExcedenteController::class, 'generarTransferencia'])->whereNumber('excedente');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Compras y proveedores
    |--------------------------------------------------------------------------
    */

    Route::prefix('requerimientos')->group(function () {
        Route::get('/', [RequerimientoController::class, 'index']);
        Route::middleware('modulo:compras,editar')->group(function () {
            Route::post('/', [RequerimientoController::class, 'store']);
            Route::post('/{id}/evaluar', [RequerimientoController::class, 'evaluar']);
        });
    });

    Route::prefix('cotizaciones')->group(function () {
        Route::get('/', [CotizacionController::class, 'index']);
        Route::middleware('modulo:compras,editar')->group(function () {
            Route::post('/', [CotizacionController::class, 'store']);
            Route::post('/{id}/seleccionar', [CotizacionController::class, 'seleccionar']);
        });
    });

    Route::prefix('ordenes-compra')->group(function () {
        Route::get('/', [OrdenCompraController::class, 'index']);
        Route::middleware('modulo:compras,editar')->post('/', [OrdenCompraController::class, 'store']);
    });

    Route::prefix('devoluciones')->group(function () {
        Route::get('/', [DevolucionController::class, 'index']);
        Route::middleware('modulo:compras,editar')->post('/', [DevolucionController::class, 'store']);
    });

    Route::prefix('proveedores')->group(function () {
        Route::get('/', [ProveedorController::class, 'index']);
        Route::middleware('modulo:compras,editar')->post('/', [ProveedorController::class, 'store']);
    });

    /*
    |--------------------------------------------------------------------------
    | Módulos Gestión de Proyectos PMI / PMU
    |--------------------------------------------------------------------------
    */

    Route::prefix('proyectos')->group(function () {
        // Detalle interno (EVM, costos y cronograma): requiere identidad.
        Route::get('/{id}', [ProyectoController::class, 'show']);
        Route::middleware('modulo:pmi,editar')->group(function () {
            Route::post('/{id}/fases', [ProyectoController::class, 'gestionarFase']);
            Route::post('/{id}/hitos', [ProyectoController::class, 'crearHito']);
        });
    });

    Route::prefix('avances-fisicos')->group(function () {
        Route::get('/', [AvanceFisicoController::class, 'index']);
        Route::middleware('modulo:pmi,editar')->post('/', [AvanceFisicoController::class, 'store']);
    });

    Route::prefix('partidas')->group(function () {
        Route::get('/', [PartidaController::class, 'index']);
        Route::middleware('modulo:pmi,editar')->post('/', [PartidaController::class, 'store']);
    });

    Route::prefix('valorizaciones')->group(function () {
        Route::get('/', [ValorizacionController::class, 'index']);
        Route::middleware('modulo:pmi,editar')->group(function () {
            Route::post('/', [ValorizacionController::class, 'store']);
            Route::post('/{id}/aprobar', [ValorizacionController::class, 'aprobar']);
        });
    });

    Route::prefix('riesgos')->group(function () {
        Route::get('/', [RiesgoController::class, 'index']);
        Route::middleware('modulo:pmi,editar')->group(function () {
            Route::post('/', [RiesgoController::class, 'store']);
            Route::put('/{id}', [RiesgoController::class, 'update']);
        });
    });

    Route::prefix('solicitudes-cambio')->group(function () {
        Route::get('/', [SolicitudCambioController::class, 'index']);
        Route::middleware('modulo:pmi,editar')->group(function () {
            Route::post('/', [SolicitudCambioController::class, 'store']);
            Route::post('/{id}/evaluar', [SolicitudCambioController::class, 'evaluar']);
        });
    });

    Route::prefix('cierres-obra')->group(function () {
        Route::get('/{obraId}', [CierreObraController::class, 'show']);
        Route::middleware('modulo:pmi,editar')->group(function () {
            Route::post('/{obraId}/iniciar', [CierreObraController::class, 'iniciarCierre']);
            Route::post('/{obraId}/finalizar', [CierreObraController::class, 'finalizar']);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Personal, SST, Calidad y Medio Ambiente
    |--------------------------------------------------------------------------
    */

    Route::prefix('personal')->group(function () {
        Route::get('/trabajadores', [PersonalController::class, 'indexTrabajadores']);
        Route::get('/asistencias', [PersonalController::class, 'indexAsistencias']);
        Route::middleware('modulo:personal,editar')->group(function () {
            Route::post('/trabajadores', [PersonalController::class, 'storeTrabajador']);
            Route::post('/marcaciones', [PersonalController::class, 'storeMarcacion']);
            Route::post('/planillas/generar', [PersonalController::class, 'generarPlanilla']);
        });
    });

    Route::prefix('sst')->group(function () {
        Route::get('/incidentes', [SstController::class, 'indexIncidentes']);
        Route::get('/epp-asignaciones', [SstController::class, 'indexEppAsignaciones']);
        Route::get('/capacitaciones', [SstController::class, 'indexCapacitaciones']);
        Route::middleware('modulo:personal,editar')->group(function () {
            Route::post('/incidentes', [SstController::class, 'storeIncidente']);
            Route::post('/epp-asignaciones', [SstController::class, 'storeEppAsignacion']);
            Route::post('/capacitaciones', [SstController::class, 'storeCapacitacion']);
        });
    });

    Route::prefix('calidad')->group(function () {
        Route::get('/observaciones', [CalidadController::class, 'indexObservaciones']);
        Route::middleware('modulo:calidad,editar')->group(function () {
            Route::post('/observaciones', [CalidadController::class, 'storeObservacion']);
            Route::post('/observaciones/{id}/levantar', [CalidadController::class, 'levantarObservacion']);
        });
    });

    Route::prefix('ambiente')->group(function () {
        Route::get('/mediciones', [AmbienteController::class, 'indexMediciones']);
        Route::get('/residuos', [AmbienteController::class, 'indexResiduos']);
        Route::middleware('modulo:calidad,editar')->group(function () {
            Route::post('/mediciones', [AmbienteController::class, 'storeMedicion']);
            Route::post('/residuos', [AmbienteController::class, 'storeResiduo']);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Administración (Usuarios, accesos y parámetros)
    |--------------------------------------------------------------------------
    */

    Route::prefix('usuarios')->group(function () {
        Route::get('/', [UsuarioController::class, 'index']);
        Route::middleware('modulo:admin,editar')->group(function () {
            Route::post('/', [UsuarioController::class, 'store']);
            Route::put('/{usuario}', [UsuarioController::class, 'update']);
        });
    });

    Route::prefix('parametros')->group(function () {
        Route::get('/', [ParametroSistemaController::class, 'index']);
        Route::middleware('modulo:admin,editar')->group(function () {
            Route::post('/', [ParametroSistemaController::class, 'store']);
            Route::put('/{parametro}', [ParametroSistemaController::class, 'update']);
            Route::delete('/{parametro}', [ParametroSistemaController::class, 'destroy']);
        });
    });

    Route::prefix('solicitudes-acceso')->group(function () {
        Route::middleware('modulo:admin,editar')->group(function () {
            Route::post('/{solicitud}/aprobar', [SolicitudAccesoController::class, 'aprobar']);
            Route::post('/{solicitud}/rechazar', [SolicitudAccesoController::class, 'rechazar']);
        });
    });

    Route::prefix('admin/fases')->group(function () {
        Route::get('/', [FaseConfigController::class, 'index']);
        Route::middleware('modulo:admin,editar')->group(function () {
            Route::post('/requisitos', [FaseConfigController::class, 'storeRequisito']);
            Route::put('/requisitos/{requisito}', [FaseConfigController::class, 'updateRequisito']);
            Route::delete('/requisitos/{requisito}', [FaseConfigController::class, 'destroyRequisito']);
            Route::post('/criterios', [FaseConfigController::class, 'storeCriterio']);
            Route::put('/criterios/{criterio}', [FaseConfigController::class, 'updateCriterio']);
            Route::delete('/criterios/{criterio}', [FaseConfigController::class, 'destroyCriterio']);
        });
    });
});
