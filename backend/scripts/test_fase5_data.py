"""
Pengujian Otomatis Fase 5: Ingestion Data Riil, Mitigasi Tsunami & SITREP
Menguji endpoint /api/posko, /api/admin/sitrep, /api/eksternal/cuaca-peringatan, dan routing pedestrian.
"""
import sys
import os
import asyncio
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app

async def run_tests():
    print("=" * 65)
    print("  TEST SUITE FASE 5: DATA RIIL, MITIGASI & ANALITIK KEBENCANAAN")
    print("=" * 65)
    
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test Posko Aktif & Keseluruhan
        res_aktif = await client.get("/api/posko")
        assert res_aktif.status_code == 200
        posko_aktif = len(res_aktif.json().get("features", []))
        print(f"[PASS] 1a. Titik Posko & Mitigasi Aktif: {posko_aktif} titik")
        assert posko_aktif >= 30

        res_all = await client.get("/api/posko?include_nonaktif=true")
        assert res_all.status_code == 200
        posko_all = len(res_all.json().get("features", []))
        print(f"[PASS] 1b. Total Keseluruhan (Aktif + Pemeliharaan): {posko_all} titik (GeoJSON FeatureCollection)")
        assert posko_all >= 60

        # 2. Test Filter Shelter TES/TEA Tsunami
        res = await client.get("/api/posko?jenis=shelter_tes_tea")
        assert res.status_code == 200
        tes_features = res.json().get("features", [])
        print(f"[PASS] 2. Filter Shelter TES/TEA Tsunami Padang: {len(tes_features)} gedung vertikal")
        assert len(tes_features) == 7

        # 3. Test Filter Sirine Tsunami BPBD
        res = await client.get("/api/posko?jenis=sirine_tsunami")
        assert res.status_code == 200
        sirine_features = res.json().get("features", [])
        print(f"[PASS] 3. Filter Sirine EWS Tsunami BPBD: {len(sirine_features)} unit beacon")
        assert len(sirine_features) >= 40

        # 4. Test SITREP Otomatis
        res = await client.get("/api/admin/sitrep")
        assert res.status_code == 200
        sitrep_data = res.json()
        kpi = sitrep_data.get("kpi", {})
        print(f"[PASS] 4. SITREP Generator: Pengungsi={kpi.get('total_pengungsi'):,} | Korban Jiwa={kpi.get('total_meninggal')} | Kerugian=Rp {kpi.get('total_kerugian_miliar')}M")
        assert "LAPORAN SITUASI KEBENCANAAN" in sitrep_data.get("whatsapp_formatted", "")
        print(f"     -> Format WhatsApp siap kirim terverifikasi ({len(sitrep_data.get('whatsapp_formatted'))} karakter)")

        # 5. Test Peringatan Cuaca Ekstrem BMKG
        res = await client.get("/api/eksternal/cuaca-peringatan")
        assert res.status_code == 200
        cuaca_data = res.json()
        alerts = cuaca_data.get("data", [])
        print(f"[PASS] 5. BMKG Weather Alerts: {len(alerts)} peringatan dini aktif di database")
        assert len(alerts) > 0

        # 6. Test Routing Evakuasi Pejalan Kaki (Pedestrian Walking Speed)
        route_req = {
            "lat": -0.9471,
            "lon": 100.3543,
            "moda": "jalan_kaki"
        }
        res = await client.post("/api/routing/evakuasi", json=route_req)
        assert res.status_code == 200
        route_res = res.json()
        print(f"[PASS] 6. Routing Pejalan Kaki: Menuju '{route_res['posko']['nama']}'")
        print(f"     -> Jarak: {route_res['jarak_km']} km | Estimasi: {route_res['estimasi_menit']} menit (jalan kaki darurat)")
        print(f"     -> Langkah pertama: '{route_res['instruksi'][0]['teks']}'")
        assert route_res["estimasi_menit"] > 0
        assert route_res["posko"]["jenis"] != "sirine_tsunami"  # Pastikan tidak mengarahkan ke tiang sirine

    print("=" * 65)
    print("  SELURUH 6 PENGUJIAN FASE 5 BERHASIL 100%!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_tests())
