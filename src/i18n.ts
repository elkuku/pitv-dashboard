export type Lang = 'en' | 'de' | 'es'

const STORAGE_KEY = 'pitv-lang'

const ui = {
  en: {
    sectionWeather: 'Weather',
    sectionCalendar: 'Calendar',
    sectionHome: 'Home',
    sectionStreaming: 'Streaming',
    feelsLike: 'Feels like',
    wind: 'Wind',
    humidity: 'Humidity',
    uvIndex: 'UV index',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    moon: 'Moon',
    moonNew: 'New Moon',
    moonWaxingCrescent: 'Waxing Crescent',
    moonFirstQuarter: 'First Quarter',
    moonWaxingGibbous: 'Waxing Gibbous',
    moonFull: 'Full Moon',
    moonWaningGibbous: 'Waning Gibbous',
    moonLastQuarter: 'Last Quarter',
    moonWaningCrescent: 'Waning Crescent',
    tides: 'Tides',
    tideHigh: 'High',
    tideLow: 'Low',
    today: 'Today',
    allDay: 'All day',
    deviceOn: 'On',
    deviceOff: 'Off',
    deviceUnavailable: 'Unavailable',
    homeUnavailable: 'Home unavailable',
    calendarEmpty: 'No calendar configured — open settings to add one.',
    calendarError: 'Calendar unavailable',
    weatherError: 'Weather unavailable',
    settingsTitle: 'Settings',
    settingsLanguage: 'Language',
    settingsDashboardTitle: 'Dashboard Title',
    settingsLocation: 'Location',
    settingsCalendarUrl: 'Google Calendar ICS URL',
    settingsSave: 'Save',
    settingsClose: 'Close',
    cityPlaceholder: 'Enter city name…',
    searching: 'Searching…',
    noResults: 'No cities found',
    searchError: 'Search failed — check your connection',
  },
  de: {
    sectionWeather: 'Wetter',
    sectionCalendar: 'Kalender',
    sectionHome: 'Zuhause',
    sectionStreaming: 'Streaming',
    feelsLike: 'Gefühlt',
    wind: 'Wind',
    humidity: 'Luftfeuchte',
    uvIndex: 'UV-Index',
    sunrise: 'Sonnenaufgang',
    sunset: 'Sonnenuntergang',
    moon: 'Mond',
    moonNew: 'Neumond',
    moonWaxingCrescent: 'Zunehmende Sichel',
    moonFirstQuarter: 'Erstes Viertel',
    moonWaxingGibbous: 'Zunehmender Mond',
    moonFull: 'Vollmond',
    moonWaningGibbous: 'Abnehmender Mond',
    moonLastQuarter: 'Letztes Viertel',
    moonWaningCrescent: 'Abnehmende Sichel',
    tides: 'Gezeiten',
    tideHigh: 'Hoch',
    tideLow: 'Niedrig',
    today: 'Heute',
    allDay: 'Ganztägig',
    deviceOn: 'An',
    deviceOff: 'Aus',
    deviceUnavailable: 'Nicht verfügbar',
    homeUnavailable: 'Smart Home nicht verfügbar',
    calendarEmpty: 'Kein Kalender konfiguriert — Einstellungen öffnen.',
    calendarError: 'Kalender nicht verfügbar',
    weatherError: 'Wetter nicht verfügbar',
    settingsTitle: 'Einstellungen',
    settingsLanguage: 'Sprache',
    settingsDashboardTitle: 'Dashboard-Titel',
    settingsLocation: 'Standort',
    settingsCalendarUrl: 'Google Kalender ICS-URL',
    settingsSave: 'Speichern',
    settingsClose: 'Schließen',
    cityPlaceholder: 'Stadtname eingeben…',
    searching: 'Suche…',
    noResults: 'Keine Städte gefunden',
    searchError: 'Suche fehlgeschlagen — Verbindung prüfen',
  },
  es: {
    sectionWeather: 'Tiempo',
    sectionCalendar: 'Calendario',
    sectionHome: 'Hogar',
    sectionStreaming: 'Streaming',
    feelsLike: 'Sensación',
    wind: 'Viento',
    humidity: 'Humedad',
    uvIndex: 'Índice UV',
    sunrise: 'Amanecer',
    sunset: 'Atardecer',
    moon: 'Luna',
    moonNew: 'Luna nueva',
    moonWaxingCrescent: 'Creciente',
    moonFirstQuarter: 'Cuarto creciente',
    moonWaxingGibbous: 'Gibosa creciente',
    moonFull: 'Luna llena',
    moonWaningGibbous: 'Gibosa menguante',
    moonLastQuarter: 'Cuarto menguante',
    moonWaningCrescent: 'Luna menguante',
    tides: 'Mareas',
    tideHigh: 'Alta',
    tideLow: 'Baja',
    today: 'Hoy',
    allDay: 'Todo el día',
    deviceOn: 'Encendido',
    deviceOff: 'Apagado',
    deviceUnavailable: 'No disponible',
    homeUnavailable: 'Hogar no disponible',
    calendarEmpty: 'Sin calendario — abre los ajustes para añadir uno.',
    calendarError: 'Calendario no disponible',
    weatherError: 'Tiempo no disponible',
    settingsTitle: 'Ajustes',
    settingsLanguage: 'Idioma',
    settingsDashboardTitle: 'Título del panel',
    settingsLocation: 'Ubicación',
    settingsCalendarUrl: 'URL ICS de Google Calendar',
    settingsSave: 'Guardar',
    settingsClose: 'Cerrar',
    cityPlaceholder: 'Introduce una ciudad…',
    searching: 'Buscando…',
    noResults: 'No se encontraron ciudades',
    searchError: 'Error de búsqueda — verifica la conexión',
  },
} as const

