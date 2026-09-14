import httpx
import json

def check():
    r = httpx.get('https://data.sumbarprov.go.id/api/3/action/package_search?fq=organization:badan-penanggulangan-bencana-daerah', timeout=10)
    res = r.json()['result']['results']
    print(f"Total datasets found: {len(res)}")
    for i, item in enumerate(res):
        title = item.get('title')
        name = item.get('name')
        resources = item.get('resources', [])
        formats = [res.get('format') for res in resources]
        urls = [res.get('url') for res in resources]
        print(f"{i+1}. [{name}] {title} -> {formats}")
        if urls:
            print(f"   Resource 0: {urls[0]}")

if __name__ == '__main__':
    check()
