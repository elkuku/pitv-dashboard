const STORAGE_KEY = 'pitv-location'

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
