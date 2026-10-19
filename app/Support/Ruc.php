<?php

namespace App\Support;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validación de RUC peruano.
 *
 * Un RUC válido tiene 11 dígitos: un prefijo de tipo de contribuyente
 * (10, 15, 16, 17 o 20) y un dígito verificador calculado con módulo 11.
 * Se usa como regla (`new Ruc`) y expone las reglas de forma estructurada
 * para representarlas en el cliente, igual que `PasswordPolicy`.
 */
class Ruc implements ValidationRule
{
    /**
     * Prefijos válidos según el tipo de contribuyente.
     *
     * @var array<int, string>
     */
    public const PREFIJOS = ['10', '15', '16', '17', '20'];

    /**
     * Pesos del dígito verificador (módulo 11).
     *
     * @var array<int, int>
     */
    private const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

    /**
     * Claves de las reglas que componen la validación.
     *
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return ['length', 'digits', 'prefijo', 'verificador'];
    }

    /**
     * Requisitos legibles de la validación (para el medidor en vivo).
     *
     * @return array<string, string>
     */
    public static function requisitos(): array
    {
        return [
            'length' => 'Debe tener 11 dígitos',
            'digits' => 'Solo números',
            'prefijo' => 'Prefijo válido (10, 15, 16, 17 o 20)',
            'verificador' => 'Dígito verificador válido',
        ];
    }

    /**
     * Motivos de rechazo legibles de cada regla.
     *
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            'length' => 'no tiene 11 dígitos',
            'digits' => 'contiene caracteres que no son números',
            'prefijo' => 'el prefijo no es válido (debe ser 10, 15, 16, 17 o 20)',
            'verificador' => 'el dígito verificador no coincide',
        ];
    }

    /**
     * Evalúa cada regla contra un valor dado.
     *
     * @return array<string, bool> clave de regla => cumple
     */
    public static function evaluate(?string $value): array
    {
        $valor = trim((string) $value);
        $soloDigitos = $valor !== '' && ctype_digit($valor);
        $prefijo = substr($valor, 0, 2);

        return [
            'length' => strlen($valor) === 11,
            'digits' => $soloDigitos,
            'prefijo' => $soloDigitos && in_array($prefijo, self::PREFIJOS, true),
            'verificador' => self::digitoVerificadorValido($valor),
        ];
    }

    public static function esValido(?string $value): bool
    {
        return ! in_array(false, self::evaluate($value), true);
    }

    /**
     * Devuelve las etiquetas de las reglas no cumplidas.
     *
     * @return array<int, string>
     */
    public static function failures(?string $value): array
    {
        $labels = self::labels();
        $fallos = [];

        foreach (self::evaluate($value) as $key => $cumple) {
            if (! $cumple) {
                $fallos[] = $labels[$key];
            }
        }

        return $fallos;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || trim($value) === '') {
            $fail('El RUC es obligatorio.');

            return;
        }

        if (! self::esValido($value)) {
            $fail('El RUC no es válido: '.implode(', ', self::failures($value)).'.');
        }
    }

    /**
     * Comprueba el dígito verificador mediante el algoritmo módulo 11.
     */
    private static function digitoVerificadorValido(string $ruc): bool
    {
        if (strlen($ruc) !== 11 || ! ctype_digit($ruc)) {
            return false;
        }

        $suma = 0;

        for ($i = 0; $i < 10; $i++) {
            $suma += ((int) $ruc[$i]) * self::PESOS[$i];
        }

        $digito = 11 - ($suma % 11);

        if ($digito === 10) {
            $digito = 0;
        }

        if ($digito === 11) {
            $digito = 1;
        }

        return $digito === (int) $ruc[10];
    }
}
