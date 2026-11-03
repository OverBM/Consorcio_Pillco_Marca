from __future__ import annotations

import pytest

from app.domain.clasificacion import (
    clasificar_abc,
    clasificar_xyz,
    coeficiente_variacion,
)


def test_clasifica_abc_por_participacion_acumulada() -> None:
    clases = clasificar_abc({1: 80.0, 2: 15.0, 3: 5.0})

    assert clases == {1: "A", 2: "B", 3: "C"}


def test_materiales_sin_consumo_no_se_omiten() -> None:
    clases = clasificar_abc({1: 0.0, 2: 0.0})

    assert clases == {1: "sin_consumo", 2: "sin_consumo"}


@pytest.mark.parametrize(
    ("cantidades", "esperado"),
    [
        ([10, 10, 10, 10], "X"),
        ([10, 40, 10, 40], "Y"),
        ([0, 0, 0, 100], "Z"),
    ],
)
def test_clasifica_xyz_por_coeficiente(cantidades: list[float], esperado: str) -> None:
    assert clasificar_xyz(coeficiente_variacion(cantidades)) == esperado


def test_coeficiente_variacion_de_serie_constante_es_cero() -> None:
    assert coeficiente_variacion([5, 5, 5]) == 0.0
