<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Dataset demo de producción.
 *
 * Es idempotente a nivel de dataset: si el programa ya existe, no vuelve a
 * sembrar. Para recrear desde cero se usa `migrate:fresh --seed`.
 */
class DemoProduccionSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('programas')->exists()) {
            $this->command?->warn('El dataset demo de producción ya existe; se omite.');

            return;
        }

        $this->call([
            EjemploValleMantaroSeeder::class,
            AnaliticaDemoSeeder::class,
        ]);
    }
}
