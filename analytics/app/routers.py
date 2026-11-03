"""API HTTP del motor predictivo."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app import services
from app.config import settings
from app.schemas import (
    HealthResponse,
    ParametrosRequest,
    ParametrosResponse,
    PipelineRequest,
    PipelineResponse,
    PronosticoRequest,
    PronosticoResponse,
    SimulacionRequest,
    SimulacionResponse,
)
from app.security import requiere_token

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service_version=settings.service_version,
        model_version=settings.model_version,
    )


@router.post(
    "/v1/parameters",
    response_model=ParametrosResponse,
    dependencies=[Depends(requiere_token)],
)
def parameters(payload: ParametrosRequest) -> ParametrosResponse:
    try:
        return services.calcular_parametros(payload.series, payload.configuracion)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error


@router.post(
    "/v1/forecast",
    response_model=PronosticoResponse,
    dependencies=[Depends(requiere_token)],
)
def forecast(payload: PronosticoRequest) -> PronosticoResponse:
    try:
        return services.calcular_pronosticos(
            payload.series, payload.horizonte_dias, payload.configuracion
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error


@router.post(
    "/v1/simulate",
    response_model=SimulacionResponse,
    dependencies=[Depends(requiere_token)],
)
def simulate(payload: SimulacionRequest) -> SimulacionResponse:
    try:
        return services.simular(payload.serie, payload.escenario)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error


@router.post(
    "/v1/pipeline",
    response_model=PipelineResponse,
    dependencies=[Depends(requiere_token)],
)
def pipeline(payload: PipelineRequest) -> PipelineResponse:
    try:
        return services.ejecutar_pipeline(payload.series, payload.configuracion)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error
