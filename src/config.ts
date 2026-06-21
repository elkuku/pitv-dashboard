const STORAGE_KEY = 'pitv-location'
const TITLE_KEY = 'pitv-title'
const DEFAULT_TITLE = "KuKu's Home"

export function loadTitle(): string {
  return localStorage.getItem(TITLE_KEY) ?? DEFAULT_TITLE
}

export function saveTitle(title: string): void {
  localStorage.setItem(TITLE_KEY, title || DEFAULT_TITLE)
}

export interface LocationConfig {
  name: string
  latitude: number
  longitude: number
}

const defaultLocation: LocationConfig = {
  name: 'Mannheim',
  latitude: 49.4891,
  longitude: 8.4669,
}

export function loadLocation(): LocationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (
        typeof parsed.name === 'string' &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number'
      ) {
        return parsed as LocationConfig
      }
    }
  } catch {}
  return defaultLocation
}

export function saveLocation(loc: LocationConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
}
