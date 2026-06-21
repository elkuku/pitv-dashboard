#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, urllib.request, urllib.parse

_last_cpu = None

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

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def send_json(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
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
                self.send_response(502)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404); self.end_headers()

HTTPServer(('127.0.0.1', 3001), Handler).serve_forever()
