<?php

return [
    'driver' => env('RUTEO_DRIVER', 'ors'),

    'ors' => [
        'key' => env('ORS_API_KEY'),
        'base_url' => env('RUTEO_BASE_URL', 'https://api.openrouteservice.org'),
    ],

    'osrm' => [
        'base_url' => env('OSRM_BASE_URL', 'https://router.project-osrm.org'),
    ],

    'factor_ruta' => (float) env('RUTEO_FACTOR_RUTA', 1.35),
    'velocidad_kmh' => (float) env('RUTEO_VELOCIDAD_KMH', 35),
    'presupuesto_diario' => (int) env('RUTEO_PRESUPUESTO_DIARIO', 1500),
    'cache_ttl' => (int) env('RUTEO_CACHE_TTL', 86400),
    'geo_cache_ttl' => (int) env('RUTEO_GEO_CACHE_TTL', 2592000),
    'fallos_para_abrir' => 3,
    'circuito_minutos' => 5,
];
