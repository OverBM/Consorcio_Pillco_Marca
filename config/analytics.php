<?php

return [
    'base_url' => env('ANALYTICS_BASE_URL', 'http://127.0.0.1:8001'),
    'token' => env('ANALYTICS_API_TOKEN', 'dev-token'),
    'timeout' => (int) env('ANALYTICS_TIMEOUT', 120),
    'retries' => (int) env('ANALYTICS_RETRIES', 3),
];
