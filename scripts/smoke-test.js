import http from 'http'
import fs from 'fs'
import path from 'path'
import { execSync, spawn } from 'child_process'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 7778
const OUT = path.join(ROOT, 'screenshot.png')

// ─── Build ────────────────────────────────────────────────────────────────────
console.log('Building...')
execSync('node scripts/build.js', { cwd: ROOT, stdio: 'inherit' })

// ─── Fake data ────────────────────────────────────────────────────────────────
const now = new Date()

const dayStr = (offset = 0) => {
  const d = new Date(now)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const hourlyTime = (i) => {
  const d = new Date(now)
  d.setHours(d.getHours() - 12 + i, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

const sunTime = (dayOffset, h, m) => {
  const d = new Date(now)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const FAKE_WEATHER = {
  current: {
    temperature_2m: 21.4,
    apparent_temperature: 20.1,
    weather_code: 1,
    wind_speed_10m: 12.3,
    relative_humidity_2m: 65,
    uv_index: 3.2,
  },
  hourly: {
    time: Array.from({ length: 25 }, (_, i) => hourlyTime(i)),
    temperature_2m: [17,17,18,18,19,20,21,22,23,23,22,21,21,20,20,19,18,17,17,16,16,15,15,15,16],
    precipitation_probability: [0,0,0,0,5,10,5,0,0,0,10,20,25,20,15,10,5,0,0,0,0,0,0,0,0],
  },
  daily: {
    time: Array.from({ length: 5 }, (_, i) => dayStr(i)),
    weather_code: [1, 3, 61, 2, 0],
    temperature_2m_max: [23, 21, 18, 22, 25],
    temperature_2m_min: [14, 15, 12, 13, 15],
    precipitation_probability_max: [5, 30, 80, 20, 5],
    sunrise: Array.from({ length: 5 }, (_, i) => sunTime(i, 5, 21)),
    sunset: Array.from({ length: 5 }, (_, i) => sunTime(i, 21, 12)),
  },
}

const FAKE_STATS = {
  cpu_temp: 52.3,
  cpu_percent: 12.5,
  mem: { used_mb: 2048, total_mb: 8192, percent: 25.0 },
}

const FAKE_DEVICES = [
  { entity_id: 'switch.tv', name: 'TV', icon: '📺', state: 'on' },
  { entity_id: 'switch.kitchen', name: 'Kitchen', icon: '🍳', state: 'off' },
  { entity_id: 'switch.living_room', name: 'Living Room', icon: '💡', state: 'on' },
]

const FAKE_NEWS = [
  { title: 'Scientists discover new deep-sea species in the Pacific', source: 'BBC News' },
  { title: 'Tech giants announce joint AI safety framework', source: 'Reuters' },
  { title: 'Record renewable energy output in Germany last month', source: 'DW News' },
  { title: 'Space agency confirms water ice found near Mars south pole', source: 'AFP' },
]

const FAKE_TIDES = {
  tides: [
    { height: 3.21, time: new Date(now.getTime() - 3 * 3600000).toISOString(), type: 'high' },
    { height: 0.42, time: new Date(now.getTime() + 3 * 3600000).toISOString(), type: 'low' },
    { height: 3.15, time: new Date(now.getTime() + 9 * 3600000).toISOString(), type: 'high' },
  ],
  station: 'Helgoland',
}

const icsDay = (offset) => {
  const d = new Date(now)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

const FAKE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Smoke Test//EN',
  'BEGIN:VEVENT',
  `DTSTART;VALUE=DATE:${icsDay(0)}`,
  `DTEND;VALUE=DATE:${icsDay(1)}`,
  'SUMMARY:Team Standup',
  'END:VEVENT',
  'BEGIN:VEVENT',
  `DTSTART;VALUE=DATE:${icsDay(0)}`,
  `DTEND;VALUE=DATE:${icsDay(1)}`,
  'SUMMARY:Sprint Planning',
  'END:VEVENT',
  'BEGIN:VEVENT',
  `DTSTART;VALUE=DATE:${icsDay(1)}`,
  `DTEND;VALUE=DATE:${icsDay(2)}`,
  'SUMMARY:Weekly Review',
  'END:VEVENT',
  'BEGIN:VEVENT',
  `DTSTART;VALUE=DATE:${icsDay(3)}`,
  `DTEND;VALUE=DATE:${icsDay(4)}`,
  'SUMMARY:Team Outing',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

// ─── Mock fetch injection ─────────────────────────────────────────────────────
// Escape JSON for safe embedding inside a <script> tag
const safeJson = (obj) =>
  JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

// This script runs synchronously before any module code, so localStorage is
// already set and window.fetch is already overridden when initWeather() etc. fire.
const MOCK_SCRIPT = `<script>
(function () {
  localStorage.setItem('pitv-location', '{"name":"Mannheim","latitude":49.4891,"longitude":8.4669}')
  localStorage.setItem('pitv-title', "KuKu's Home")
  localStorage.setItem('pitv-calendar-url', 'https://fake.test/cal.ics')
  var WEATHER = ${safeJson(FAKE_WEATHER)}
  var _fetch = window.fetch.bind(window)
  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : input.toString()
    if (url.includes('open-meteo.com')) {
      return new Response(JSON.stringify(WEATHER), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return _fetch(input, init)
  }
})()
</script>`

// ─── HTTP server ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
}

function jsonReply(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const p = url.pathname
  console.log(`  [mock] ${req.method} ${p}`)

  if (p === '/api/stats')      return jsonReply(res, FAKE_STATS)
  if (p === '/api/ha/devices') return jsonReply(res, FAKE_DEVICES)
  if (p === '/api/ha/toggle')  return jsonReply(res, FAKE_DEVICES[0])
  if (p === '/api/tides')      return jsonReply(res, FAKE_TIDES)
  if (p === '/api/news')       return jsonReply(res, FAKE_NEWS)
  if (p === '/api/calendar') {
    res.writeHead(200, { 'Content-Type': 'text/calendar' })
    return res.end(FAKE_ICS)
  }

  const rel = p === '/' ? '/index.html' : p
  const file = path.join(ROOT, 'dist', rel.replace(/\.\./g, ''))

  if (!fs.existsSync(file)) {
    console.log(`  [mock] 404 ${p}`)
    res.writeHead(404)
    return res.end('Not found')
  }

  const ext = path.extname(file)
  let content = fs.readFileSync(file)

  if (ext === '.html') {
    content = content.toString().replace('<head>', '<head>\n' + MOCK_SCRIPT)
  }

  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
  res.end(content)
})

// ─── Screenshot ───────────────────────────────────────────────────────────────
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock server → http://127.0.0.1:${PORT}`)

  console.log('Launching Chrome headless...')

  const chrome = spawn('google-chrome-stable', [
    '--headless=new',
    `--screenshot=${OUT}`,
    '--window-size=1920,1080',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    '--enable-logging=stderr',
    `http://127.0.0.1:${PORT}`,
  ], { stdio: 'inherit' })

  const watchdog = setTimeout(() => {
    console.error('Timeout: killing Chrome after 30s')
    chrome.kill()
  }, 30000)

  chrome.on('close', (code) => {
    clearTimeout(watchdog)
    server.close()
    if (code === 0 && fs.existsSync(OUT)) {
      console.log(`Screenshot → ${OUT}`)
    } else {
      console.error(`Screenshot failed (Chrome exit ${code}, file exists: ${fs.existsSync(OUT)})`)
      process.exit(1)
    }
  })
})
