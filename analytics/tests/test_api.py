from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

TOKEN = "test-token"
HEADERS = {"X-Internal-Token": TOKEN}


def _payload(series_factory) -> dict:
    return {"series": [series_factory()]}


def test_health_no_exige_token() -> None:
    cliente = TestClient(app)
    respuesta = cliente.get("/health")

    assert respuesta.status_code == 200
    assert respuesta.json()["status"] == "ok"


def test_endpoint_sin_token_devuelve_401() -> None:
    cliente = TestClient(app)
    respuesta = cliente.post("/v1/parameters", json=_payload(lambda: {}))

    assert respuesta.status_code == 401


def test_parametros_con_token(series_factory) -> None:
    cliente = TestClient(app)
    respuesta = cliente.post(
        "/v1/parameters", json=_payload(series_factory), headers=HEADERS
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["parametros"][0]["estado"] == "calculado"
    assert cuerpo["modelo_version"] == "deterministic-1.0"


def test_pipeline_genera_alertas(series_factory) -> None:
    cliente = TestClient(app)
    payload = _payload(lambda: series_factory(stock=10.0))
    respuesta = cliente.post("/v1/pipeline", json=payload, headers=HEADERS)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["resumen"]["series"] == 1
    assert len(cuerpo["alertas"]) >= 1


def test_payload_invalido_devuelve_422(series_factory) -> None:
    cliente = TestClient(app)
    serie = series_factory()
    serie["cantidades"] = serie["cantidades"][:-1]
    respuesta = cliente.post(
        "/v1/parameters", json={"series": [serie]}, headers=HEADERS
    )

    assert respuesta.status_code == 422


def test_simulacion_no_persiste(series_factory) -> None:
    cliente = TestClient(app)
    payload = {
        "serie": series_factory(),
        "escenario": {
            "lead_time_dias": 15,
            "costo_pedido": 80,
            "nivel_servicio": 0.97,
        },
    }
    respuesta = cliente.post("/v1/simulate", json=payload, headers=HEADERS)

    assert respuesta.status_code == 200
    assert respuesta.json()["parametros"]["lead_time_dias"] == 15
