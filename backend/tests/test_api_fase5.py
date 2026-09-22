import pytest
import httpx

@pytest.mark.asyncio
async def test_posko_features(client: httpx.AsyncClient):
    """Test posko active and total counts."""
    res_aktif = await client.get("/api/posko")
    assert res_aktif.status_code == 200
    posko_aktif = len(res_aktif.json().get("features", []))
    assert posko_aktif >= 30

    res_all = await client.get("/api/posko?include_nonaktif=true")
    assert res_all.status_code == 200
    posko_all = len(res_all.json().get("features", []))
    assert posko_all >= 60

@pytest.mark.asyncio
async def test_shelter_tes_vertical(client: httpx.AsyncClient):
    """Test 7 TES vertical tsunami shelters in Padang."""
    res = await client.get("/api/posko?jenis=shelter_tes_tea")
    assert res.status_code == 200
    tes_features = res.json().get("features", [])
    assert len(tes_features) == 7

@pytest.mark.asyncio
async def test_sirine_tsunami_network(client: httpx.AsyncClient):
    """Test 46 BPBD tsunami warning sirens."""
    res = await client.get("/api/posko?jenis=sirine_tsunami")
    assert res.status_code == 200
    sirine_features = res.json().get("features", [])
    assert len(sirine_features) >= 40

@pytest.mark.asyncio
async def test_automated_sitrep_generator(client: httpx.AsyncClient):
    """Test automated SITREP BNPB and WhatsApp digest formatting."""
    res = await client.get("/api/admin/sitrep")
    assert res.status_code == 200
    sitrep = res.json()
    kpi = sitrep.get("kpi", {})
    assert kpi.get("total_pengungsi", 0) > 0
    assert "LAPORAN SITUASI KEBENCANAAN" in sitrep.get("whatsapp_formatted", "")

@pytest.mark.asyncio
async def test_bmkg_weather_alerts(client: httpx.AsyncClient):
    """Test BMKG extreme weather alerts endpoint."""
    res = await client.get("/api/eksternal/cuaca-peringatan")
    assert res.status_code == 200
    cuaca_data = res.json()
    assert isinstance(cuaca_data.get("data", []), list)

@pytest.mark.asyncio
async def test_pedestrian_evacuation_routing(client: httpx.AsyncClient):
    """Test emergency walking evacuation routing towards shelter."""
    payload = {
        "lat": -0.925,
        "lon": 100.355,
        "moda": "jalan_kaki"
    }
    res = await client.post("/api/routing/evakuasi", json=payload)
    assert res.status_code == 200
    r_data = res.json()
    assert r_data.get("jarak_km", 0) > 0
    assert r_data.get("estimasi_menit", 0) > 0
    assert len(r_data.get("instruksi", [])) > 0
    assert r_data.get("posko", {}).get("jenis") != "sirine_tsunami"
