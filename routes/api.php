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
use App\Http\Controllers\Api\V1\InventarioFisicoController;
use App\Http\Controllers\Api\V1\MermaController;
use App\Http\Controllers\Api\V1\OrdenCompraController;
use App\Http\Controllers\Api\V1\PartidaController;
use App\Http\Controllers\Api\V1\PersonalController;
use App\Http\Controllers\Api\V1\ProveedorController;
use App\Http\Controllers\Api\V1\ProyectoController;
use App\Http\Controllers\Api\V1\RecepcionController;
use App\Http\Controllers\Api\V1\RequerimientoController;
use App\Http\Controllers\Api\V1\RiesgoController;
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
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::prefix('stock')->group(function () {
    Route::get('/', [StockController::class, 'index']);
    Route::get('/critico', [StockController::class, 'critico']);
    Route::get('/almacenes/{id}/kardex', [StockController::class, 'kardex']);
});

Route::prefix('recepciones')->group(function () {
    Route::get('/', [RecepcionController::class, 'index']);
    Route::post('/', [RecepcionController::class, 'store']);
    Route::get('/{id}', [RecepcionController::class, 'show']);
});

Route::prefix('solicitudes')->group(function () {
    Route::get('/', [SolicitudMaterialController::class, 'index']);
    Route::post('/', [SolicitudMaterialController::class, 'store']);
    Route::post('/{id}/atender', [SolicitudMaterialController::class, 'atender']);
});

Route::prefix('requerimientos')->group(function () {
    Route::get('/', [RequerimientoController::class, 'index']);
    Route::post('/', [RequerimientoController::class, 'store']);
    Route::post('/{id}/evaluar', [RequerimientoController::class, 'evaluar']);
});

Route::prefix('cotizaciones')->group(function () {
    Route::get('/', [CotizacionController::class, 'index']);
    Route::post('/', [CotizacionController::class, 'store']);
    Route::post('/{id}/seleccionar', [CotizacionController::class, 'seleccionar']);
});

Route::prefix('ordenes-compra')->group(function () {
    Route::get('/', [OrdenCompraController::class, 'index']);
    Route::post('/', [OrdenCompraController::class, 'store']);
});

Route::prefix('devoluciones')->group(function () {
    Route::get('/', [DevolucionController::class, 'index']);
    Route::post('/', [DevolucionController::class, 'store']);
});

Route::prefix('proveedores')->group(function () {
    Route::get('/', [ProveedorController::class, 'index']);
    Route::post('/', [ProveedorController::class, 'store']);
});

Route::prefix('busqueda-multialmacen')->group(function () {
    Route::post('/buscar', [BusquedaMultialmacenController::class, 'buscar']);
});

Route::prefix('transferencias')->group(function () {
    Route::get('/', [TransferenciaController::class, 'index']);
    Route::post('/', [TransferenciaController::class, 'store']);
    Route::post('/{id}/aprobar', [TransferenciaController::class, 'aprobar']);
    Route::post('/{id}/confirmar-recepcion', [TransferenciaController::class, 'confirmarRecepcion']);
});

Route::prefix('despachos')->group(function () {
    Route::get('/', [DespachoController::class, 'index']);
    Route::post('/', [DespachoController::class, 'store']);
});

Route::prefix('mermas')->group(function () {
    Route::get('/', [MermaController::class, 'index']);
    Route::post('/', [MermaController::class, 'store']);
});

Route::prefix('inventario-fisico')->group(function () {
    Route::get('/', [InventarioFisicoController::class, 'index']);
    Route::post('/', [InventarioFisicoController::class, 'store']);
    Route::post('/{id}/conteos', [InventarioFisicoController::class, 'registrarConteosYAjustar']);
});

/*
|--------------------------------------------------------------------------
| Módulos Gestión de Proyectos PMI / PMU
|--------------------------------------------------------------------------
*/

