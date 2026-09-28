<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'PanelGeneral')->name('panel');
Route::inertia('/stock', 'StockPage')->name('stock');
Route::inertia('/solicitudes', 'SolicitudesPage')->name('solicitudes');
Route::inertia('/compras', 'ComprasPage')->name('compras');
Route::inertia('/recepcion', 'RecepcionPage')->name('recepcion');
Route::inertia('/despachos', 'DespachosPage')->name('despachos');
Route::inertia('/transferencias', 'TransferenciasPage')->name('transferencias');
Route::inertia('/mermas', 'MermasPage')->name('mermas');
