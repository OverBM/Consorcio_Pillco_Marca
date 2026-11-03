"""Parámetros de inventario: EOQ, stock de seguridad, ROP y costo total.

Fórmulas implementadas (documentadas para la tesis):
- EOQ = sqrt(2 * D * S / H)
  D: demanda anual, S: costo de pedido, H: costo unitario de mantenimiento.
- SS  = Z * sigma_d * sqrt(L)
  sigma_d: desviación estándar de la demanda diaria, L: lead time en días.
- ROP = d_barra * L + SS
  d_barra: demanda media diaria.
- Costo total relevante = (D / Q) * S + (Q / 2) * H
"""

from __future__ import annotations

import math
from dataclasses import dataclass

DIAS_ANIO = 365.0


@dataclass(frozen=True)
class ParametrosInventario:
    eoq: float | None
    stock_seguridad: float | None
    punto_reorden: float | None
    costo_total_relevante: float | None
    demanda_media_diaria: float
    demanda_anual: float
    estado: str


def demanda_media_diaria(cantidades: list[float]) -> float:
    """Promedio simple de la demanda diaria del período analizado."""
    if not cantidades:
        return 0.0

    return sum(cantidades) / len(cantidades)


def desviacion_demanda(cantidades: list[float]) -> float:
    """Desviación estándar poblacional de la demanda diaria."""
    if len(cantidades) < 2:
        return 0.0

    media = demanda_media_diaria(cantidades)
    varianza = sum((cantidad - media) ** 2 for cantidad in cantidades) / len(cantidades)

    return math.sqrt(varianza)


def z_para_nivel_servicio(nivel_servicio: float) -> float:
    """Valor Z de la normal estándar para el nivel de servicio objetivo."""
    if not 0.5 < nivel_servicio < 1:
        raise ValueError("El nivel de servicio debe estar entre 0.5 y 1.")

    # Aproximación de la inversa de la normal (Acklam) para evitar scipy.
    p = nivel_servicio
    a = [-3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
         1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00]
    b = [-5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
         6.680131188771972e01, -1.328068155288572e01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
         -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00,
         3.754408661907416e00]
    p_baja = 0.02425
    p_alta = 1 - p_baja

    if p < p_baja:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1
        )

    if p > p_alta:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1
        )

    q = p - 0.5
    r = q * q

    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
        ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1
    )


def calcular_eoq(
    demanda_anual: float,
    costo_pedido: float,
    costo_mantenimiento_unitario: float,
) -> float:
    """Cantidad económica de pedido. Devuelve 0 si no hay demanda."""
    if demanda_anual <= 0:
        return 0.0
    if costo_pedido <= 0:
        raise ValueError("El costo de pedido debe ser mayor que cero.")
    if costo_mantenimiento_unitario <= 0:
        raise ValueError("El costo de mantenimiento debe ser mayor que cero.")

    return math.sqrt(2 * demanda_anual * costo_pedido / costo_mantenimiento_unitario)


def calcular_stock_seguridad(
    desviacion_diaria: float,
    lead_time_dias: float,
    z: float,
) -> float:
    """Stock de seguridad para cubrir la variabilidad durante el lead time."""
    if lead_time_dias <= 0:
        raise ValueError("El lead time debe ser mayor que cero.")

    return max(z * desviacion_diaria * math.sqrt(lead_time_dias), 0.0)


def calcular_punto_reorden(
    demanda_media: float,
    lead_time_dias: float,
    stock_seguridad: float,
) -> float:
    """Nivel de inventario que dispara un nuevo pedido."""
    return max(demanda_media * lead_time_dias + stock_seguridad, 0.0)


def calcular_costo_total(
    demanda_anual: float,
    eoq: float,
    costo_pedido: float,
    costo_mantenimiento_unitario: float,
) -> float:
    """Costo relevante de pedido más mantenimiento."""
    if eoq <= 0:
        return 0.0

    costo_pedidos = (demanda_anual / eoq) * costo_pedido
    costo_mantener = (eoq / 2) * costo_mantenimiento_unitario

    return costo_pedidos + costo_mantener


def calcular_parametros(
    cantidades: list[float],
    lead_time_dias: float | None,
    costo_pedido: float | None,
    precio_unitario: float | None,
    nivel_servicio: float,
    costo_mantenimiento_pct: float,
) -> ParametrosInventario:
    """Calcula el paquete completo de parámetros y su estado de calidad."""
    media = demanda_media_diaria(cantidades)
    anual = media * DIAS_ANIO

    if media <= 0:
        return ParametrosInventario(
            eoq=None,
            stock_seguridad=None,
            punto_reorden=None,
            costo_total_relevante=None,
            demanda_media_diaria=round(media, 4),
            demanda_anual=round(anual, 4),
            estado="sin_demanda",
        )

    if lead_time_dias is None or costo_pedido is None or precio_unitario is None:
        return ParametrosInventario(
            eoq=None,
            stock_seguridad=None,
            punto_reorden=None,
            costo_total_relevante=None,
            demanda_media_diaria=round(media, 4),
            demanda_anual=round(anual, 4),
            estado="parametros_incompletos",
        )

    costo_mantenimiento = precio_unitario * costo_mantenimiento_pct
    desviacion = desviacion_demanda(cantidades)
    z = z_para_nivel_servicio(nivel_servicio)

    eoq = calcular_eoq(anual, costo_pedido, costo_mantenimiento)
    seguridad = calcular_stock_seguridad(desviacion, lead_time_dias, z)
    reorden = calcular_punto_reorden(media, lead_time_dias, seguridad)
    costo_total = calcular_costo_total(anual, eoq, costo_pedido, costo_mantenimiento)

    return ParametrosInventario(
        eoq=round(eoq, 3),
        stock_seguridad=round(seguridad, 3),
        punto_reorden=round(reorden, 3),
        costo_total_relevante=round(costo_total, 3),
        demanda_media_diaria=round(media, 4),
        demanda_anual=round(anual, 4),
        estado="calculado",
    )
