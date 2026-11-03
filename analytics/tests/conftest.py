from __future__ import annotations

import os
from datetime import date, timedelta

import pytest

os.environ.setdefault("ANALYTICS_API_TOKEN", "test-token")


@pytest.fixture
def series_factory():
    def crear(
        almacen_id: int = 1,
        material_id: int = 10,
        dias: int = 90,
        base: float = 20.0,
        stock: float = 100.0,
        lead_time: float | None = 9.0,
        costo_pedido: float | None = 50.0,
        precio: float | None = 10.0,
    ) -> dict:
        inicio = date(2026, 1, 1)
        cantidades = [base + ((indice % 7) - 3) for indice in range(dias)]

        return {
            "almacen_id": almacen_id,
            "material_id": material_id,
            "unidad": "UND",
            "fechas": [
                (inicio + timedelta(days=indice)).isoformat()
                for indice in range(dias)
            ],
            "cantidades": cantidades,
            "stock_actual": stock,
            "lead_time_dias": lead_time,
            "costo_pedido": costo_pedido,
            "precio_unitario": precio,
        }

    return crear
