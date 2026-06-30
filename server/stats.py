#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, urllib.request, urllib.parse, os

_last_cpu = None
_ha = None
_tide_cache: dict = {}
_news_cache: dict = {}

NEWS_FEEDS = {
    'en': [
        ('BBC',        'http://feeds.bbci.co.uk/news/world/rss.xml'),
        ('DW',         'https://rss.dw.com/xml/rss-en-world'),
        ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'),
    ],
    'de': [
        ('Tagesschau', 'https://www.tagesschau.de/xml/rss2/'),
        ('DW',         'https://rss.dw.com/xml/rss-de-all'),
        ('Spiegel',    'https://www.spiegel.de/schlagzeilen/index.rss'),
    ],
    'es': [
        ('BBC Mundo',  'http://feeds.bbci.co.uk/mundo/rss.xml'),
        ('DW Español', 'https://rss.dw.com/xml/rss-es-all'),
        ('El País',    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'),
    ],
}

def fetch_news(lang='en'):
    import xml.etree.ElementTree as ET
    from datetime import datetime, timezone
    global _news_cache
    now = datetime.now(timezone.utc)
    entry = _news_cache.get(lang, {})
    if entry.get('time') and (now - entry['time']).seconds < 1800:
        return entry['items']
    feeds = NEWS_FEEDS.get(lang, NEWS_FEEDS['en'])
    items = []
    for source, url in feeds:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as res:
                root = ET.fromstring(res.read())
            channel = root.find('channel') or root
            for item in channel.findall('item')[:5]:
                title = (item.findtext('title') or '').strip()
                url = (item.findtext('link') or '').strip()
                if title:
                    items.append({'title': title, 'source': source, 'url': url})
        except Exception:
            pass
    if items:
        _news_cache[lang] = {'time': now, 'items': items}
    return _news_cache.get(lang, {}).get('items', [])

def load_ha_config():
    global _ha
    cfg_path = os.path.join(os.path.dirname(__file__), 'ha-config.json')
    try:
        with open(cfg_path) as f:
            _ha = json.load(f)
    except Exception:
        _ha = None

def cpu_temp():
    try:
        with open('/sys/class/thermal/thermal_zone0/temp') as f:
            return round(int(f.read().strip()) / 1000, 1)
    except:
        return None

def cpu_percent():
    global _last_cpu
    try:
        with open('/proc/stat') as f:
            vals = list(map(int, f.readline().split()[1:]))
        total, idle = sum(vals), vals[3]
        if _last_cpu:
            dt, di = total - _last_cpu[0], idle - _last_cpu[1]
            pct = round((dt - di) / dt * 100) if dt > 0 else 0
        else:
            pct = 0
        _last_cpu = (total, idle)
        return pct
    except:
        return None

def mem_info():
    try:
        info = {}
        with open('/proc/meminfo') as f:
            for line in f:
                k, v = line.split(':')
                info[k.strip()] = int(v.split()[0])
        total = info['MemTotal']
        used = total - info['MemAvailable']
        return {'used_mb': round(used / 1024), 'total_mb': round(total / 1024), 'percent': round(used / total * 100)}
    except:
        return None

def ha_request(method, path, body=None):
    if not _ha:
        return None
    url = _ha['url'].rstrip('/') + path
    headers = {
        'Authorization': f"Bearer {_ha['token']}",
        'Content-Type': 'application/json',
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return json.loads(res.read())
    except Exception:
        return None

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/api/stats':
            self.send_json({
                'cpu_temp': cpu_temp(),
                'cpu_percent': cpu_percent(),
                'mem': mem_info(),
            })

        elif parsed.path == '/api/calendar':
            url = params.get('url', [None])[0]
            if not url:
                self.send_response(400); self.end_headers(); return
            try:
                req = urllib.request.urlopen(url, timeout=10)
                body = req.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/calendar; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_response(502); self.end_headers()
                self.wfile.write(str(e).encode())

        elif parsed.path == '/api/news':
            lang = params.get('lang', ['en'])[0]
            if lang not in ('en', 'de', 'es'):
                lang = 'en'
            self.send_json(fetch_news(lang))

        elif parsed.path == '/api/tides':
            key = _ha.get('stormglass_key', '') if _ha else ''
            if not key:
                self.send_json({'error': 'no stormglass key'}, 404); return
            # Prefer explicit tide coordinates from config over weather location
            lat = str(_ha.get('tide_lat') or params.get('lat', [None])[0])
            lng = str(_ha.get('tide_lng') or params.get('lng', [None])[0])
            if not lat or lat == 'None' or not lng or lng == 'None':
                self.send_json({'error': 'missing lat/lng'}, 400); return
            from datetime import datetime, timezone, timedelta
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            cache_key = f"{lat},{lng},{today}"
            if _tide_cache.get('key') == cache_key:
                self.send_json(_tide_cache['data']); return
            start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            fmt = '%Y-%m-%dT%H:%M:%SZ'
            tide_url = (f"https://api.stormglass.io/v2/tide/extremes/point"
                        f"?lat={lat}&lng={lng}"
                        f"&start={start.strftime(fmt)}&end={end.strftime(fmt)}")
            req = urllib.request.Request(tide_url, headers={'Authorization': key})
            try:
                with urllib.request.urlopen(req, timeout=10) as res:
                    data = json.loads(res.read())
                    _tide_cache['key'] = cache_key
                    _tide_cache['data'] = data
                    self.send_json(data)
            except Exception as e:
                self.send_json({'error': str(e)}, 502)

        elif parsed.path == '/api/ha/devices':
            if not _ha:
                self.send_json([], 404); return
            result = []
            for dev in _ha.get('devices', []):
                state = ha_request('GET', f"/api/states/{dev['entity_id']}")
                result.append({
                    'entity_id': dev['entity_id'],
                    'name': dev['name'],
                    'icon': dev['icon'],
                    'state': state['state'] if state else 'unavailable',
                })
            self.send_json(result)

        else:
            self.send_response(404); self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if parsed.path == '/api/ha/toggle':
            entity_id = body.get('entity_id')
            if not entity_id or not _ha:
                self.send_json({'error': 'missing entity_id'}, 400); return
            state = ha_request('GET', f"/api/states/{entity_id}")
            if not state:
                self.send_json({'error': 'could not get state'}, 502); return
            domain = entity_id.split('.')[0]
            service = 'turn_off' if state['state'] == 'on' else 'turn_on'
            ha_request('POST', f"/api/services/{domain}/{service}", {'entity_id': entity_id})
            new_state = 'off' if state['state'] == 'on' else 'on'
            self.send_json({'entity_id': entity_id, 'state': new_state})

        else:
            self.send_response(404); self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

load_ha_config()
HTTPServer(('127.0.0.1', 3001), Handler).serve_forever()
