// Validación en vivo del formulario público /registro.
// Refleja, mientras el usuario escribe, qué regla cumple (verde) y cuál no (rojo),
// con el mismo patrón que el medidor de contraseña de /login.

const formRegistro = document.querySelector(
    'form[aria-label="Solicitud de acceso"]',
);

if (formRegistro) {
    const RUC_PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const RUC_PREFIJOS = ['10', '15', '16', '17', '20'];

    const rucVerificadorValido = (valor) => {
        if (!/^\d{11}$/.test(valor)) return false;

        let suma = 0;
        for (let i = 0; i < 10; i += 1) {
            suma += Number(valor[i]) * RUC_PESOS[i];
        }

        let digito = 11 - (suma % 11);
        if (digito === 10) digito = 0;
        if (digito === 11) digito = 1;

        return digito === Number(valor[10]);
    };

    const CAMPOS = {
        nombre_completo: {
            min: (v) => v.trim().length >= 5,
            formato: (v) => /^[\p{L}\s.'-]+$/u.test(v.trim()),
        },
        email: {
            formato: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()),
        },
        dni: {
            digitos: (v) => /^\d{8}$/.test(v.trim()),
        },
        telefono: {
            min: (v) => v.trim().length >= 6,
            formato: (v) => /^[0-9+\-\s()]+$/.test(v.trim()),
        },
        empresa: {
            min: (v) => v.trim().length >= 2,
        },
        ruc: {
            length: (v) => v.trim().length === 11,
            digits: (v) => /^\d+$/.test(v.trim()),
            prefijo: (v) => RUC_PREFIJOS.includes(v.trim().slice(0, 2)),
            verificador: (v) => rucVerificadorValido(v.trim()),
        },
        cargo: {
            max: (v) => v.trim().length <= 150,
        },
        rol_solicitado: {
            seleccion: (v) => v !== '',
        },
        motivo: {
            min: (v) => v.trim().length >= 10,
        },
    };

    const campos = Object.keys(CAMPOS)
        .map((nombre) => {
            const control = formRegistro.elements.namedItem(nombre);
            const lista = formRegistro.querySelector(
                `.field-policy[data-policy="${nombre}"]`,
            );

            if (!control || !lista || !('value' in control)) return null;

            return {
                nombre,
                control,
                lista,
                items: [...lista.querySelectorAll('[data-rule]')],
            };
        })
        .filter(Boolean);

    const evaluar = (campo, forzarVista = false) => {
        const valor = campo.control.value;
        const reglas = CAMPOS[campo.nombre];
        let valido = true;

        campo.items.forEach((item) => {
            const prueba = reglas[item.dataset.rule];
            const cumple = typeof prueba === 'function' ? prueba(valor) : false;

            item.classList.toggle('is-met', cumple);
            if (!cumple) valido = false;
        });

        const lleno = valor.trim().length > 0;
        campo.lista.hidden = !(
            forzarVista ||
            lleno ||
            document.activeElement === campo.control
        );
        campo.control.classList.toggle('is-invalid', lleno && !valido);
        campo.control.setAttribute(
            'aria-invalid',
            lleno && !valido ? 'true' : 'false',
        );

        return valido;
    };

    campos.forEach((campo) => {
        const manejar = () => evaluar(campo);

        campo.control.addEventListener('input', manejar);
        campo.control.addEventListener('change', manejar);
        campo.control.addEventListener('focus', manejar);
        campo.control.addEventListener('blur', () => {
            evaluar(campo);
            if (campo.control.value.trim() === '') campo.lista.hidden = true;
        });

        evaluar(campo);
    });

    formRegistro.addEventListener('submit', (evento) => {
        let primerInvalido = null;

        campos.forEach((campo) => {
            if (!evaluar(campo, true) && !primerInvalido) {
                primerInvalido = campo.control;
            }
        });

        if (primerInvalido) {
            evento.preventDefault();
            primerInvalido.focus();
        }
    });
}
