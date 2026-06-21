import { config } from './config.js'

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

const WMO: Record<number, { icon: string; label: string }> = {
  0:  { icon: '☀️',  label: 'Clear' },
  1:  { icon: '🌤️', label: 'Mostly clear' },
  2:  { icon: '⛅',  label: 'Partly cloudy' },
  3:  { icon: '☁️',  label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Icy fog' },
  51: { icon: '🌦️', label: 'Light drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌦️', label: 'Heavy drizzle' },
  61: { icon: '🌧️', label: 'Light rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  71: { icon: '🌨️', label: 'Light snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '🌨️', label: 'Heavy snow' },
  77: { icon: '🌨️', label: 'Snow grains' },
  80: { icon: '🌦️', label: 'Light showers' },
  81: { icon: '🌦️', label: 'Showers' },
  82: { icon: '🌦️', label: 'Heavy showers' },
  85: { icon: '🌨️', label: 'Snow showers' },
  86: { icon: '🌨️', label: 'Heavy snow showers' },
  95: { icon: '⛈️',  label: 'Thunderstorm' },
  96: { icon: '⛈️',  label: 'Thunderstorm + hail' },
  99: { icon: '⛈️',  label: 'Thunderstorm + hail' },
}

function wmo(code: number): { icon: string; label: string } {
  if (WMO[code]) return WMO[code]
  const nearest = Object.keys(WMO)
    .map(Number)
    .filter((k) => k <= code)
    .at(-1)
  return nearest !== undefined ? WMO[nearest] : { icon: '🌡️', label: 'Unknown' }
}

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { weekday: 'short' })
}

function renderWeather(data: OpenMeteoResponse): HTMLElement {
  const { current, daily } = data
  const cond = wmo(current.weather_code)

  const root = document.createElement('div')
  root.className = 'weather'

  // Current conditions
  const cur = document.createElement('div')
  cur.className = 'weather-current'

  const iconEl = document.createElement('span')
  iconEl.className = 'weather-icon'
  iconEl.textContent = cond.icon

  const details = document.createElement('div')
  details.className = 'weather-current-details'

  const tempEl = document.createElement('span')
  tempEl.className = 'weather-temp'
  tempEl.textContent = `${Math.round(current.temperature_2m)}°C`

  const condEl = document.createElement('span')
  condEl.className = 'weather-condition'
  condEl.textContent = cond.label

  const windEl = document.createElement('span')
  windEl.className = 'weather-wind'
  windEl.textContent = `Wind ${Math.round(current.wind_speed_10m)} km/h`

  details.append(tempEl, condEl, windEl)
  cur.append(iconEl, details)

  // 5-day forecast
  const forecast = document.createElement('div')
  forecast.className = 'weather-forecast'

  for (let i = 0; i < Math.min(5, daily.time.length); i++) {
    const day = document.createElement('div')
    day.className = 'weather-day'

    const dc = wmo(daily.weather_code[i])

    const labelEl = document.createElement('span')
    labelEl.className = 'weather-day-label'
    labelEl.textContent = dayLabel(daily.time[i], i)

    const dayIcon = document.createElement('span')
    dayIcon.className = 'weather-day-icon'
    dayIcon.textContent = dc.icon

    const temps = document.createElement('span')
    temps.className = 'weather-day-temps'

    const high = document.createElement('span')
    high.className = 'weather-day-high'
    high.textContent = `${Math.round(daily.temperature_2m_max[i])}°`

    const low = document.createElement('span')
    low.className = 'weather-day-low'
    low.textContent = `${Math.round(daily.temperature_2m_min[i])}°`

    temps.append(high, low)
    day.append(labelEl, dayIcon, temps)
    forecast.appendChild(day)
  }

  root.append(cur, forecast)
  return root
}

export async function initWeather(): Promise<void> {
  const container = document.getElementById('weather')
  const titleEl = document.getElementById('weather-location')
  if (!container) return

  if (titleEl) titleEl.textContent = config.location.name

  const { latitude, longitude } = config.location
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=5`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: OpenMeteoResponse = await res.json()
    container.innerHTML = ''
    container.appendChild(renderWeather(data))
  } catch {
    container.textContent = 'Weather unavailable'
    container.classList.add('weather-error')
  }

  setTimeout(() => initWeather(), 30 * 60 * 1000)
}
