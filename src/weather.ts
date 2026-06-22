import { loadLocation } from './config.js'
import { t, locale, wmoLabel, type TranslationKey } from './i18n.js'

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    wind_speed_10m: number
    relative_humidity_2m: number
    uv_index: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    sunrise: string[]
    sunset: string[]
  }
}

interface TideExtreme {
  height: number
  time: string
  type: 'high' | 'low'
}

const WMO_ICON: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

function wmoIcon(code: number): string {
  const nearest = Object.keys(WMO_ICON).map(Number).filter(k => k <= code).at(-1)
  return nearest !== undefined ? WMO_ICON[nearest] : '🌡️'
}

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return t('today')
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale(), { weekday: 'short' })
}

function moonPhase(date: Date): { emoji: string; nameKey: TranslationKey } {
  // Known new moon: 2000-01-06 18:14 UTC
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14)
  const synodicPeriod = 29.530588
  const elapsed = (date.getTime() - knownNewMoon) / 86_400_000
  const age = ((elapsed % synodicPeriod) + synodicPeriod) % synodicPeriod

  if (age < 1.85)  return { emoji: '🌑', nameKey: 'moonNew' }
  if (age < 7.38)  return { emoji: '🌒', nameKey: 'moonWaxingCrescent' }
  if (age < 11.08) return { emoji: '🌓', nameKey: 'moonFirstQuarter' }
  if (age < 14.77) return { emoji: '🌔', nameKey: 'moonWaxingGibbous' }
  if (age < 16.61) return { emoji: '🌕', nameKey: 'moonFull' }
  if (age < 22.15) return { emoji: '🌖', nameKey: 'moonWaningGibbous' }
  if (age < 25.84) return { emoji: '🌗', nameKey: 'moonLastQuarter' }
  return { emoji: '🌘', nameKey: 'moonWaningCrescent' }
}

function stat(icon: string, value: string, label: string, extraClass = ''): HTMLElement {
  const el = document.createElement('div')
  el.className = `weather-stat${extraClass ? ' ' + extraClass : ''}`
  el.innerHTML = `<span class="weather-stat-icon">${icon}</span><span class="weather-stat-value">${value}</span><span class="weather-stat-label">${label}</span>`
  return el
}

