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

async function fetchTides(lat: number, lng: number): Promise<TideExtreme[] | null> {
  try {
    const res = await fetch(`/api/tides?lat=${lat}&lng=${lng}`)
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.data) ? data.data : null
  } catch {
    return null
  }
}

function renderTides(tides: TideExtreme[]): HTMLElement {
  const row = document.createElement('div')
  row.className = 'weather-tides'

  const label = document.createElement('span')
  label.className = 'weather-tides-label'
  label.textContent = `🌊 ${t('tides')}`
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

function renderWeather(data: OpenMeteoResponse, tides: TideExtreme[] | null): HTMLElement {
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

  root.append(cur, forecast)
  if (tides && tides.length > 0) root.appendChild(renderTides(tides))
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
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
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
