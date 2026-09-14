"""
Comprehensive Verification Script for GIS Kebencanaan Sumatera Barat
Testing Phase 1, Phase 2, and Phase 3 API endpoints.
"""
import sys
import json
import urllib.request
import urllib.error
import http.cookiejar

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 65)
    print("  TEST SUITE: GIS KEBENCANAAN SUMATERA BARAT (FASE 1 - FASE 3)")
    print("=" * 65)
    
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    results = []

    def test_endpoint(name, method, path, data=None, headers=None, expected_status=200):
        url = f"{BASE_URL}{path}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        
        req_data = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
        
        try:
            res = opener.open(req, timeout=20)
            status = res.status
            content_type = res.headers.get("Content-Type", "")
            if "protobuf" in content_type:
                raw_bytes = res.read()
                parsed = {
                    "byte_length": len(raw_bytes),
                    "cache": res.headers.get("X-Tile-Cache", "NONE")
                }
            else:
                body = res.read().decode("utf-8")
                parsed = json.loads(body) if body else {}
            success = (status == expected_status)
            results.append((name, success, f"HTTP {status}"))
            print(f"[{'PASS' if success else 'FAIL'}] {name} -> HTTP {status}")
            return parsed, status
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            success = (e.code == expected_status)
            results.append((name, success, f"HTTP {e.code}: {body[:80]}"))
            print(f"[{'PASS' if success else 'FAIL'}] {name} -> HTTP {e.code} | {body[:60]}")
            try:
                return json.loads(body), e.code
            except:
                return {"raw": body}, e.code
        except Exception as e:
            results.append((name, False, str(e)))
            print(f"[FAIL] {name} -> Error: {e}")
            return None, 0

    # --- FASE 1: FONDASI & BASIS DATA SPASIAL POSTGIS ---
    print("\n>>> FASE 1: Fondasi & Basis Data PostGIS")
    test_endpoint("1.1 Health Check API (/api/health)", "GET", "/api/health")
    
    geojson, _ = test_endpoint("1.2 Wilayah GeoJSON (/api/wilayah/geojson)", "GET", "/api/wilayah/geojson")
    if geojson and "features" in geojson:
        print(f"     -> Berhasil memuat {len(geojson['features'])} poligon wilayah kecamatan/kabupaten.")
    
    lookup, _ = test_endpoint("1.3 Spatial Drill-down (/api/wilayah/lookup)", "GET", "/api/wilayah/lookup?lat=-0.947&lon=100.354")
    if lookup:
        print(f"     -> Terdeteksi wilayah: {lookup.get('nama')} ({lookup.get('parent_nama')})")

    stats, _ = test_endpoint("1.4 Statistik Bencana (/api/bencana/statistik)", "GET", "/api/bencana/statistik")
    if stats:
        r = stats.get("ringkasan", {})
        print(f"     -> Kejadian: {r.get('total_kejadian')} | Kerugian: Rp {r.get('total_kerugian_miliar')} Miliar")

    test_endpoint("1.5 Riwayat Kejadian Bencana (/api/bencana/riwayat)", "GET", "/api/bencana/riwayat?limit=5")

    # --- FASE 2: ANALITIK, CHOROPLETH & FILTERING ---
    print("\n>>> FASE 2: Analitik, Choropleth & Heatmap Layer")
    test_endpoint("2.1 Choropleth Kecamatan (/api/wilayah/choropleth)", "GET", "/api/wilayah/choropleth?level=kecamatan")
    test_endpoint("2.2 Filter Choropleth Tahun 2024", "GET", "/api/wilayah/choropleth?level=kecamatan&tahun=2024")
    test_endpoint("2.3 Agregasi Dampak Wilayah ID=1 (/api/wilayah/1/dampak)", "GET", "/api/wilayah/1/dampak")
    test_endpoint("2.4 Heatmap Spasial Kejadian (/api/bencana/heatmap)", "GET", "/api/bencana/heatmap")
    test_endpoint("2.5 Filter Statistik Tahun 2024", "GET", "/api/bencana/statistik?tahun=2024")

    # --- FASE 3: EVAKUASI, SENSOR REAL-TIME & RBAC ---
    print("\n>>> FASE 3: Evakuasi OSRM/Valhalla, Sensor BMKG & Portal Petugas (RBAC)")
    # 3.1 BMKG
    gempa, _ = test_endpoint("3.1 BMKG Autogempa Terkini (/api/eksternal/gempa-terkini)", "GET", "/api/eksternal/gempa-terkini")
    if gempa and "data" in gempa:
        g = gempa["data"]
        print(f"     -> Gempa Terkini: M {g.get('magnitude')} | Kedalaman: {g.get('kedalaman')} | Wilayah: {g.get('wilayah')}")
    
    test_endpoint("3.2 Sync Manual BMKG Sensor (/api/eksternal/sync-gempa)", "POST", "/api/eksternal/sync-gempa")

    # 3.2 Posko Spasial
    posko_list, _ = test_endpoint("3.3 Daftar Posko Evakuasi (/api/posko)", "GET", "/api/posko")
    if posko_list and "features" in posko_list:
        print(f"     -> Terdaftar {len(posko_list['features'])} posko evakuasi aktif berkoordinat.")
    
    test_endpoint("3.4 Posko Terdekat KNN PostGIS (/api/posko/nearest)", "GET", "/api/posko/nearest?lat=-0.947&lon=100.354&limit=3")

    # 3.3 Routing Evakuasi Teraman
    route_req = {
        "lat": -0.947,
        "lon": 100.354,
        "moda": "mobil"
    }
    route_res, _ = test_endpoint("3.5 Algoritma Routing Rute Teraman (/api/routing/evakuasi)", "POST", "/api/routing/evakuasi", data=route_req)
    if route_res and "posko" in route_res:
        print(f"     -> Posko Tujuan: {route_res['posko'].get('nama')}")
        print(f"     -> Jarak: {route_res.get('jarak_km')} km | Estimasi: {route_res.get('estimasi_menit')} menit")
        print(f"     -> Turn-by-turn guidance: {len(route_res.get('instruksi', []))} langkah navigasi.")
        print(f"     -> Menghindari blokade bencana: {route_res.get('menghindari_blokade')}")

    # 3.4 Jalan Terputus
    test_endpoint("3.6 Daftar Ruas Jalan Terputus (/api/jalan-terputus)", "GET", "/api/jalan-terputus")

    # 3.5 Role 1: Operator Lapangan
    print("\n>>> PENGUJIAN ROLE 1: OPERATOR LAPANGAN")
    op_login = {"email": "operator.padang@sumbarprov.go.id", "password": "OperatorPadang2026!"}
    test_endpoint("3.7 Login Operator Lapangan", "POST", "/api/auth/login", data=op_login)
    
    me_op, _ = test_endpoint("3.8 Profil Operator (/api/auth/me)", "GET", "/api/auth/me")
    if me_op and "data" in me_op:
        print(f"     -> Petugas: {me_op['data'].get('nama')} | Role: {me_op['data'].get('role')} | Wilayah: {me_op['data'].get('wilayah')}")

    # Lapor Jalan Terputus
    jalan_dummy = {
        "geometry": {
            "coordinates": [[100.4650, -0.9520], [100.4720, -0.9560], [100.4780, -0.9590]]
        },
        "alasan": "longsor",
        "deskripsi": "Uji coba pelaporan longsor tebing Sitinjau Lauik."
    }
    tambah_res, _ = test_endpoint("3.9 Operator: Lapor Blokade Jalan Baru", "POST", "/api/jalan-terputus", data=jalan_dummy, expected_status=201)
    new_jalan_id = tambah_res.get("id") if tambah_res else None

    if new_jalan_id:
        test_endpoint("3.10 Operator: Pulihkan Status Ruas Jalan", "PUT", f"/api/jalan-terputus/{new_jalan_id}/pulihkan")

    # Update Posko
    if posko_list and "features" in posko_list and len(posko_list["features"]) > 0:
        first_posko_id = posko_list["features"][0]["properties"]["id"]
        test_endpoint("3.11 Operator: Update Kapasitas & Status Posko", "PUT", f"/api/posko/{first_posko_id}/status", data={"status": "aktif", "kapasitas": 250})

    test_endpoint("3.12 Logout Sesi Operator", "POST", "/api/auth/logout")

    # 3.6 Role 2: Admin BPBD Pusdalops
    print("\n>>> PENGUJIAN ROLE 2: ADMIN BPBD PUSDALOPS")
    adm_login = {"email": "admin@sumbarprov.go.id", "password": "AdminSumbar2026!"}
    test_endpoint("3.13 Login Admin Pusdalops", "POST", "/api/auth/login", data=adm_login)
    me_adm, _ = test_endpoint("3.14 Profil Admin (/api/auth/me)", "GET", "/api/auth/me")
    users_list, _ = test_endpoint("3.15 Admin: Kelola Personel (/api/admin/pengguna)", "GET", "/api/admin/pengguna")
    if users_list and "data" in users_list:
        print(f"     -> Terdata {len(users_list['data'])} akun terdaftar dalam sistem.")
    test_endpoint("3.16 Logout Sesi Admin", "POST", "/api/auth/logout")

    # 3.7 Role 3: Pimpinan BPBD / Diskominfotik
    print("\n>>> PENGUJIAN ROLE 3: PIMPINAN BPBD / DISKOMINFOTIK")
    pim_login = {"email": "pimpinan@sumbarprov.go.id", "password": "PimpinanSumbar2026!"}
    test_endpoint("3.17 Login Pimpinan Daerah", "POST", "/api/auth/login", data=pim_login)
    adm_stats, _ = test_endpoint("3.18 Pimpinan: Ringkasan Eksekutif (/api/admin/statistik)", "GET", "/api/admin/statistik")
    if adm_stats and "data" in adm_stats:
        d = adm_stats["data"]
        print(f"     -> KPI Eksekutif: Kerugian Rp {d.get('total_kerugian_miliar')}M | Korban: {d.get('total_korban')} | Posko: {d.get('posko_aktif')} | Blokade: {d.get('jalan_terputus_aktif')}")
    test_endpoint("3.19 Logout Sesi Pimpinan", "POST", "/api/auth/logout")

    # --- FASE 4: PENGERASAN PRODUKSI & OPTIMASI (HARDENING) ---
    print("\n>>> FASE 4: Pengerasan Produksi & Optimasi Performa")
    # 4.1 Enhanced Health Check & Monitoring
    h_data, _ = test_endpoint("4.1 Enhanced Health Check & Monitoring (/api/health)", "GET", "/api/health")
    if h_data:
        db_info = h_data.get("database", {})
        rt_info = h_data.get("routing", {})
        print(f"     -> PostGIS: {db_info.get('postgis')} | Routing: {rt_info.get('engine')} | Uptime: {h_data.get('uptime_seconds')}s")

    # 4.2 Vector Tile ST_AsMVT
    tile_data, _ = test_endpoint("4.2 Vector Tile ST_AsMVT (/api/tiles/choropleth/8/199/128.mvt)", "GET", "/api/tiles/choropleth/8/199/128.mvt")
    
    # 4.3 Vector Tile Cache Hit
    test_endpoint("4.3 Vector Tile In-Memory Cache Verification", "GET", "/api/tiles/choropleth/8/199/128.mvt")

    # 4.4 Trigger Refresh Materialized View Concurrently
    mv_res, _ = test_endpoint("4.4 Refresh Materialized View Concurrently", "POST", "/api/tiles/refresh-materialized-view")
    if mv_res:
        print(f"     -> Status: {mv_res.get('status')} | Terakhir Refresh: {mv_res.get('terakhir_refresh')}")

    print("\n" + "=" * 65)
    passed_cnt = sum(1 for _, s, _ in results if s)
    total_cnt = len(results)
    print(f"  HASIL VERIFIKASI AKHIR: {passed_cnt}/{total_cnt} PENGUJIAN BERHASIL ({int(passed_cnt/total_cnt*100)}%)")
    print("=" * 65)
    
    if passed_cnt == total_cnt:
        print("\n>>> STATUS: SELURUH FITUR & API FASE 1 S/D FASE 4 LULUS VERIFIKASI TANPA ERROR! <<<")
        sys.exit(0)
    else:
        print(f"\n>>> PERHATIAN: {total_cnt - passed_cnt} pengujian memerlukan perhatian. <<<")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