Route::prefix('proyectos')->group(function () {
    Route::get('/', [ProyectoController::class, 'index']);
    Route::get('/{id}', [ProyectoController::class, 'show']);
    Route::post('/{id}/fases', [ProyectoController::class, 'gestionarFase']);
    Route::post('/{id}/hitos', [ProyectoController::class, 'crearHito']);
});

Route::prefix('avances-fisicos')->group(function () {
    Route::get('/', [AvanceFisicoController::class, 'index']);
    Route::post('/', [AvanceFisicoController::class, 'store']);
});

Route::prefix('partidas')->group(function () {
    Route::get('/', [PartidaController::class, 'index']);
    Route::post('/', [PartidaController::class, 'store']);
});

Route::prefix('valorizaciones')->group(function () {
    Route::get('/', [ValorizacionController::class, 'index']);
    Route::post('/', [ValorizacionController::class, 'store']);
    Route::post('/{id}/aprobar', [ValorizacionController::class, 'aprobar']);
});

Route::prefix('riesgos')->group(function () {
    Route::get('/', [RiesgoController::class, 'index']);
    Route::post('/', [RiesgoController::class, 'store']);
    Route::put('/{id}', [RiesgoController::class, 'update']);
});

Route::prefix('solicitudes-cambio')->group(function () {
    Route::get('/', [SolicitudCambioController::class, 'index']);
    Route::post('/', [SolicitudCambioController::class, 'store']);
    Route::post('/{id}/evaluar', [SolicitudCambioController::class, 'evaluar']);
});

Route::prefix('cierres-obra')->group(function () {
    Route::get('/{obraId}', [CierreObraController::class, 'show']);
    Route::post('/{obraId}/iniciar', [CierreObraController::class, 'iniciarCierre']);
    Route::post('/{obraId}/finalizar', [CierreObraController::class, 'finalizar']);
});

/*
|--------------------------------------------------------------------------
| Módulos Personal, SST, Calidad y Medio Ambiente
|--------------------------------------------------------------------------
*/

Route::prefix('personal')->group(function () {
    Route::get('/trabajadores', [PersonalController::class, 'indexTrabajadores']);
    Route::post('/trabajadores', [PersonalController::class, 'storeTrabajador']);
    Route::post('/marcaciones', [PersonalController::class, 'storeMarcacion']);
    Route::get('/asistencias', [PersonalController::class, 'indexAsistencias']);
    Route::post('/planillas/generar', [PersonalController::class, 'generarPlanilla']);
});

Route::prefix('sst')->group(function () {
    Route::get('/incidentes', [SstController::class, 'indexIncidentes']);
    Route::post('/incidentes', [SstController::class, 'storeIncidente']);
    Route::get('/epp-asignaciones', [SstController::class, 'indexEppAsignaciones']);
    Route::post('/epp-asignaciones', [SstController::class, 'storeEppAsignacion']);
    Route::get('/capacitaciones', [SstController::class, 'indexCapacitaciones']);
    Route::post('/capacitaciones', [SstController::class, 'storeCapacitacion']);
});

Route::prefix('calidad')->group(function () {
    Route::get('/observaciones', [CalidadController::class, 'indexObservaciones']);
    Route::post('/observaciones', [CalidadController::class, 'storeObservacion']);
    Route::post('/observaciones/{id}/levantar', [CalidadController::class, 'levantarObservacion']);
});

Route::prefix('ambiente')->group(function () {
    Route::get('/mediciones', [AmbienteController::class, 'indexMediciones']);
    Route::post('/mediciones', [AmbienteController::class, 'storeMedicion']);
    Route::get('/residuos', [AmbienteController::class, 'indexResiduos']);
    Route::post('/residuos', [AmbienteController::class, 'storeResiduo']);
});

/*
|--------------------------------------------------------------------------
| Módulo de Administración (Usuarios y Accesos)
|--------------------------------------------------------------------------
*/

Route::prefix('usuarios')->group(function () {
    Route::get('/', [UsuarioController::class, 'index']);
    Route::post('/', [UsuarioController::class, 'store']);
    Route::put('/{usuario}', [UsuarioController::class, 'update']);
});
