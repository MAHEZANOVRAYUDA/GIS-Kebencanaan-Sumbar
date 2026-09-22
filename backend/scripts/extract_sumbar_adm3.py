import httpx
import io
import zipfile
import json
import os

url = 'https://raw.githubusercontent.com/bachtiarpanjaitan/geojson-id/master/data/adm3.json.zip'
print("Mengunduh adm3.json.zip...")
resp = httpx.get(url, timeout=120)
resp.raise_for_status()

zf = zipfile.ZipFile(io.BytesIO(resp.content))
with zf.open('adm3.json') as f:
    data = json.load(f)

print("Tipe data:", type(data))
print("Panjang data:", len(data))
if len(data) > 0:
    first_item = data[0]
    print("Tipe item pertama:", type(first_item))
    if isinstance(first_item, dict):
        print("Keys item pertama:", list(first_item.keys()))
        if 'properties' in first_item:
            print("Properties item pertama:", first_item['properties'])
        else:
            print("Item pertama snippet:", {k: str(v)[:60] for k, v in list(first_item.items())[:6]})

# Cek berapa banyak item Sumbar
sumbar_items = []
for item in data:
    if isinstance(item, dict):
        # Cek jika GeoJSON feature
        props = item.get('properties', item)
        # kode biasanya berawalan '13'
        code = str(props.get('kd_kec', props.get('id', props.get('kode', props.get('adm3_id', '')))))
        prov_code = str(props.get('kd_prov', props.get('prov_id', '')))
        nm_prov = str(props.get('nm_prov', props.get('provinsi', ''))).lower()
        if code.startswith('13') or prov_code == '13' or 'sumatera barat' in nm_prov or 'sumbar' in nm_prov:
            sumbar_items.append(item)

print(f"Total item Sumbar ditemukan: {len(sumbar_items)}")
if sumbar_items:
    item0 = sumbar_items[0]
    props0 = item0.get('properties', item0)
    print("Properties contoh Sumbar:", {k: v for k, v in props0.items() if k != 'geometry' and k != 'geom'})
