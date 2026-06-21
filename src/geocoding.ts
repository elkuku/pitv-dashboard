export interface GeoResult {
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string
}

export async function searchCity(query: string): Promise<GeoResult[]> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.results ?? []) as GeoResult[]
}
