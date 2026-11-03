from __future__ import annotations

from app.domain.pronostico import pronosticar


def test_pronostico_devuelve_horizonte_completo() -> None:
    cantidades = [20 + (indice % 7) for indice in range(90)]
    resultado = pronosticar(cantidades, 30)

    assert len(resultado.valores) == 30
    assert len(resultado.limite_inferior) == 30
    assert len(resultado.limite_superior) == 30
    assert all(valor >= 0 for valor in resultado.valores)


def test_serie_corta_usa_media_movil() -> None:
    resultado = pronosticar([10, 12, 11, 13], 7)

    assert resultado.metodo_usado == "media_movil"
    assert resultado.mape is not None


def test_serie_constante_es_deterministica() -> None:
    resultado = pronosticar([5] * 90, 14)

    assert resultado.metodo_usado == "media_movil"
    assert resultado.valores == [5.0] * 14
    assert resultado.mape == 0.0


def test_banda_de_confianza_rodea_el_pronostico() -> None:
    cantidades = [20 + ((indice * 3) % 11) for indice in range(120)]
    resultado = pronosticar(cantidades, 15)

    for valor, inferior, superior in zip(
        resultado.valores, resultado.limite_inferior, resultado.limite_superior
    ):
        assert inferior <= valor <= superior
