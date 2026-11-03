"""Detección de alertas tempranas de abastecimiento."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from app.domain.inventario import ParametrosInventario
from app.domain.pronostico import ResultadoPronostico

UMBRAL_MAPE_BAJA_CONFIANZA = 40.0
DIAS_COBERTURA_SOBRESTOCK = 90


@dataclass(frozen=True)
class AlertaCalculada:
    tipo: str
    severidad: str
    fecha_estimada: date | None
    cantidad_sugerida: float | None
    detalle: str

    def clave(self, almacen_id: int, material_id: int) -> str:
        fecha = self.fecha_estimada.isoformat() if self.fecha_estimada else "sin_fecha"
        return f"{self.tipo}:{almacen_id}:{material_id}:{fecha}"


def _fecha_quiebre(
    pronostico: ResultadoPronostico,
    stock_actual: float,
    fecha_inicio: date,
) -> tuple[date | None, float]:
    acumulado = 0.0

    for indice, valor in enumerate(pronostico.valores):
        acumulado += valor
        if acumulado > stock_actual:
            return fecha_inicio + timedelta(days=indice), max(acumulado - stock_actual, 0.0)

    return None, 0.0


def detectar_alertas(
    almacen_id: int,
    material_id: int,
    parametros: ParametrosInventario,
    pronostico: ResultadoPronostico,
    stock_actual: float,
    fecha_inicio: date,
    lead_time_dias: float | None,
    eoq: float | None,
) -> list[tuple[AlertaCalculada, str]]:
    """Genera alertas candidatas con su clave idempotente."""
    alertas: list[tuple[AlertaCalculada, str]] = []

    def agregar(alerta: AlertaCalculada) -> None:
        alertas.append((alerta, alerta.clave(almacen_id, material_id)))

    if parametros.estado == "parametros_incompletos":
        agregar(
            AlertaCalculada(
                tipo="parametros_incompletos",
                severidad="alta",
                fecha_estimada=None,
                cantidad_sugerida=None,
                detalle="El material no tiene lead time o costo de pedido completo.",
            )
        )

    if parametros.estado == "sin_demanda":
        return alertas

    if pronostico.mape is not None and pronostico.mape > UMBRAL_MAPE_BAJA_CONFIANZA:
        agregar(
            AlertaCalculada(
                tipo="baja_confianza",
                severidad="media",
                fecha_estimada=None,
                cantidad_sugerida=None,
                detalle=f"MAPE de {pronostico.mape:.1f}% supera el umbral de 40%.",
            )
        )

    if parametros.punto_reorden is not None and stock_actual <= parametros.punto_reorden:
        agregar(
            AlertaCalculada(
                tipo="bajo_punto_reorden",
                severidad="alta",
                fecha_estimada=fecha_inicio,
                cantidad_sugerida=round(max((eoq or 0.0), 0.0), 3),
                detalle=(
                    f"Stock {stock_actual:.2f} menor o igual al ROP "
                    f"{parametros.punto_reorden:.2f}."
                ),
            )
        )

    fecha_quiebre, faltante = _fecha_quiebre(pronostico, stock_actual, fecha_inicio)
    if fecha_quiebre is not None:
        dias = (fecha_quiebre - fecha_inicio).days
        agregar(
            AlertaCalculada(
                tipo="quiebre_proyectado",
                severidad="critica" if dias <= 7 else "alta",
                fecha_estimada=fecha_quiebre,
                cantidad_sugerida=round(max(faltante, eoq or 0.0), 3),
                detalle=f"Quiebre estimado en {dias} días con la demanda pronosticada.",
            )
        )

    cobertura_dias = (
        stock_actual / parametros.demanda_media_diaria
        if parametros.demanda_media_diaria > 0
        else 0.0
    )
    if cobertura_dias > DIAS_COBERTURA_SOBRESTOCK and lead_time_dias is not None:
        punto_reorden = parametros.punto_reorden or 0.0
        agregar(
            AlertaCalculada(
                tipo="sobrestock",
                severidad="media",
                fecha_estimada=None,
                cantidad_sugerida=round(max(stock_actual - punto_reorden, 0.0), 3),
                detalle=f"Cobertura de {cobertura_dias:.0f} días supera los 90 días.",
            )
        )

    return alertas