async function fetchTides(lat: number, lng: number): Promise<{ tides: TideExtreme[]; station: string } | null> {
  try {
    const res = await fetch(`/api/tides?lat=${lat}&lng=${lng}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data.data)) return null
    const station: string = data.meta?.station?.name ?? ''
    return { tides: data.data, station }
  } catch {
    return null
  }
}

function renderTides(tides: TideExtreme[], station: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'weather-tides'

  const label = document.createElement('span')
  label.className = 'weather-tides-label'
  const stationLabel = station ? ` · ${station.charAt(0).toUpperCase() + station.slice(1)}` : ''
  label.textContent = `🌊 ${t('tides')}${stationLabel}`
  row.appendChild(label)

  const items = document.createElement('div')
  items.className = 'weather-tides-items'

  const loc = locale()
  for (const tide of tides) {
    const card = document.createElement('div')
    card.className = `weather-tide ${tide.type}`

    const arrow = document.createElement('span')
    arrow.className = 'weather-tide-arrow'
    arrow.textContent = tide.type === 'high' ? '▲' : '▼'

    const time = document.createElement('span')
    time.className = 'weather-tide-time'
    time.textContent = new Date(tide.time).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })

    const lbl = document.createElement('span')
    lbl.className = 'weather-tide-label'
    lbl.textContent = tide.type === 'high' ? t('tideHigh') : t('tideLow')

    card.append(arrow, time, lbl)
    items.appendChild(card)
  }

  row.appendChild(items)
  return row
}

function renderTempGraph(hourly: { time: string[]; temperature_2m: number[] }): HTMLElement | null {
  const now = Date.now()
  const windowMs = 12 * 60 * 60 * 1000

  const pts = hourly.time
    .map((t, i) => ({ ts: new Date(t).getTime(), temp: hourly.temperature_2m[i] }))
    .filter(p => p.ts >= now - windowMs && p.ts <= now + windowMs)

  if (pts.length < 2) return null

  const W = 860, H = 90
  const pL = 38, pR = 10, pT = 14, pB = 26
  const gW = W - pL - pR
  const gH = H - pT - pB

  const temps = pts.map(p => p.temp)
  const rawMin = Math.min(...temps)
  const rawMax = Math.max(...temps)
  const yPad = Math.max(rawMax - rawMin, 2) * 0.25
  const minT = rawMin - yPad
  const maxT = rawMax + yPad

  const t0 = pts[0].ts
  const tEnd = pts[pts.length - 1].ts
  const xOf = (ts: number) => pL + ((ts - t0) / (tEnd - t0)) * gW
  const yOf = (temp: number) => pT + (1 - (temp - minT) / (maxT - minT)) * gH

  const plotPts = pts.map(p => ({ x: xOf(p.ts), y: yOf(p.temp), ts: p.ts, temp: p.temp }))

  const ns = 'http://www.w3.org/2000/svg'
  function svgEl(tag: string, attrs: Record<string, string | number> = {}): Element {
    const e = document.createElementNS(ns, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
    return e
  }

  function buildPath(ps: {x: number; y: number}[]) {
    const k = 0.35
    let d = `M${ps[0].x.toFixed(1)},${ps[0].y.toFixed(1)}`
    for (let i = 0; i < ps.length - 1; i++) {
      const p0 = ps[Math.max(0, i - 1)]
      const p1 = ps[i]
      const p2 = ps[i + 1]
      const p3 = ps[Math.min(ps.length - 1, i + 2)]
      const c1x = p1.x + (p2.x - p0.x) * k / 3
      const c1y = p1.y + (p2.y - p0.y) * k / 3
      const c2x = p2.x - (p3.x - p1.x) * k / 3
      const c2y = p2.y - (p3.y - p1.y) * k / 3
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
    }
    return d
  }

  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  svg.setAttribute('width', '100%')
  svg.classList.add('weather-temp-graph-svg')

  const defs = svgEl('defs')
  const grad = svgEl('linearGradient', { id: 'tg', x1: '0', y1: '0', x2: '0', y2: '1' })
  const s1 = svgEl('stop', { offset: '0%', 'stop-color': '#7dd3fc', 'stop-opacity': '0.25' })
  const s2 = svgEl('stop', { offset: '100%', 'stop-color': '#7dd3fc', 'stop-opacity': '0' })
  grad.append(s1, s2)
  defs.appendChild(grad)
  svg.appendChild(defs)

  const linePath = buildPath(plotPts)
  const bottomY = pT + gH

  svg.appendChild(svgEl('path', {
    d: `${linePath} L${plotPts[plotPts.length - 1].x.toFixed(1)},${bottomY} L${plotPts[0].x.toFixed(1)},${bottomY} Z`,
    fill: 'url(#tg)',
  }))
  svg.appendChild(svgEl('path', {
    d: linePath,
    fill: 'none',
    stroke: '#7dd3fc',
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }))

  const nowX = xOf(now)
  svg.appendChild(svgEl('line', {
    x1: nowX, y1: pT - 4, x2: nowX, y2: bottomY + 2,
    stroke: '#ffffff', 'stroke-width': '1.5', 'stroke-dasharray': '3,3', opacity: '0.45',
  }))

  const nowPt = plotPts.reduce((a, b) => Math.abs(a.ts - now) < Math.abs(b.ts - now) ? a : b)
  const tLabel = svgEl('text', {
    x: nowX, y: Math.max(nowPt.y - 6, pT + 6),
    'text-anchor': 'middle', fill: '#ffffff', 'font-size': '11', 'font-weight': '700',
  })
  tLabel.textContent = `${Math.round(nowPt.temp)}°`
  svg.appendChild(tLabel)

  const addYLabel = (y: number, val: number) => {
    const t = svgEl('text', {
      x: pL - 5, y,
      'text-anchor': 'end', 'dominant-baseline': 'middle', fill: '#666', 'font-size': '10',
    })
    t.textContent = `${Math.round(val)}°`
    svg.appendChild(t)
  }
  addYLabel(pT, rawMax)
  addYLabel(pT + gH, rawMin)

  const tickInterval = 3 * 3600000
  const firstTick = Math.ceil(t0 / tickInterval) * tickInterval
  const loc = locale()
  for (let tick = firstTick; tick <= tEnd; tick += tickInterval) {
    const tx = xOf(tick)
    svg.appendChild(svgEl('line', { x1: tx, y1: bottomY, x2: tx, y2: bottomY + 4, stroke: '#444', 'stroke-width': '1' }))
    const lt = svgEl('text', { x: tx, y: H - 3, 'text-anchor': 'middle', fill: '#666', 'font-size': '10' })
    lt.textContent = new Date(tick).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
    svg.appendChild(lt)
  }

  return svg as unknown as HTMLElement
}

function renderWeather(data: OpenMeteoResponse, tidesResult: { tides: TideExtreme[]; station: string } | null): HTMLElement {
  const { current, daily } = data
  const icon = wmoIcon(current.weather_code)
  const label = wmoLabel(current.weather_code)
  const moon = moonPhase(new Date())

  const root = document.createElement('div')
  root.className = 'weather'

  // ── Current conditions ──
  const cur = document.createElement('div')
  cur.className = 'weather-current'

  const iconEl = document.createElement('span')
  iconEl.className = 'weather-icon'
  iconEl.textContent = icon

  const info = document.createElement('div')
  info.className = 'weather-info'

  const tempEl = document.createElement('span')
  tempEl.className = 'weather-temp'
  tempEl.textContent = `${Math.round(current.temperature_2m)}°C`

  const condEl = document.createElement('span')
  condEl.className = 'weather-condition'
  condEl.textContent = label

  info.append(tempEl, condEl)

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })

  const statsEl = document.createElement('div')
  statsEl.className = 'weather-stats'
  statsEl.append(
    stat('🌡️', `${Math.round(current.apparent_temperature)}°C`, t('feelsLike')),
    stat('💧', `${current.relative_humidity_2m}%`, t('humidity')),
    stat('💨', `${Math.round(current.wind_speed_10m)} km/h`, t('wind')),
    stat('☀️', String(Math.round(current.uv_index)), t('uvIndex')),
    stat('🌅', fmtTime(daily.sunrise[0]), t('sunrise')),
    stat('🌇', fmtTime(daily.sunset[0]), t('sunset')),
    stat(moon.emoji, t(moon.nameKey), t('moon'), 'weather-stat-moon'),
  )

  cur.append(iconEl, info, statsEl)

  // ── Forecast ──
  const forecast = document.createElement('div')
  forecast.className = 'weather-forecast'

  for (let i = 0; i < Math.min(5, daily.time.length); i++) {
    const day = document.createElement('div')
    day.className = 'weather-day'

    const labelEl = document.createElement('span')
    labelEl.className = 'weather-day-label'
    labelEl.textContent = dayLabel(daily.time[i], i)

    const dayIcon = document.createElement('span')
    dayIcon.className = 'weather-day-icon'
    dayIcon.textContent = wmoIcon(daily.weather_code[i])

    const temps = document.createElement('span')
    temps.className = 'weather-day-temps'
    const high = document.createElement('span')
    high.className = 'weather-day-high'
    high.textContent = `${Math.round(daily.temperature_2m_max[i])}°`
    const low = document.createElement('span')
    low.className = 'weather-day-low'
    low.textContent = `${Math.round(daily.temperature_2m_min[i])}°`
    temps.append(high, low)

    const precip = document.createElement('span')
    precip.className = 'weather-day-precip'
    precip.textContent = `${daily.precipitation_probability_max[i] ?? 0}%`

    day.append(labelEl, dayIcon, temps, precip)
    forecast.appendChild(day)
  }

  root.appendChild(cur)
  const graphEl = renderTempGraph(data.hourly)
  if (graphEl) {
    const wrap = document.createElement('div')
    wrap.className = 'weather-temp-graph'
    wrap.appendChild(graphEl)
    root.appendChild(wrap)
  }
  root.appendChild(forecast)
  if (tidesResult && tidesResult.tides.length > 0) root.appendChild(renderTides(tidesResult.tides, tidesResult.station))
  return root
}

export async function initWeather(): Promise<void> {
  const container = document.getElementById('weather')
  const titleEl = document.getElementById('weather-location')
  if (!container) return

  const loc = loadLocation()
  if (titleEl) titleEl.textContent = loc.name

  const { latitude, longitude } = loc
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,uv_index` +
    `&hourly=temperature_2m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
    `&past_hours=12&forecast_hours=13` +
    `&timezone=auto&forecast_days=5`

  try {
    const [weatherRes, tides] = await Promise.all([
      fetch(url),
      fetchTides(latitude, longitude),
    ])
    if (!weatherRes.ok) throw new Error(`HTTP ${weatherRes.status}`)
    const data: OpenMeteoResponse = await weatherRes.json()
    container.innerHTML = ''
    container.appendChild(renderWeather(data, tides))
  } catch {
    container.textContent = t('weatherError')
    container.classList.add('weather-error')
  }

  setTimeout(() => initWeather(), 30 * 60 * 1000)
}
