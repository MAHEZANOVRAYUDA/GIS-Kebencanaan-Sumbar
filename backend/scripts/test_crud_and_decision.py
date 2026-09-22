"""
Verifikasi Otomatis Fitur CRUD Geospasial, Validitas Lapangan & Audit Logging
Menguji seluruh endpoint mutasi:
- /api/posko (CRUD Posko, Shelter TES & Sirine EWS)
- /api/bencana (CRUD Kejadian Bencana & Rekap Dampak)
- /api/jalan-terputus (CRUD Blokade Jalan)
- /api/admin/verifikasi-queue & /api/admin/audit-logs
"""
import sys
import os
import asyncio
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app

async def run_tests():
    print("=" * 70)
    print("  TEST SUITE: SISTEM PENDUKUNG KEPUTUSAN & CRUD GEOSPASIAL SUMBAR")
    print("=" * 70)
    
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login Petugas (Operator Padang & Admin Pusdalops)
        print("\n>>> 1. AUTENTIKASI SESI PETUGAS")
        op_res = await client.post("/api/auth/login", json={
            "email": "operator.padang@sumbarprov.go.id",
            "password": "OperatorPadang2026!"
        })
        assert op_res.status_code == 200, f"Gagal login operator: {op_res.text}"
        op_token = op_res.json()["access_token"]
        op_headers = {"Authorization": f"Bearer {op_token}"}
        print("[PASS] 1a. Login Operator Lapangan Berhasil.")

        adm_res = await client.post("/api/auth/login", json={
            "email": "admin@sumbarprov.go.id",
            "password": "AdminSumbar2026!"
        })
        assert adm_res.status_code == 200, f"Gagal login admin: {adm_res.text}"
        adm_token = adm_res.json()["access_token"]
        adm_headers = {"Authorization": f"Bearer {adm_token}"}
        print("[PASS] 1b. Login Admin Pusdalops Berhasil.")

        # 2. Pengujian CRUD Posko & Shelter
        print("\n>>> 2. MANAJEMEN POSKO & SHELTER EVAKUASI (CRUD)")
        posko_payload = {
            "nama": "Posko Darurat GOR Haji Agus Salim (Uji Coba)",
            "jenis": "posko_utama",
            "lat": -0.9145,
            "lon": 100.3620,
            "kapasitas": 500,
            "fasilitas": ["air_bersih", "dapur_umum", "faskes", "mck"],
            "kontak_pic": "Rahmat Hidayat (BPBD)",
            "kontak_telepon": "081267890123",
            "status": "aktif"
        }
        res_c_posko = await client.post("/api/posko", json=posko_payload, headers=op_headers)
        assert res_c_posko.status_code == 201, f"Gagal create posko: {res_c_posko.text}"
        new_posko_id = res_c_posko.json()["id"]
        print(f"[PASS] 2a. Tambah Posko Baru: ID={new_posko_id} ('{res_c_posko.json()['nama']}')")

        # Detail Posko
        res_d_posko = await client.get(f"/api/posko/{new_posko_id}")
        assert res_d_posko.status_code == 200
        assert res_d_posko.json()["kapasitas"] == 500
        print(f"[PASS] 2b. Detail Posko Terverifikasi (Kapasitas: {res_d_posko.json()['kapasitas']} Jiwa)")

        # Update Posko
        res_u_posko = await client.put(f"/api/posko/{new_posko_id}", json={
            "kapasitas": 650,
            "kontak_pic": "Rahmat Hidayat S.Sos"
        }, headers=op_headers)
        assert res_u_posko.status_code == 200
        assert res_u_posko.json()["kapasitas"] == 650
        print(f"[PASS] 2c. Update Kapasitas Posko: {res_u_posko.json()['kapasitas']} Jiwa")

        # Quick Status Update Posko
        res_s_posko = await client.put(f"/api/posko/{new_posko_id}/status", json={
            "status": "penuh",
            "kapasitas": 650
        }, headers=op_headers)
        assert res_s_posko.status_code == 200
        assert res_s_posko.json()["status"] == "penuh"
        print(f"[PASS] 2d. Status Posko Terisi Penuh: {res_s_posko.json()['status']}")

        # Status 46 Sirine EWS
        res_sirine = await client.get("/api/posko/sirine/status")
        assert res_sirine.status_code == 200
        s_data = res_sirine.json()
        print(f"[PASS] 2e. Monitoring Jaringan Sirine EWS: {s_data['total_sirine']} Unit (Siaga: {s_data['aktif_siaga']})")

        # Delete Posko Uji Coba
        res_del_posko = await client.delete(f"/api/posko/{new_posko_id}", headers=adm_headers)
        assert res_del_posko.status_code == 200
        print(f"[PASS] 2f. Penghapusan Posko Uji Coba Berhasil.")

        # 3. Pengujian CRUD Kejadian Bencana & Dampak Lapangan
        print("\n>>> 3. MANAJEMEN BENCANA & VALIDITAS LAPANGAN (CRUD)")
        bencana_payload = {
            "jenis_bencana": "longsor",
            "wilayah_id": 1,
            "lat": -0.9520,
            "lon": 100.4650,
            "deskripsi": "Longsor tebing Sitinjau Lauik menutup sebagian badan jalan nasional.",
            "sumber_data": "relawan_lapangan",
            "status_verifikasi": "menunggu",
            "dampak": {
                "korban_meninggal": 0,
                "korban_luka": 2,
                "jumlah_pengungsi": 15,
                "kerugian_rp": 75000000.0,
                "rumah_rusak_sedang": 1
            }
        }
        res_c_bencana = await client.post("/api/bencana", json=bencana_payload, headers=op_headers)
        assert res_c_bencana.status_code == 201, f"Gagal create bencana: {res_c_bencana.text}"
        new_bencana_id = res_c_bencana.json()["id"]
        print(f"[PASS] 3a. Input Kejadian Bencana Lapangan: ID={new_bencana_id} (Status: Menunggu Verifikasi)")

        # Cek Masuk ke Antrean Verifikasi Admin
        res_queue = await client.get("/api/admin/verifikasi-queue", headers=adm_headers)
        assert res_queue.status_code == 200
        queue_items = res_queue.json()["data"]
        matching = [q for q in queue_items if q["id"] == new_bencana_id]
        assert len(matching) > 0
        print(f"[PASS] 3b. Masuk ke Kotak Masuk Verifikasi Supervisor (Total Antrean: {res_queue.json()['total_antrean']})")

        # Verifikasi Laporan oleh Supervisor Pusdalops
        res_verif = await client.put(f"/api/bencana/{new_bencana_id}/verifikasi", json={
            "status_verifikasi": "terverifikasi",
            "catatan": "Dikonfirmasi langsung oleh Tim TRC BPBD di Sitinjau Lauik."
        }, headers=adm_headers)
        assert res_verif.status_code == 200
        assert res_verif.json()["status_verifikasi"] == "terverifikasi"
        print(f"[PASS] 3c. Approval Verifikasi Pusdalops Berhasil: Status '{res_verif.json()['status_verifikasi']}'")

        # Update Dampak Kerugian Bertambah
        res_u_dampak = await client.post(f"/api/bencana/{new_bencana_id}/dampak", json={
            "korban_meninggal": 0,
            "korban_luka": 3,
            "jumlah_pengungsi": 25,
            "kerugian_rp": 120000000.0,
            "catatan": "Pembaruan logistik pengungsian nagari."
        }, headers=op_headers)
        assert res_u_dampak.status_code == 200
        print(f"[PASS] 3d. Update Rincian Dampak & Korban: Kerugian Rp 120 Juta")

        # Hapus Bencana Uji Coba
        res_del_bencana = await client.delete(f"/api/bencana/{new_bencana_id}", headers=adm_headers)
        assert res_del_bencana.status_code == 200
        print(f"[PASS] 3e. Penghapusan Kejadian Bencana Uji Coba Berhasil.")

        # 4. Pengujian CRUD Ruas Jalan Terputus
        print("\n>>> 4. MANAJEMEN BLOKADE JALAN (CRUD)")
        jalan_payload = {
            "geometry": {
                "coordinates": [[100.3540, -0.9470], [100.3560, -0.9490]]
            },
            "alasan": "banjir",
            "deskripsi": "Genangan banjir rob tinggi 60cm di Muaro Padang."
        }
        res_c_jalan = await client.post("/api/jalan-terputus", json=jalan_payload, headers=op_headers)
        assert res_c_jalan.status_code == 201
        new_jalan_id = res_c_jalan.json()["id"]
        print(f"[PASS] 4a. Tambah Blokade Jalan: ID={new_jalan_id} ('{res_c_jalan.json()['alasan']}')")

        # Update Status Penanganan Jalan
        res_u_jalan = await client.put(f"/api/jalan-terputus/{new_jalan_id}", json={
            "status": "sebagian",
            "deskripsi": "Buka-tutup satu arah dengan panduan polisi lalu lintas."
        }, headers=op_headers)
        assert res_u_jalan.status_code == 200
        print(f"[PASS] 4b. Update Status Penanganan Jalan: '{res_u_jalan.json()['status']}'")

        # Pulihkan Jalan
        res_p_jalan = await client.put(f"/api/jalan-terputus/{new_jalan_id}/pulihkan", headers=op_headers)
        assert res_p_jalan.status_code == 200
        print(f"[PASS] 4c. Pulihkan Arus Jalan: Status '{res_p_jalan.json()['status']}'")

        # Delete Jalan
        res_d_jalan = await client.delete(f"/api/jalan-terputus/{new_jalan_id}", headers=adm_headers)
        assert res_d_jalan.status_code == 200
        print(f"[PASS] 4d. Penghapusan Ruas Jalan Berhasil.")

        # 5. Pengujian Jejak Audit (Audit Logs)
        print("\n>>> 5. AUDIT LOGGING & TRACKING INTEGRITAS DATA")
        res_audit = await client.get("/api/admin/audit-logs", headers=adm_headers)
        assert res_audit.status_code == 200
        audit_items = res_audit.json()["data"]
        print(f"[PASS] 5a. Terverifikasi {len(audit_items)} Catatan Jejak Audit Digital Terekam.")
        if audit_items:
            first_log = audit_items[0]
            print(f"     -> Log Terakhir: Aksi='{first_log['aksi']}' | Operator='{first_log['operator']}' | Tabel='{first_log['tabel']}'")

    print("\n" + "=" * 70)
    print("  STATUS AKHIR: SELURUH 14 PENGUJIAN CRUD & INTEGRITAS DATA LULUS 100%!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_tests())
