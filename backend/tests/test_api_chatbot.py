import pytest
import httpx

@pytest.mark.asyncio
async def test_chatbot_gempa_response(client: httpx.AsyncClient):
    """Test asisten AI merespons pertanyaan gempa bumi dengan data sensor BMKG."""
    res = await client.post("/api/bot/chat", json={
        "pesan": "Bagaimana informasi gempa bumi terkini?",
        "user_lat": -0.9471,
        "user_lng": 100.4172
    })
    assert res.status_code == 200
    data = res.json()
    assert data["kategori"] == "gempa"
    assert "BMKG" in data["jawaban"]
    assert "Magnitudo" in data["jawaban"]
    assert len(data["saran_pertanyaan"]) > 0
    if data["rekomendasi_lokasi"]:
        assert data["rekomendasi_lokasi"]["tipe"] == "gempa"
        assert -90 <= data["rekomendasi_lokasi"]["lat"] <= 90
        assert -180 <= data["rekomendasi_lokasi"]["lng"] <= 180

@pytest.mark.asyncio
async def test_chatbot_shelter_recommendation(client: httpx.AsyncClient):
    """Test rekomendasi shelter/posko terdekat berdasarkan koordinat pengguna."""
    res = await client.post("/api/bot/chat", json={
        "pesan": "Di mana tempat evakuasi atau shelter terdekat?",
        "user_lat": -0.9471,
        "user_lng": 100.4172
    })
    assert res.status_code == 200
    data = res.json()
    assert data["kategori"] == "shelter"
    assert "Tempat Evakuasi" in data["jawaban"]
    assert data["rekomendasi_lokasi"] is not None
    assert data["rekomendasi_lokasi"]["lat"] is not None
    assert data["rekomendasi_lokasi"]["lng"] is not None
    assert data["rekomendasi_lokasi"]["jarak_km"] is not None

@pytest.mark.asyncio
async def test_chatbot_cuaca_alert(client: httpx.AsyncClient):
    """Test asisten AI merespons kondisi cuaca ekstrem BMKG Minangkabau."""
    res = await client.post("/api/bot/chat", json={
        "pesan": "Cek prakiraan cuaca dan potensi galodo hari ini"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["kategori"] == "cuaca"
    assert len(data["jawaban"]) > 10

@pytest.mark.asyncio
async def test_chatbot_kontak_darurat(client: httpx.AsyncClient):
    """Test penyediaan kontak darurat BPBD, Basarnas, Ambulans."""
    res = await client.post("/api/bot/chat", json={
        "pesan": "Berapa nomor telepon darurat BPBD dan ambulans?"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["kategori"] == "kontak"
    assert "BPBD" in data["jawaban"]
    assert "112" in data["jawaban"] or "0751" in data["jawaban"]

@pytest.mark.asyncio
async def test_chatbot_default_greeting(client: httpx.AsyncClient):
    """Test pesan pembuka default jika pengguna menyapa secara umum."""
    res = await client.post("/api/bot/chat", json={
        "pesan": "Halo selamat pagi"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["kategori"] == "umum"
    assert "Asisten Virtual Siaga Bencana" in data["jawaban"]
    assert len(data["saran_pertanyaan"]) >= 3
