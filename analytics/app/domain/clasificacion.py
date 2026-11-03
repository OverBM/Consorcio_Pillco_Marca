"""Clasificación ABC por valor de consumo y XYZ por variabilidad.

Referencias:
- ABC: principio de Pareto aplicado al valor de consumo anual.
- XYZ: coeficiente de variación de la demanda (desviación / media).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

LIMITE_A = 0.80
LIMITE_B = 0.95
LIMITE_X = 0.50
LIMITE_Y = 1.00


@dataclass(frozen=True)
class ResultadoClasificacion:
    clase_abc: str
    clase_xyz: str
    coeficiente_variacion: float
    valor_consumo: float

    @property
    def clase_combinada(self) -> str:
        return f"{self.clase_abc}{self.clase_xyz}"


def clasificar_abc(valores_consumo: dict[int, float]) -> dict[int, str]:
    """Clasifica materiales por participación acumulada del valor de consumo."""
    total = sum(max(valor, 0.0) for valor in valores_consumo.values())

    if total <= 0:
        return {material_id: "sin_consumo" for material_id in valores_consumo}

    ordenados = sorted(
        valores_consumo.items(), key=lambda item: (-item[1], item[0])
    )
    acumulado = 0.0
    clases: dict[int, str] = {}

    for material_id, valor in ordenados:
        acumulado += max(valor, 0.0)
        participacion = acumulado / total

        if participacion <= LIMITE_A:
            clases[material_id] = "A"
        elif participacion <= LIMITE_B:
            clases[material_id] = "B"
        else:
            clases[material_id] = "C"

    return clases


def coeficiente_variacion(cantidades: list[float]) -> float:
    """Calcula la desviación estándar poblacional dividida por la media."""
    if not cantidades:
        return 0.0

    media = sum(cantidades) / len(cantidades)
    if media <= 0:
        return 0.0

    varianza = sum((cantidad - media) ** 2 for cantidad in cantidades) / len(cantidades)

    return math.sqrt(varianza) / media


def clasificar_xyz(coeficiente: float) -> str:
    """Clasifica la variabilidad de la demanda."""
    if coeficiente <= LIMITE_X:
        return "X"
    if coeficiente <= LIMITE_Y:
        return "Y"

    return "Z"


def clasificar_serie(
    material_id: int,
    cantidades: list[float],
    valor_consumo: float,
    clases_abc: dict[int, str],
) -> ResultadoClasificacion:
    """Combina la clasificación ABC del período con la XYZ de la serie."""
    cv = coeficiente_variacion(cantidades)

    return ResultadoClasificacion(
        clase_abc=clases_abc.get(material_id, "C"),
        clase_xyz=clasificar_xyz(cv),
        coeficiente_variacion=round(cv, 6),
        valor_consumo=round(max(valor_consumo, 0.0), 4),
    )
