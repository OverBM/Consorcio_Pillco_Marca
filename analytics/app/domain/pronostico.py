"""Pronóstico de demanda con suavizado exponencial y métricas de error."""

from __future__ import annotations

import math
import warnings
from dataclasses import dataclass

import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing

MIN_DIAS_ESTACIONAL = 14
ESTACIONALIDAD = 7


@dataclass(frozen=True)
class ResultadoPronostico:
    valores: list[float]
    limite_inferior: list[float]
    limite_superior: list[float]
    mape: float | None
    rmse: float
    metodo_usado: str


def _metricas(real: list[float], ajustado: list[float]) -> tuple[float | None, float]:
    pares = [
        (r, a)
        for r, a in zip(real, ajustado, strict=False)
        if not math.isnan(a)
    ]
    if not pares:
        return None, 0.0

    errores = [abs(r - a) for r, a in pares]
    rmse = math.sqrt(sum(error**2 for error in errores) / len(errores))

    con_demanda = [(r, a) for r, a in pares if r > 0]
    if not con_demanda:
        return None, rmse

    mape = (
        sum(abs((r - a) / r) for r, a in con_demanda) / len(con_demanda)
    ) * 100

    return round(mape, 4), rmse


def _banda(valores: list[float], residuo_std: float) -> tuple[list[float], list[float]]:
    inferior: list[float] = []
    superior: list[float] = []

    for paso, valor in enumerate(valores, start=1):
        margen = 1.96 * residuo_std * math.sqrt(paso)
        inferior.append(round(max(valor - margen, 0.0), 4))
        superior.append(round(max(valor + margen, 0.0), 4))

    return inferior, superior


def _media_movil(cantidades: list[float], horizonte: int) -> ResultadoPronostico:
    ventana = min(7, len(cantidades)) or 1
    base = sum(cantidades[-ventana:]) / ventana
    valores = [round(base, 4)] * horizonte

    ajustado: list[float] = []
    for indice in range(len(cantidades)):
        inicio = max(0, indice - ventana)
        tramo = cantidades[inicio:indice] or [base]
        ajustado.append(sum(tramo) / len(tramo))

    mape, rmse = _metricas(cantidades, ajustado)
    residuos = [r - a for r, a in zip(cantidades, ajustado, strict=False)]
    residuo_std = float(np.std(residuos)) if residuos else 0.0
    inferior, superior = _banda(valores, residuo_std)

    return ResultadoPronostico(
        valores=valores,
        limite_inferior=inferior,
        limite_superior=superior,
        mape=mape,
        rmse=round(rmse, 4),
        metodo_usado="media_movil",
    )


def pronosticar(
    cantidades: list[float],
    horizonte_dias: int,
    min_dias_historia: int = 60,
) -> ResultadoPronostico:
    """Pronostica demanda diaria con Holt-Winters y fallback determinístico."""
    if not cantidades:
        return ResultadoPronostico(
            valores=[0.0] * horizonte_dias,
            limite_inferior=[0.0] * horizonte_dias,
            limite_superior=[0.0] * horizonte_dias,
            mape=None,
            rmse=0.0,
            metodo_usado="sin_datos",
        )

    serie = np.asarray(cantidades, dtype=float)

    if len(serie) < min_dias_historia or float(np.std(serie)) == 0.0:
        return _media_movil(cantidades, horizonte_dias)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")

        for estacional in (True, False):
            try:
                modelo = ExponentialSmoothing(
                    serie,
                    trend="add",
                    seasonal="add" if estacional else None,
                    seasonal_periods=ESTACIONALIDAD if estacional else None,
                    initialization_method="estimated",
                )
                ajuste = modelo.fit(optimized=True)
                valores = [
                    round(max(float(valor), 0.0), 4)
                    for valor in ajuste.forecast(horizonte_dias)
                ]
                ajustado = [float(valor) for valor in ajuste.fittedvalues]
                mape, rmse = _metricas(cantidades, ajustado)
                residuos = serie - np.asarray(ajustado, dtype=float)
                residuo_std = float(np.std(residuos)) if len(residuos) else 0.0
                inferior, superior = _banda(valores, residuo_std)

                return ResultadoPronostico(
                    valores=valores,
                    limite_inferior=inferior,
                    limite_superior=superior,
                    mape=mape,
                    rmse=round(rmse, 4),
                    metodo_usado=(
                        "holt_winters_estacional" if estacional else "holt_winters"
                    ),
                )
            except (ValueError, np.linalg.LinAlgError):
                continue

    return _media_movil(cantidades, horizonte_dias)
