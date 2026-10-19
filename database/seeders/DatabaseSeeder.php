<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,
            PermisoSeeder::class,
            ParametrosSeeder::class,
            FaseCatalogoSeeder::class,
            EjemploValleMantaroSeeder::class,
        ]);
    }
}
