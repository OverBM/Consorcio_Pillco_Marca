// Medidor en vivo de la política de contraseña en /login.
// Refleja, mientras el usuario escribe, qué reglas cumple (verde) y cuáles no (rojo).

const passwordInput = document.querySelector("#login-password");
const policyList = document.querySelector("#password-policy");

if (passwordInput && policyList) {
  const RULES = {
    length: (value) => value.length >= 8,
    upper: (value) => /[A-Z]/.test(value),
    lower: (value) => /[a-z]/.test(value),
    number: (value) => /\d/.test(value),
    symbol: (value) => /[^A-Za-z0-9]/.test(value),
  };

  const items = [...policyList.querySelectorAll("[data-rule]")];

  const evaluar = () => {
    const value = passwordInput.value;
    policyList.hidden = value.length === 0;

    items.forEach((item) => {
      const rule = RULES[item.dataset.rule];
      const cumple = typeof rule === "function" ? rule(value) : false;
      item.classList.toggle("is-met", cumple);
    });
  };

  passwordInput.addEventListener("input", evaluar);
  passwordInput.addEventListener("focus", evaluar);
  passwordInput.addEventListener("blur", () => {
    if (passwordInput.value.length === 0) policyList.hidden = true;
  });

  evaluar();
}