export type TranslationKey = keyof typeof ui['en']

const wmoLabels: Record<Lang, Record<number, string>> = {
  en: {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Icy fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + hail',
  },
  de: {
    0: 'Klar', 1: 'Meist klar', 2: 'Teilweise bewölkt', 3: 'Bedeckt',
    45: 'Nebel', 48: 'Gefrierender Nebel',
    51: 'Leichter Nieselregen', 53: 'Nieselregen', 55: 'Starker Nieselregen',
    61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
    71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee', 77: 'Schneegriesel',
    80: 'Leichte Schauer', 81: 'Schauer', 82: 'Starke Schauer',
    85: 'Schneeschauer', 86: 'Starke Schneeschauer',
    95: 'Gewitter', 96: 'Gewitter + Hagel', 99: 'Gewitter + Hagel',
  },
  es: {
    0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla helada',
    51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa',
    61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia intensa',
    71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve intensa', 77: 'Granizo de nieve',
    80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos intensos',
    85: 'Chubascos de nieve', 86: 'Chubascos de nieve intensa',
    95: 'Tormenta', 96: 'Tormenta + granizo', 99: 'Tormenta + granizo',
  },
}

export function getLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'de' || stored === 'es') return stored
  const nav = navigator.language.slice(0, 2).toLowerCase()
  if (nav === 'de') return 'de'
  if (nav === 'es') return 'es'
  return 'en'
}

export function setLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang)
  location.reload()
}

export function t(key: TranslationKey): string {
  return (ui[getLang()] as Record<string, string>)[key] ?? (ui.en as Record<string, string>)[key]
}

export function wmoLabel(code: number): string {
  const labels = wmoLabels[getLang()]
  const nearest = Object.keys(labels).map(Number).filter(k => k <= code).at(-1)
  return nearest !== undefined ? labels[nearest] : wmoLabels.en[0]
}

export function locale(): string {
  const map: Record<Lang, string> = { en: 'en', de: 'de', es: 'es' }
  return map[getLang()]
}

export function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n as TranslationKey)
  })
  document.querySelectorAll<HTMLInputElement>('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh as TranslationKey)
  })
  // Mark active lang button
  const lang = getLang()
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang)
  })
}
