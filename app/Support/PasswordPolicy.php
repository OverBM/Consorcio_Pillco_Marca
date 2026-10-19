<?php

namespace App\Support;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Política de contraseña reutilizable.
 *
 * Se usa como regla de validación (`new PasswordPolicy`) al registrar una
 * cuenta o al cambiar la contraseña, y expone las reglas de forma estructurada
 * para que el medidor en vivo de `/login` las represente en el cliente.
 */
class PasswordPolicy implements ValidationRule
{
    /**
     * Claves de las reglas que componen la política.
     *
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return ['length', 'upper', 'lower', 'number', 'symbol'];
    }

    /**
     * Etiquetas legibles de cada regla de la política.
     *
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            'length' => 'Mínimo '.static::minLength().' caracteres',
            'upper' => 'Al menos una letra mayúscula',
            'lower' => 'Al menos una letra minúscula',
            'number' => 'Al menos un número',
            'symbol' => 'Al menos un símbolo',
        ];
    }

    public static function minLength(): int
    {
        return (int) config('auth.policy.min_length', 8);
    }

    /**
     * Evalúa cada regla de la política contra un valor dado.
     *
     * @return array<string, bool> clave de regla => cumple
     */
    public static function evaluate(?string $value): array
    {
        $value = (string) $value;

        return [
            'length' => mb_strlen($value) >= static::minLength(),
            'upper' => preg_match('/[A-Z]/u', $value) === 1,
            'lower' => preg_match('/[a-z]/u', $value) === 1,
            'number' => preg_match('/\d/u', $value) === 1,
            'symbol' => preg_match('/[^A-Za-z0-9]/u', $value) === 1,
        ];
    }

    /**
     * Devuelve las etiquetas de las reglas no cumplidas.
     *
     * @return array<int, string>
     */
    public static function failures(?string $value): array
    {
        $labels = static::labels();
        $fallos = [];

        foreach (static::evaluate($value) as $key => $cumple) {
            if (! $cumple) {
                $fallos[] = $labels[$key];
            }
        }

        return $fallos;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            $fail('La contraseña es obligatoria.');

            return;
        }

        $fallos = static::failures($value);

        if ($fallos !== []) {
            $fail('La contraseña debe cumplir: '.implode(', ', $fallos).'.');
        }
    }
}
