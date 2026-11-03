<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('analitica:ejecutar --origen=programado')
    ->hourly()
    ->withoutOverlapping(60);

Schedule::command('tracking:evaluar-alertas')
    ->everyFiveMinutes()
    ->withoutOverlapping(10);

Schedule::command('tracking:purgar')
    ->dailyAt('03:00')
    ->withoutOverlapping(30);
