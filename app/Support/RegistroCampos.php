<?php

namespace App\Support;

/**
 * Reglas de validación en vivo del formulario público `/registro`.
 *
 * Expone, por campo, las reglas que la interfaz refleja mientras el usuario
 * escribe (mismo patrón que `PasswordPolicy` en `/login`). Las reglas del
 * servidor siguen viviendo en `RegistroController@store`; esta lista solo
 * describe cómo representarlas en el cliente.
 */
class RegistroCampos
{
    /**
     * Clave de campo => (clave de regla => etiqueta legible).
     *
     * @return array<string, array<string, string>>
     */
    public static function reglas(): array
    {
        return [
            'nombre_completo' => [
                'min' => 'Al menos 5 caracteres',
                'formato' => 'Solo letras y espacios',
            ],
            'email' => [
                'formato' => 'Correo electrónico válido',
            ],
            'dni' => [
                'digitos' => 'Exactamente 8 dígitos',
            ],
            'telefono' => [
                'min' => 'Al menos 6 caracteres',
                'formato' => 'Solo números y los signos + - ( )',
            ],
            'empresa' => [
                'min' => 'Al menos 2 caracteres',
            ],
            'ruc' => Ruc::requisitos(),
            'cargo' => [
                'max' => 'Máximo 150 caracteres',
            ],
            'rol_solicitado' => [
                'seleccion' => 'Selecciona un rol',
            ],
            'motivo' => [
                'min' => 'Al menos 10 caracteres',
            ],
        ];
    }
}
