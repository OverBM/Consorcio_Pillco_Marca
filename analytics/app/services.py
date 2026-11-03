"""Casos de uso del motor predictivo."""

from __future__ import annotations

from datetime import timedelta

from app.config import settings
from app.domain import alertas as alertas_domain
from app.domain import clasificacion, inventario, pronostico
from app.schemas import (
    Alerta,
    ConfiguracionAnalitica,
    EscenarioSimulacion,
    ParametroCalculado,
    ParametrosResponse,
    PipelineResponse,
    PronosticoResponse,
    PronosticoSerie,
    SerieEntrada,
    SimulacionResponse,
)


def _validar_lote(series: list[SerieEntrada]) -> None:
    if len(series) > settings.max_series_por_lote:
        raise ValueError(
            f"El lote supera el máximo de {settings.max_series_por_lote} series."
        )

    for serie in series:
        serie.validar_longitud()


def _clases_abc(series: list[SerieEntrada]) -> dict[int, str]:
    valores: dict[int, float] = {}

    for serie in series:
        precio = serie.precio_unitario if serie.precio_unitario is not None else 1.0
        valores[serie.material_id] = valores.get(serie.material_id, 0.0) + (
            sum(serie.cantidades) * precio
        )

    return clasificacion.clasificar_abc(valores)


def _nivel_servicio(serie: SerieEntrada, clase_abc: str, config: ConfiguracionAnalitica) -> float:
    if serie.nivel_servicio is not None:
        return serie.nivel_servicio
    if clase_abc == "A":
        return config.nivel_servicio_clase_a

    return config.nivel_servicio


def _parametro(
    serie: SerieEntrada,
    config: ConfiguracionAnalitica,
    clases_abc: dict[int, str],
) -> ParametroCalculado:
    valor_consumo = sum(serie.cantidades) * (
        serie.precio_unitario if serie.precio_unitario is not None else 1.0
    )
    clasificacion_serie = clasificacion.clasificar_serie(
        serie.material_id, serie.cantidades, valor_consumo, clases_abc
    )
    nivel = _nivel_servicio(serie, clasificacion_serie.clase_abc, config)
    parametros = inventario.calcular_parametros(
        cantidades=serie.cantidades,
        lead_time_dias=serie.lead_time_dias,
        costo_pedido=serie.costo_pedido,
        precio_unitario=serie.precio_unitario,
        nivel_servicio=nivel,
        costo_mantenimiento_pct=config.costo_mantenimiento_pct,
    )

    return ParametroCalculado(
        almacen_id=serie.almacen_id,
        material_id=serie.material_id,
        unidad=serie.unidad,
        clase_abc=clasificacion_serie.clase_abc,
        clase_xyz=clasificacion_serie.clase_xyz,
        clase_combinada=clasificacion_serie.clase_combinada,
        coeficiente_variacion=clasificacion_serie.coeficiente_variacion,
        demanda_media_diaria=parametros.demanda_media_diaria,
        demanda_anual=parametros.demanda_anual,
        eoq=parametros.eoq,
        costo_total_relevante=parametros.costo_total_relevante,
        stock_seguridad=parametros.stock_seguridad,
        punto_reorden=parametros.punto_reorden,
        lead_time_dias=serie.lead_time_dias,
        nivel_servicio=nivel,
        estado=parametros.estado,
        modelo_version=settings.model_version,
    )


def calcular_parametros(
    series: list[SerieEntrada], config: ConfiguracionAnalitica
) -> ParametrosResponse:
    _validar_lote(series)
    clases = _clases_abc(series)
    parametros = [_parametro(serie, config, clases) for serie in series]

    return ParametrosResponse(
        parametros=parametros, modelo_version=settings.model_version
    )


def _pronostico_serie(
    serie: SerieEntrada, horizonte: int, config: ConfiguracionAnalitica
) -> PronosticoSerie:
    resultado = pronostico.pronosticar(
        serie.cantidades, horizonte, config.min_dias_historia
    )
    ultima_fecha = serie.fechas[-1] if serie.fechas else None
    fechas = [
        (ultima_fecha + timedelta(days=paso)) if ultima_fecha else None
        for paso in range(1, horizonte + 1)
    ]

    return PronosticoSerie(
        almacen_id=serie.almacen_id,
        material_id=serie.material_id,
        fechas=[fecha for fecha in fechas if fecha is not None],
        valores=resultado.valores,
        limite_inferior=resultado.limite_inferior,
        limite_superior=resultado.limite_superior,
        mape=resultado.mape,
        rmse=resultado.rmse,
        metodo_usado=resultado.metodo_usado,
        baja_confianza=(
            resultado.mape is not None
            and resultado.mape > alertas_domain.UMBRAL_MAPE_BAJA_CONFIANZA
        ),
        modelo_version=settings.model_version,
    )


def calcular_pronosticos(
    series: list[SerieEntrada],
    horizonte: int,
    config: ConfiguracionAnalitica,
) -> PronosticoResponse:
    _validar_lote(series)
    pronosticos = [_pronostico_serie(serie, horizonte, config) for serie in series]

    return PronosticoResponse(
        pronosticos=pronosticos, modelo_version=settings.model_version
    )


