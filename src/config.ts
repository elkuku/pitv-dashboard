export interface LocationConfig {
  name: string
  latitude: number
  longitude: number
}

export const config = {
  location: {
    name: 'Berlin',
    latitude: 52.52,
    longitude: 13.41,
  } satisfies LocationConfig,
}
