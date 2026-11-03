"""Capa de configuración del motor predictivo."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """Configuración leída del entorno, sin secretos embebidos."""

    api_token: str
    service_version: str
    model_version: str
    max_series_por_lote: int

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            api_token=os.getenv("ANALYTICS_API_TOKEN", "dev-token"),
            service_version="1.0.0",
            model_version="deterministic-1.0",
            max_series_por_lote=int(os.getenv("ANALYTICS_MAX_SERIES", "2000")),
        )


settings = Settings.from_env()
