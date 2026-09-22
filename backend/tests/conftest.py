import pytest
import httpx
from app.main import app

@pytest.fixture(scope="session")
async def client():
    """Async client fixture using in-process ASGITransport."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.fixture(scope="session")
async def operator_headers(client: httpx.AsyncClient):
    """Fixture to obtain valid JWT token for field operator."""
    res = await client.post("/api/auth/login", json={
        "email": "operator.padang@sumbarprov.go.id",
        "password": "OperatorPadang2026!"
    })
    assert res.status_code == 200, f"Operator login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
async def admin_headers(client: httpx.AsyncClient):
    """Fixture to obtain valid JWT token for Pusdalops admin."""
    res = await client.post("/api/auth/login", json={
        "email": "admin@sumbarprov.go.id",
        "password": "AdminSumbar2026!"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