def ejecutar_pipeline(
    series: list[SerieEntrada], config: ConfiguracionAnalitica
) -> PipelineResponse:
    _validar_lote(series)
    clases = _clases_abc(series)
    parametros: list[ParametroCalculado] = []
    pronosticos: list[PronosticoSerie] = []
    alertas: list[Alerta] = []
    resumen = {
        "series": len(series),
        "calculadas": 0,
        "parametros_incompletos": 0,
        "sin_demanda": 0,
        "alertas": 0,
    }

    for serie in series:
        parametro = _parametro(serie, config, clases)
        parametros.append(parametro)

        if parametro.estado == "calculado":
            resumen["calculadas"] += 1
        elif parametro.estado == "parametros_incompletos":
            resumen["parametros_incompletos"] += 1
        elif parametro.estado == "sin_demanda":
            resumen["sin_demanda"] += 1

        pronostico_serie = _pronostico_serie(serie, config.horizonte_dias, config)
        pronosticos.append(pronostico_serie)

        resultado_pronostico = pronostico.pronosticar(
            serie.cantidades, config.horizonte_dias, config.min_dias_historia
        )
        parametros_internos = inventario.calcular_parametros(
            cantidades=serie.cantidades,
            lead_time_dias=serie.lead_time_dias,
            costo_pedido=serie.costo_pedido,
            precio_unitario=serie.precio_unitario,
            nivel_servicio=parametro.nivel_servicio,
            costo_mantenimiento_pct=config.costo_mantenimiento_pct,
        )
        fecha_inicio = (
            serie.fechas[-1] + timedelta(days=1) if serie.fechas else None
        )
        if fecha_inicio is None:
            continue

        for alerta, clave in alertas_domain.detectar_alertas(
            almacen_id=serie.almacen_id,
            material_id=serie.material_id,
            parametros=parametros_internos,
            pronostico=resultado_pronostico,
            stock_actual=serie.stock_actual,
            fecha_inicio=fecha_inicio,
            lead_time_dias=serie.lead_time_dias,
            eoq=parametro.eoq,
        ):
            alertas.append(
                Alerta(
                    almacen_id=serie.almacen_id,
                    material_id=serie.material_id,
                    tipo=alerta.tipo,
                    severidad=alerta.severidad,
                    fecha_estimada=alerta.fecha_estimada,
                    cantidad_sugerida=alerta.cantidad_sugerida,
                    detalle=alerta.detalle,
                    clave_idempotente=clave,
                )
            )

    resumen["alertas"] = len(alertas)

    return PipelineResponse(
        parametros=parametros,
        pronosticos=pronosticos,
        alertas=alertas,
        resumen=resumen,
        modelo_version=settings.model_version,
    )


def simular(serie: SerieEntrada, escenario: EscenarioSimulacion) -> SimulacionResponse:
    serie.validar_longitud()
    config = ConfiguracionAnalitica()
    clases = _clases_abc([serie])
    base = _parametro(serie, config, clases)

    parametros_escenario = inventario.calcular_parametros(
        cantidades=serie.cantidades,
        lead_time_dias=escenario.lead_time_dias,
        costo_pedido=escenario.costo_pedido,
        precio_unitario=serie.precio_unitario,
        nivel_servicio=escenario.nivel_servicio,
        costo_mantenimiento_pct=config.costo_mantenimiento_pct,
    )
    parametro = ParametroCalculado(
        almacen_id=serie.almacen_id,
        material_id=serie.material_id,
        unidad=serie.unidad,
        clase_abc=base.clase_abc,
        clase_xyz=base.clase_xyz,
        clase_combinada=base.clase_combinada,
        coeficiente_variacion=base.coeficiente_variacion,
        demanda_media_diaria=parametros_escenario.demanda_media_diaria,
        demanda_anual=parametros_escenario.demanda_anual,
        eoq=parametros_escenario.eoq,
        costo_total_relevante=parametros_escenario.costo_total_relevante,
        stock_seguridad=parametros_escenario.stock_seguridad,
        punto_reorden=parametros_escenario.punto_reorden,
        lead_time_dias=escenario.lead_time_dias,
        nivel_servicio=escenario.nivel_servicio,
        estado=parametros_escenario.estado,
        modelo_version=settings.model_version,
    )

    delta_eoq = (
        round((parametro.eoq or 0.0) - (base.eoq or 0.0), 3)
        if parametro.eoq is not None and base.eoq is not None
        else None
    )
    delta_rop = (
        round((parametro.punto_reorden or 0.0) - (base.punto_reorden or 0.0), 3)
        if parametro.punto_reorden is not None and base.punto_reorden is not None
        else None
    )

    return SimulacionResponse(
        parametros=parametro,
        escenario=escenario,
        delta_eoq=delta_eoq,
        delta_punto_reorden=delta_rop,
        modelo_version=settings.model_version,
    )
