<?php

use App\Http\Controllers\Web\AuthWebController;
use App\Http\Controllers\Web\ComprasViewController;
use App\Http\Controllers\Web\ContextoController;
use App\Http\Controllers\Web\DashboardViewController;
use App\Http\Controllers\Web\LogisticaViewController;
use App\Http\Controllers\Web\PerfilController;
use App\Http\Controllers\Web\PersonalSstViewController;
use App\Http\Controllers\Web\PmiViewController;
use App\Http\Controllers\Web\ProyectoPublicoViewController;
use App\Http\Controllers\Web\RegistroController;
use App\Http\Controllers\Web\SolicitudesAccesoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes - Consorcio Pillco Marca
|--------------------------------------------------------------------------
| - / : Landing Page oficial corporativa de ObraFlow
| - /login : Página de Acceso Interno / Login de ObraFlow
| - /panel : Dashboard General SPA minimalista (y subrutas de módulos)
*/

Route::view('/', 'landing')->name('home');
Route::get('/proyectos/{id}', [ProyectoPublicoViewController::class, 'show'])
    ->whereNumber('id')
    ->name('proyecto.publico');
Route::get('/login', [AuthWebController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthWebController::class, 'login']);
Route::post('/logout', [AuthWebController::class, 'logout'])->name('logout');

// Registro público de solicitudes de acceso
Route::get('/registro', [RegistroController::class, 'show'])->name('registro');
Route::post('/registro', [RegistroController::class, 'store'])->name('registro.store');

// Rutas protegidas que requieren autenticación obligatoria
Route::middleware(['auth'])->group(function () {
    // Contexto operativo (obra / almacén activo)
    Route::post('/contexto', [ContextoController::class, 'update'])->name('contexto.update');

    // Perfil del usuario autenticado
    Route::get('/perfil', [PerfilController::class, 'show'])->name('perfil');
    Route::patch('/perfil', [PerfilController::class, 'update'])->name('perfil.update');
    Route::patch('/perfil/password', [PerfilController::class, 'updatePassword'])->name('perfil.password');

    // Panel Principal (visible para todos los roles autenticados)
    Route::middleware('modulo:panel')->group(function () {
        Route::get('/panel', [DashboardViewController::class, 'panel'])->name('panel');
    });

    // Programa (PMU)
    Route::middleware('modulo:programa')->group(function () {
        Route::get('/programa', [PmiViewController::class, 'programa'])->name('programa');
        Route::get('/programa/redistribucion', [PmiViewController::class, 'redistribucion'])->name('programa.redistribucion');
    });

    // Gestión de Obra (PMI)
    Route::middleware('modulo:pmi')->group(function () {
        Route::get('/gestion-obra/ciclo-vida', [PmiViewController::class, 'cicloVida'])->name('gestion-obra.ciclo-vida');
        Route::get('/gestion-obra/partidas', [PmiViewController::class, 'partidas'])->name('gestion-obra.partidas');
        Route::get('/gestion-obra/cronograma-evm', [PmiViewController::class, 'cronogramaEvm'])->name('gestion-obra.cronograma-evm');
        Route::get('/gestion-obra/valorizaciones', [PmiViewController::class, 'valorizaciones'])->name('gestion-obra.valorizaciones');
        Route::get('/gestion-obra/riesgos', [PmiViewController::class, 'riesgos'])->name('gestion-obra.riesgos');
        Route::get('/gestion-obra/cambios', [PmiViewController::class, 'cambios'])->name('gestion-obra.cambios');
        Route::get('/gestion-obra/cierre', [PmiViewController::class, 'cierre'])->name('gestion-obra.cierre');

        // Finanzas y Control (dominio de obra)
        Route::get('/finanzas/adelantos', [PersonalSstViewController::class, 'adelantos'])->name('finanzas.adelantos');
        Route::get('/finanzas/presupuesto', [PersonalSstViewController::class, 'presupuesto'])->name('finanzas.presupuesto');
    });

    // Almacén y Logística
    Route::middleware('modulo:logistica')->group(function () {
        Route::get('/stock', [LogisticaViewController::class, 'stock'])->name('stock');
        Route::get('/recepcion', [LogisticaViewController::class, 'recepcion'])->name('recepcion');
        Route::get('/solicitudes', [LogisticaViewController::class, 'solicitudes'])->name('solicitudes');
        Route::get('/despachos', [LogisticaViewController::class, 'despachos'])->name('despachos');
        Route::get('/transferencias', [LogisticaViewController::class, 'transferencias'])->name('transferencias');
        Route::get('/inventario-fisico', [LogisticaViewController::class, 'inventarioFisico'])->name('inventario-fisico');
        Route::get('/mermas', [LogisticaViewController::class, 'mermas'])->name('mermas');
    });

    // Compras y Proveedores
    Route::middleware('modulo:compras')->group(function () {
        Route::get('/compras', [ComprasViewController::class, 'index'])->name('compras');
        Route::get('/compras/requerimientos', [ComprasViewController::class, 'requerimientos'])->name('compras.requerimientos');
        Route::get('/compras/cotizaciones', [ComprasViewController::class, 'cotizaciones'])->name('compras.cotizaciones');
        Route::get('/compras/ordenes-compra', [ComprasViewController::class, 'ordenesCompra'])->name('compras.ordenes-compra');
        Route::get('/compras/proveedores', [ComprasViewController::class, 'proveedores'])->name('compras.proveedores');
        Route::get('/compras/devoluciones', [ComprasViewController::class, 'devoluciones'])->name('compras.devoluciones');
    });

    // Personal y SST
    Route::middleware('modulo:personal')->group(function () {
        Route::get('/personal/asistencia', [PersonalSstViewController::class, 'asistencia'])->name('personal.asistencia');
        Route::get('/personal/planillas', [PersonalSstViewController::class, 'planillas'])->name('personal.planillas');
        Route::get('/personal/capacitaciones', [PersonalSstViewController::class, 'capacitaciones'])->name('personal.capacitaciones');
        Route::get('/sst/incidentes', [PersonalSstViewController::class, 'incidentes'])->name('sst.incidentes');
        Route::get('/sst/epp', [PersonalSstViewController::class, 'epp'])->name('sst.epp');
    });

    // Calidad y Ambiente
    Route::middleware('modulo:calidad')->group(function () {
        Route::get('/calidad/observaciones', [PersonalSstViewController::class, 'calidad'])->name('calidad.observaciones');
        Route::get('/ambiente/monitoreo', [PersonalSstViewController::class, 'monitoreo'])->name('ambiente.monitoreo');
        Route::get('/ambiente/residuos', [PersonalSstViewController::class, 'residuos'])->name('ambiente.residuos');
    });

    // Administración
    Route::middleware('modulo:admin')->group(function () {
        Route::get('/admin/usuarios', [PersonalSstViewController::class, 'usuarios'])->name('admin.usuarios');
        Route::get('/admin/auditoria', [PersonalSstViewController::class, 'auditoria'])->name('admin.auditoria');
        Route::get('/admin/solicitudes', [SolicitudesAccesoController::class, 'index'])->name('admin.solicitudes');
        Route::get('/admin/parametros', [PmiViewController::class, 'parametros'])->name('admin.parametros');
        Route::get('/admin/fases', [PmiViewController::class, 'fases'])->name('admin.fases');
        Route::post('/admin/parametros', [PmiViewController::class, 'actualizarParametros'])
            ->middleware('modulo:admin,editar')
            ->name('admin.parametros.update');
    });
});
