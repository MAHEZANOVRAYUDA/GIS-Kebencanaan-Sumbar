import pytest
import httpx

async def test_auth_login(client: httpx.AsyncClient):
    """Test login for operator and admin."""
    res_op = await client.post("/api/auth/login", json={
        "email": "operator.padang@sumbarprov.go.id",
        "password": "OperatorPadang2026!"
    })
    assert res_op.status_code == 200
    assert "access_token" in res_op.json()

    res_adm = await client.post("/api/auth/login", json={
        "email": "admin@sumbarprov.go.id",
        "password": "AdminSumbar2026!"
    })
    assert res_adm.status_code == 200
    assert "access_token" in res_adm.json()

async def test_crud_posko(client: httpx.AsyncClient, operator_headers: dict):
    """Test full lifecycle of Posko Evakuasi: create, detail, update, delete."""
    payload = {
        "nama": "Posko Uji Coba Pytest Automation",
        "jenis": "posko_utama",
        "lat": -0.9145,
        "lon": 100.3620,
        "kapasitas": 500,
        "fasilitas": ["air_bersih", "dapur_umum", "faskes"],
        "kontak_pic": "Petugas QA",
        "kontak_telepon": "08123456789",
        "status": "aktif"
    }
    create_res = await client.post("/api/posko", json=payload, headers=operator_headers)
    assert create_res.status_code == 201
    posko_id = create_res.json()["id"]

    try:
        # Detail
        detail_res = await client.get(f"/api/posko/{posko_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["nama"] == payload["nama"]

        # Update
        update_res = await client.put(f"/api/posko/{posko_id}", json={"kapasitas": 650, "status": "penuh"}, headers=operator_headers)
        assert update_res.status_code == 200
        assert update_res.json()["kapasitas"] == 650
    finally:
        # Cleanup
        del_res = await client.delete(f"/api/posko/{posko_id}", headers=operator_headers)
        assert del_res.status_code in [200, 204]

async def test_sirine_monitoring_status(client: httpx.AsyncClient):
    """Test EWS Tsunami Siren network status endpoint."""
    res = await client.get("/api/posko/sirine/status")
    assert res.status_code == 200
    data = res.json()
    assert data["total_sirine"] >= 40
    assert "aktif_siaga" in data

async def test_bencana_lifecycle_and_verification(client: httpx.AsyncClient, operator_headers: dict, admin_headers: dict):
    """Test incident reporting by operator and approval by supervisor/admin."""
    payload = {
        "jenis_bencana": "longsor",
        "deskripsi": "Uji coba laporan insiden longsor jalur uji",
        "lat": -0.9520,
        "lon": 100.4650,
        "wilayah_id": 1,
        "sumber_data": "relawan_lapangan",
        "status_verifikasi": "menunggu",
        "dampak": {
            "korban_meninggal": 0,
            "korban_luka": 2,
            "jumlah_pengungsi": 15,
            "kerugian_rp": 75000000.0
        }
    }
    res_b = await client.post("/api/bencana", json=payload, headers=operator_headers)
    assert res_b.status_code == 201
    bencana_id = res_b.json()["id"]

    try:
        # Check supervisor verification queue
        res_q = await client.get("/api/admin/verifikasi-queue", headers=admin_headers)
        assert res_q.status_code == 200
        queue_items = res_q.json()["data"]
        assert any(it["id"] == bencana_id for it in queue_items)

        # Admin approve via bencana endpoint
        res_appr = await client.put(f"/api/bencana/{bencana_id}/verifikasi", json={
            "status_verifikasi": "terverifikasi",
            "catatan": "Dikonfirmasi langsung oleh Tim TRC BPBD."
        }, headers=admin_headers)
        assert res_appr.status_code == 200
        assert res_appr.json()["status_verifikasi"] == "terverifikasi"
    finally:
        # Cleanup
        del_res = await client.delete(f"/api/bencana/{bencana_id}", headers=admin_headers)
        assert del_res.status_code in [200, 204]

async def test_crud_jalan_terputus(client: httpx.AsyncClient, operator_headers: dict):
    """Test road blockade reporting and resolution lifecycle."""
    payload = {
        "geometry": {
            "coordinates": [[100.3540, -0.9470], [100.3560, -0.9490]]
        },
        "alasan": "banjir",
        "deskripsi": "Genangan banjir rob tinggi 60cm di Muaro Padang."
    }
    res = await client.post("/api/jalan-terputus", json=payload, headers=operator_headers)
    assert res.status_code == 201
    jalan_id = res.json()["id"]

    try:
        # Update
        res_up = await client.put(f"/api/jalan-terputus/{jalan_id}", json={"status": "sebagian"}, headers=operator_headers)
        assert res_up.status_code == 200
        assert res_up.json()["status"] == "sebagian"
    finally:
        del_res = await client.delete(f"/api/jalan-terputus/{jalan_id}", headers=operator_headers)
        assert del_res.status_code in [200, 204]

async def test_audit_logs_recorded(client: httpx.AsyncClient, admin_headers: dict):
    """Test audit trail recording for mutation actions."""
    res = await client.get("/api/admin/audit-logs?limit=10", headers=admin_headers)
    assert res.status_code == 200
    logs = res.json()["data"]
    assert len(logs) > 0
