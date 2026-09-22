import pytest
import httpx

@pytest.mark.asyncio
async def test_get_provinsi(client: httpx.AsyncClient):
    # Test GET /provinsi (root)
    res = await client.get("/provinsi")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    sumbar = next((p for p in data if p["id"] == "13"), None)
    assert sumbar is not None
    assert sumbar["nama"] == "Sumatera Barat"

    # Test GET /api/provinsi (prefix)
    res_api = await client.get("/api/provinsi")
    assert res_api.status_code == 200
    data_api = res_api.json()
    assert len(data_api) == len(data)

@pytest.mark.asyncio
async def test_get_kota_cascading(client: httpx.AsyncClient):
    # 1. Parameter kosong mengembalikan []
    res_empty = await client.get("/kota")
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    # 2. Parameter id_provinsi yang valid (13)
    res = await client.get("/kota?id_provinsi=13")
    assert res.status_code == 200
    kotas = res.json()
    assert isinstance(kotas, list)
    assert len(kotas) == 19

    # Validasi struktur item kota
    padang = next((k for k in kotas if k["id"] == "1371"), None)
    assert padang is not None
    assert padang["id_provinsi"] == "13"
    assert padang["nama"] == "Kota Padang"

    pesel = next((k for k in kotas if k["id"] == "1301"), None)
    assert pesel is not None
    assert pesel["id_provinsi"] == "13"
    assert "Pesisir Selatan" in pesel["nama"]

    # 3. Parameter id_provinsi yang tidak valid / tidak ada
    res_invalid = await client.get("/kota?id_provinsi=9999")
    assert res_invalid.status_code == 200
    assert res_invalid.json() == []

@pytest.mark.asyncio
async def test_get_kecamatan_cascading(client: httpx.AsyncClient):
    # 1. Parameter kosong mengembalikan []
    res_empty = await client.get("/kecamatan")
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    # 2. Parameter id_kota valid (1371 - Kota Padang)
    res = await client.get("/kecamatan?id_kota=1371")
    assert res.status_code == 200
    kecs = res.json()
    assert isinstance(kecs, list)
    assert len(kecs) >= 11

    # Validasi struktur item kecamatan
    first_kec = kecs[0]
    assert "id" in first_kec
    assert "id_kota" in first_kec
    assert "nama" in first_kec
    assert first_kec["id_kota"] == "1371"

    # Verifikasi Padang Barat dan Padang Timur ada
    pb = next((k for k in kecs if "Padang Barat" in k["nama"]), None)
    assert pb is not None
    assert pb["id_kota"] == "1371"

    pt = next((k for k in kecs if "Padang Timur" in k["nama"]), None)
    assert pt is not None
    assert pt["id_kota"] == "1371"

    # 3. Parameter id_kota yang tidak memiliki kecamatan
    res_invalid = await client.get("/kecamatan?id_kota=9999")
    assert res_invalid.status_code == 200
    assert res_invalid.json() == []

@pytest.mark.asyncio
async def test_posko_filter_by_id_kecamatan(client: httpx.AsyncClient):
    # Ambil kecamatan Padang Barat
    kec_res = await client.get("/kecamatan?id_kota=1371")
    kecs = kec_res.json()
    pb = next((k for k in kecs if "Padang Barat" in k["nama"]), None)
    assert pb is not None

    # Query posko dengan id_kecamatan
    posko_res = await client.get(f"/api/posko?id_kecamatan={pb['id']}")
    assert posko_res.status_code == 200
    p_data = posko_res.json()
    assert p_data["type"] == "FeatureCollection"
    # Pastikan properties id_kecamatan tersedia
    for f in p_data["features"]:
        assert "id_kecamatan" in f["properties"]

@pytest.mark.asyncio
async def test_evakuasi_with_string_kecamatan_id(client: httpx.AsyncClient):
    # Ambil kecamatan Padang Barat
    kec_res = await client.get("/kecamatan?id_kota=1371")
    kecs = kec_res.json()
    pb = next((k for k in kecs if "Padang Barat" in k["nama"]), None)
    assert pb is not None

    # Routing evakuasi Alur B dengan kode kecamatan string
    evak_res = await client.post("/api/routing/evakuasi", json={
        "kecamatan_id": pb["id"],
        "jenis_bencana": "gempa",
        "moda": "mobil"
    })
    assert evak_res.status_code == 200
    data = evak_res.json()
    assert data["alur"] == "ALUR_B"
    assert "posko" in data
    assert data["jarak_km"] > 0
