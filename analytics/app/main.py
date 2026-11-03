"""Punto de entrada del microservicio de analítica predictiva."""

from __future__ import annotations

from fastapi import FastAPI

from app.config import settings
from app.routers import router

app = FastAPI(
    title="ObraFlow Analytics",
    description=(
        "Motor determinístico de EOQ, ROP, stock de seguridad, ABC/XYZ, "
        "pronóstico y alertas tempranas."
    ),
    version=settings.service_version,
)

app.include_router(router)
