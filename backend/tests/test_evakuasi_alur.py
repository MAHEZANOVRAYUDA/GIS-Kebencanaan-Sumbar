import pytest
import httpx
from app.services.routing_service import classify_disaster_flow

def test_classify_disaster_flow():
    assert classify_disaster_flow("tsunami") == "ALUR_A"
    assert classify_disaster_flow("Tsunami Megathrust") == "ALUR_A"
    assert classify_disaster_flow("gempa") == "ALUR_B"
    assert classify_disaster_flow("galodo") == "ALUR_B"
    assert classify_disaster_flow("banjir") == "ALUR_B"
    assert classify_disaster_flow("longsor") == "ALUR_B"
    assert classify_disaster_flow(None) == "ALUR_B"

@pytest.mark.asyncio
async def test_api_evakuasi_alur_a_tsunami(client: httpx.AsyncClient):
    # Pesisir Padang Barat (-0.9331, 100.3536)
    res = await client.post("/api/routing/evakuasi", json={
        "lat": -0.9331,
        "lon": 100.3536,
        "jenis_bencana": "tsunami",
        "moda": "jalan_kaki"
    })
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert data["alur"] == "ALUR_A"
    assert data["jenis_bencana"] == "tsunami"
    assert "posko" in data
    assert "nama" in data["posko"]
    assert "alamat" in data["posko"]
    assert data["jarak_km"] > 0
    assert "zonasi_info" in data
    assert data["zonasi_info"] is not None
    assert "status_lokasi_asal" in data["zonasi_info"]
    assert len(data["instruksi"]) > 0

@pytest.mark.asyncio
async def test_api_evakuasi_alur_b_kecamatan_sama(client: httpx.AsyncClient):
    # Resolusi ID dinamis Kecamatan Padang Barat (mencegah kerapuhan auto-increment ID)
    kec_res = await client.get("/api/wilayah?level=kecamatan")
    assert kec_res.status_code == 200
    kecs = kec_res.json()
    pb_kec = next((k for k in kecs if "Padang Barat" in k["nama"]), None)
    assert pb_kec is not None
    pb_id = pb_kec["id"]

    res = await client.post("/api/routing/evakuasi", json={
        "lat": -0.9331,
        "lon": 100.3536,
        "kecamatan_id": pb_id,
        "jenis_bencana": "galodo",
        "moda": "mobil"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["alur"] == "ALUR_B"
    assert data["jenis_bencana"] == "galodo"
    assert data["is_fallback"] is False
    assert "Padang Barat" in data["posko"]["nama"] or "Padang Barat" in (data["posko"]["alamat"] or "")
    assert data["posko"]["alamat"] is not None
    assert data["posko"]["kontak_pic"] is not None or data["posko"]["kontak_telepon"] is not None

@pytest.mark.asyncio
async def test_api_evakuasi_alur_b_fallback_data_kosong(client: httpx.AsyncClient):
    # Menguji kecamatan pedalaman yang tidak memiliki posko
    kec_res = await client.get("/api/wilayah?level=kecamatan")
    assert kec_res.status_code == 200
    kecs = kec_res.json()
    # Cari kecamatan yang bukan di Kota Padang (kode wilayah bukan mulai 1371)
    non_padang_kec = next((k for k in kecs if not k["kode_wilayah"].startswith("1371")), None)
    assert non_padang_kec is not None

    res = await client.post("/api/routing/evakuasi", json={
        "kecamatan_id": non_padang_kec["id"],
        "jenis_bencana": "gempa",
        "moda": "mobil"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["alur"] == "ALUR_B"
    if data["is_fallback"]:
        assert data["fallback_info"] is not None
        assert "pesan" in data["fallback_info"]
        assert "kontak_darurat" in data["fallback_info"]

@pytest.mark.asyncio
async def test_api_wilayah_cascading(client: httpx.AsyncClient):
    # 1. Provinsi
    p_res = await client.get("/api/wilayah?level=provinsi")
    assert p_res.status_code == 200
    prov = p_res.json()
    assert len(prov) >= 1
    prov_id = prov[0]["id"]

    # 2. Kabupaten terfilter by Provinsi
    k_res = await client.get(f"/api/wilayah?level=kabupaten&parent_id={prov_id}")
    assert k_res.status_code == 200
    kabs = k_res.json()
    assert len(kabs) == 19
    padang = next((k for k in kabs if "Padang" in k["nama"] and "Pariaman" not in k["nama"] and "Panjang" not in k["nama"]), None)
    assert padang is not None

    # 3. Kecamatan terfilter by Kota Padang
    kec_res = await client.get(f"/api/wilayah?level=kecamatan&parent_id={padang['id']}")
    assert kec_res.status_code == 200
    padang_kecs = kec_res.json()
    assert len(padang_kecs) >= 11

@pytest.mark.asyncio
async def test_api_zonasi_tsunami_geojson(client: httpx.AsyncClient):
    res = await client.get("/api/wilayah/zonasi-tsunami")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 3
    zonas = [f["properties"]["zona"] for f in data["features"]]
    assert "merah" in zonas
    assert "kuning" in zonas
    assert "hijau" in zonas

@pytest.mark.asyncio
async def test_api_bencana_aktif(client: httpx.AsyncClient):
    res = await client.get("/api/routing/bencana-aktif")
    assert res.status_code == 200
    data = res.json()
    assert "alur_rekomendasi" in data
    assert data["alur_rekomendasi"] in ("ALUR_A", "ALUR_B")
