from __future__ import annotations

import math

import pytest

from app.domain.inventario import (
    calcular_costo_total,
    calcular_eoq,
    calcular_parametros,
    calcular_punto_reorden,
    calcular_stock_seguridad,
    z_para_nivel_servicio,
)


def test_eoq_coincide_con_caso_calculado_a_mano() -> None:
    # sqrt(2 * 1000 * 50 / 10) = 100
    assert calcular_eoq(1000, 50, 10) == pytest.approx(100.0, abs=1e-9)


def test_stock_seguridad_coincide_con_formula() -> None:
    # 1.645 * 5 * sqrt(9) = 24.675
    assert calcular_stock_seguridad(5, 9, 1.645) == pytest.approx(24.675, abs=1e-9)


def test_punto_reorden_suma_demanda_y_seguridad() -> None:
    # 20 * 9 + 24.675 = 204.675
    assert calcular_punto_reorden(20, 9, 24.675) == pytest.approx(204.675, abs=1e-9)


def test_costo_total_relevante() -> None:
    # (1000/100)*50 + (100/2)*10 = 500 + 500 = 1000
    assert calcular_costo_total(1000, 100, 50, 10) == pytest.approx(1000.0)


@pytest.mark.parametrize(
    ("nivel", "esperado"),
    [(0.90, 1.2816), (0.95, 1.6449), (0.975, 1.9600)],
)
def test_z_para_nivel_servicio(nivel: float, esperado: float) -> None:
    assert z_para_nivel_servicio(nivel) == pytest.approx(esperado, abs=1e-3)


def test_parametros_marcan_sin_demanda() -> None:
    resultado = calcular_parametros([0] * 30, 9, 50, 10, 0.95, 0.18)

    assert resultado.estado == "sin_demanda"
    assert resultado.eoq is None


def test_parametros_marcan_incompletos_sin_lead_time() -> None:
    resultado = calcular_parametros([20] * 30, None, 50, 10, 0.95, 0.18)

    assert resultado.estado == "parametros_incompletos"


def test_parametros_completos_calculan_valores() -> None:
    resultado = calcular_parametros([20] * 30, 9, 50, 10, 0.95, 0.18)

    assert resultado.estado == "calculado"
    assert resultado.eoq is not None and resultado.eoq > 0
    assert resultado.punto_reorden is not None
    assert not math.isnan(resultado.punto_reorden)
