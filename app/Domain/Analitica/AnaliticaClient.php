<?php

namespace App\Domain\Analitica;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente HTTP del microservicio predictivo. Laravel es el único que
 * interpreta y persiste la respuesta.
 */
class AnaliticaClient
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function pipeline(array $payload): array
    {
        $baseUrl = rtrim((string) config('analytics.base_url'), '/');
        $token = (string) config('analytics.token');

        $response = Http::withHeaders(['X-Internal-Token' => $token])
            ->timeout((int) config('analytics.timeout'))
            ->retry((int) config('analytics.retries'), 250, throw: false)
            ->post("{$baseUrl}/v1/pipeline", $payload);

        if ($response->failed()) {
            throw new RuntimeException(
                'El motor predictivo respondió con estado '.$response->status().'.'
            );
        }

        $resultado = $response->json();

        if (! is_array($resultado) || ! isset($resultado['parametros'], $resultado['pronosticos'])) {
            throw new RuntimeException('La respuesta del motor predictivo es inválida.');
        }

        return $resultado;
    }

    public function disponible(): bool
    {
        $baseUrl = rtrim((string) config('analytics.base_url'), '/');

        try {
            return Http::timeout(3)
                ->get("{$baseUrl}/health")
                ->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}
