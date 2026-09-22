import pytest
import httpx

@pytest.mark.asyncio
async def test_health_check(client: httpx.AsyncClient):
    """Test health check telemetries (DB and uptime)."""
    res = await client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") in ["ok", "healthy"]
    db_info = data.get("database")
    db_status = db_info.get("status") if isinstance(db_info, dict) else db_info
    assert db_status in ["connected", "ok"]

@pytest.mark.asyncio
async def test_wilayah_choropleth(client: httpx.AsyncClient):
    """Test choropleth GeoJSON features for 19 regencies/cities."""
    res = await client.get("/api/wilayah/choropleth")
    assert res.status_code == 200
    geojson = res.json()
    features = geojson.get("features", [])
    assert len(features) >= 19

@pytest.mark.asyncio
async def test_wilayah_spatial_lookup(client: httpx.AsyncClient):
    """Test spatial ST_Contains point-in-polygon lookup for Padang coordinates."""
    res = await client.get("/api/wilayah/lookup?lat=-0.9471&lon=100.3543")
    assert res.status_code == 200
    data = res.json()
    assert "Padang" in data.get("nama", "")

@pytest.mark.asyncio
async def test_disaster_statistics(client: httpx.AsyncClient):
    """Test aggregated disaster impact statistics."""
    res = await client.get("/api/bencana/statistik")
    assert res.status_code == 200
    stats = res.json()
    ringkasan = stats.get("ringkasan", {})
    assert "total_kejadian" in ringkasan
    assert ringkasan["total_kejadian"] > 0
    assert len(stats.get("distribusi_bencana", [])) > 0

@pytest.mark.asyncio
async def test_bmkg_gempa_terkini(client: httpx.AsyncClient):
    """Test BMKG autogempa TEWS real-time sensor endpoint."""
    res = await client.get("/api/eksternal/gempa-terkini")
    assert res.status_code == 200
    gempa = res.json().get("data", {})
    assert "magnitude" in gempa
    assert "wilayah_teks" in gempa
