import './styles.css'
import { initWeather } from './weather.js'
import { initSettings } from './settings.js'
import { initSystem } from './system.js'
import { initCalendar } from './calendar.js'
import { initHome } from './home.js'
import { applyI18n } from './i18n.js'

interface Service {
  name: string
  url: string
  color: string
  logo?: string
}

const services: Service[] = [
  {
    name: 'Netflix',
    url: 'https://www.netflix.com',
    color: '#e50914',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    color: '#ff0000',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
  },
  {
    name: 'Disney+',
    url: 'https://www.disneyplus.com',
    color: '#0063e5',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com',
    color: '#1db954',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  },
  {
    name: 'HBO Max',
    url: 'https://www.max.com',
    color: '#a855f7',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function createTile(service: Service): HTMLAnchorElement {
  const a = document.createElement('a')
  a.href = service.url
  a.className = 'tile'
  a.style.setProperty('--brand', service.color)
  a.tabIndex = 0
  a.setAttribute('aria-label', service.name)
  a.target = '_self'

  const logoDiv = document.createElement('div')
  logoDiv.className = 'tile-logo'

  if (service.logo) {
    const img = document.createElement('img')
    img.src = service.logo
    img.alt = service.name
    logoDiv.appendChild(img)
  } else {
    const span = document.createElement('span')
    span.className = 'tile-initials'
    span.textContent = getInitials(service.name)
    logoDiv.appendChild(span)
  }

  const nameSpan = document.createElement('span')
  nameSpan.className = 'tile-name'
  nameSpan.textContent = service.name

  a.appendChild(logoDiv)
  a.appendChild(nameSpan)
  return a
}

function updateClock(): void {
  const clock = document.getElementById('clock')
  if (clock) {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

function init(): void {
  applyI18n()

  const grid = document.getElementById('service-grid')
  if (grid) {
    for (const service of services) {
      grid.appendChild(createTile(service))
    }
  }

  updateClock()
  setInterval(updateClock, 10_000)

  void initWeather()
  void initCalendar()
  void initHome()
  initSystem()
  initSettings()
}

init()
