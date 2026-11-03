"""Contratos de entrada y salida del motor predictivo."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConfiguracionAnalitica(BaseModel):
    """Parámetros globales del cálculo."""

    model_config = ConfigDict(extra="forbid")

    costo_mantenimiento_pct: float = Field(default=0.18, gt=0, le=1)
    nivel_servicio: float = Field(default=0.95, gt=0.5, lt=1)
    nivel_servicio_clase_a: float = Field(default=0.975, gt=0.5, lt=1)
    horizonte_dias: int = Field(default=30, ge=1, le=365)
    min_dias_historia: int = Field(default=60, ge=14, le=730)


class SerieEntrada(BaseModel):
    """Serie de demanda de un par almacén-material."""

    model_config = ConfigDict(extra="forbid")

    almacen_id: int
    material_id: int
    unidad: str = "UND"
    fechas: list[date]
    cantidades: list[float]
    stock_actual: float = 0.0
    stock_maximo: float | None = None
    punto_reorden_vigente: float | None = None
    lead_time_dias: float | None = Field(default=None, ge=0)
    costo_pedido: float | None = Field(default=None, ge=0)
    precio_unitario: float | None = Field(default=None, ge=0)
    nivel_servicio: float | None = Field(default=None, gt=0.5, lt=1)

    @field_validator("cantidades")
    @classmethod
    def cantidades_no_negativas(cls, cantidades: list[float]) -> list[float]:
        if any(cantidad < 0 for cantidad in cantidades):
            raise ValueError("Las cantidades no pueden ser negativas.")
        return cantidades

    @field_validator("fechas")
    @classmethod
    def fechas_ordenadas(cls, fechas: list[date]) -> list[date]:
        if fechas != sorted(fechas):
            raise ValueError("Las fechas deben venir en orden ascendente.")
        return fechas

    def validar_longitud(self) -> None:
        if len(self.fechas) != len(self.cantidades):
            raise ValueError(
                "La serie debe tener la misma cantidad de fechas y de valores."
            )


class ParametrosRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    series: list[SerieEntrada]
    configuracion: ConfiguracionAnalitica = ConfiguracionAnalitica()


class PronosticoRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    series: list[SerieEntrada]
    horizonte_dias: int = Field(default=30, ge=1, le=365)
    configuracion: ConfiguracionAnalitica = ConfiguracionAnalitica()


class EscenarioSimulacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lead_time_dias: float = Field(ge=0.1)
    costo_pedido: float = Field(gt=0)
    nivel_servicio: float = Field(gt=0.5, lt=1)


class SimulacionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    serie: SerieEntrada
    escenario: EscenarioSimulacion


class PipelineRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    series: list[SerieEntrada]
    configuracion: ConfiguracionAnalitica = ConfiguracionAnalitica()


class ParametroCalculado(BaseModel):
    almacen_id: int
    material_id: int
    unidad: str
    clase_abc: str
    clase_xyz: str
    clase_combinada: str
    coeficiente_variacion: float
    demanda_media_diaria: float
    demanda_anual: float
    eoq: float | None
    costo_total_relevante: float | None
    stock_seguridad: float | None
    punto_reorden: float | None
    lead_time_dias: float | None
    nivel_servicio: float
    estado: str
    modelo_version: str


class ParametrosResponse(BaseModel):
    parametros: list[ParametroCalculado]
    modelo_version: str


class PronosticoSerie(BaseModel):
    almacen_id: int
    material_id: int
    fechas: list[date]
    valores: list[float]
    limite_inferior: list[float]
    limite_superior: list[float]
    mape: float | None
    rmse: float
    metodo_usado: str
    baja_confianza: bool
    modelo_version: str


class PronosticoResponse(BaseModel):
    pronosticos: list[PronosticoSerie]
    modelo_version: str


class SimulacionResponse(BaseModel):
    parametros: ParametroCalculado
    escenario: EscenarioSimulacion
    delta_eoq: float | None
    delta_punto_reorden: float | None
    modelo_version: str


class Alerta(BaseModel):
    almacen_id: int
    material_id: int
    tipo: str
    severidad: str
    fecha_estimada: date | None
    cantidad_sugerida: float | None
    detalle: str
    clave_idempotente: str


class PipelineResponse(BaseModel):
    parametros: list[ParametroCalculado]
    pronosticos: list[PronosticoSerie]
    alertas: list[Alerta]
    resumen: dict[str, int]
    modelo_version: str


class HealthResponse(BaseModel):
    status: str
    service_version: str
    model_version: str
