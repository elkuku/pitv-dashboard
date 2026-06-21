import { loadLocation } from './config.js'
import { t, locale, wmoLabel } from './i18n.js'

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

function stat(icon: string, value: string, label: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'weather-stat'
  el.innerHTML = `<span class="weather-stat-icon">${icon}</span><span class="weather-stat-value">${value}</span><span class="weather-stat-label">${label}</span>`
  return el
}

function renderWeather(data: OpenMeteoResponse): HTMLElement {
  const { current, daily } = data
  const icon = wmoIcon(current.weather_code)
  const label = wmoLabel(current.weather_code)

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

  const statsEl = document.createElement('div')
  statsEl.className = 'weather-stats'
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })

  statsEl.append(
    stat('🌡️', `${Math.round(current.apparent_temperature)}°C`, t('feelsLike')),
    stat('💧', `${current.relative_humidity_2m}%`, t('humidity')),
    stat('💨', `${Math.round(current.wind_speed_10m)} km/h`, t('wind')),
    stat('☀️', String(Math.round(current.uv_index)), t('uvIndex')),
    stat('🌅', fmtTime(daily.sunrise[0]), t('sunrise')),
    stat('🌇', fmtTime(daily.sunset[0]), t('sunset')),
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
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: OpenMeteoResponse = await res.json()
    container.innerHTML = ''
    container.appendChild(renderWeather(data))
  } catch {
    container.textContent = t('weatherError')
    container.classList.add('weather-error')
  }

  setTimeout(() => initWeather(), 30 * 60 * 1000)
}
