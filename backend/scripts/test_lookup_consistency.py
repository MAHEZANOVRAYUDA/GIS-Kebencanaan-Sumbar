import urllib.request
import json

res = urllib.request.urlopen('http://127.0.0.1:8000/api/wilayah/geojson?level=kecamatan')
data = json.loads(res.read().decode())
features = data.get('features', [])
print(f"Total features: {len(features)}")

mismatch = 0
not_founds = 0
for f in features:
    props = f['properties']
    lat, lon = props['lat'], props['lon']
    try:
        url = f"http://127.0.0.1:8000/api/wilayah/lookup?lat={lat}&lon={lon}"
        r = urllib.request.urlopen(url)
        ld = json.loads(r.read().decode())
        if ld['id'] != props['id']:
            mismatch += 1
            print(f"Mismatch: {props['nama']} (ID {props['id']}) -> Lookup returned {ld['nama']} (ID {ld['id']}, Level {ld['level']})")
    except Exception as e:
        not_founds += 1
        print(f"Lookup failed for {props['nama']} (ID {props['id']}) at ({lat}, {lon}): {e}")

print(f"Summary: {len(features)} total, {mismatch} mismatches, {not_founds} failures")
