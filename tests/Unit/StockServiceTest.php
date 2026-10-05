<?php

use App\Domain\Inventario\KardexService;
use App\Domain\Inventario\StockService;

test('StockService puede ser instanciado con su dependencia KardexService', function () {
    $kardexService = new KardexService;
    $stockService = new StockService($kardexService);

    expect($stockService)->toBeInstanceOf(StockService::class);
});
