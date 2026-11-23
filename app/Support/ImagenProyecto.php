<?php

namespace App\Support;

use App\Models\Obra;

/**
 * Imágenes referenciales de las obras públicas, con su texto alternativo
 * y el crédito exigido por la licencia de la fotografía.
 */
final class ImagenProyecto
{
    /**
     * @var array<string, array{archivo: string, alt: string, credito: string, credito_url: string}>
     */
    private const IMAGENES = [
        'OBR-01' => [
            'archivo' => '/assets/proyectos/ie-los-andes.jpg',
            'alt' => 'Aulas en construcción en un colegio peruano, imagen referencial del pabellón secundario',
            'credito' => 'QM Keen / Wikimedia Commons · CC BY-SA 4.0',
            'credito_url' => 'https://commons.wikimedia.org/wiki/File:Nuevos_salones_en_construcci%C3%B3n_en_el_Colegio_C%C3%A9sar_Vallejo_3098.jpg',
        ],
        'OBR-02' => [
            'archivo' => '/assets/proyectos/mejoramiento-vial.jpg',
            'alt' => 'Calle en mejoramiento vial con maquinaria y trabajadores, imagen referencial de la Av. Huancavelica',
            'credito' => 'Thayne Tuason / Wikimedia Commons · CC BY 4.0',
            'credito_url' => 'https://commons.wikimedia.org/wiki/File:Urubamba_Peru-_Road_construction.jpg',
        ],
        'OBR-03' => [
            'archivo' => '/assets/proyectos/complejo-chilca.jpg',
            'alt' => 'Estadio iluminado en Huancayo, imagen referencial del complejo recreacional y deportivo',
            'credito' => 'Tony Huanca / Wikimedia Commons · CC BY-SA 4.0',
            'credito_url' => 'https://commons.wikimedia.org/wiki/File:Estadio_Huancayo_Noche.jpg',
        ],
    ];

    /**
     * @return array{url: string, alt: string, credito: string, credito_url: string}|null
     */
    public static function para(Obra $obra): ?array
    {
        $clave = self::clavePara($obra);

        if ($clave === null) {
            return null;
        }

        $imagen = self::IMAGENES[$clave];

        return [
            'url' => $imagen['archivo'],
            'alt' => $imagen['alt'],
            'credito' => $imagen['credito'],
            'credito_url' => $imagen['credito_url'],
        ];
    }

    private static function clavePara(Obra $obra): ?string
    {
        if (isset(self::IMAGENES[$obra->codigo])) {
            return $obra->codigo;
        }

        $nombre = mb_strtolower((string) $obra->nombre);

        return match (true) {
            str_contains($nombre, 'los andes') => 'OBR-01',
            str_contains($nombre, 'huancavelica'),
            str_contains($nombre, 'vial') => 'OBR-02',
            str_contains($nombre, 'chilca'),
            str_contains($nombre, 'recreacional'),
            str_contains($nombre, 'deportivo') => 'OBR-03',
            default => null,
        };
    }
}
