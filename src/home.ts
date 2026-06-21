interface HADevice {
  entity_id: string
  name: string
  icon: string
  state: 'on' | 'off' | 'unavailable'
}

async function fetchDevices(): Promise<HADevice[]> {
  const res = await fetch('/api/ha/devices')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function toggleDevice(entityId: string): Promise<HADevice> {
  const res = await fetch('/api/ha/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function renderDevice(dev: HADevice): HTMLElement {
  const card = document.createElement('button')
  card.className = `home-device${dev.state === 'on' ? ' on' : ''}`
  card.dataset.entityId = dev.entity_id
  card.disabled = dev.state === 'unavailable'

  const icon = document.createElement('span')
  icon.className = 'home-device-icon'
  icon.textContent = dev.icon

  const info = document.createElement('span')
  info.className = 'home-device-info'

  const name = document.createElement('span')
  name.className = 'home-device-name'
  name.textContent = dev.name

  const status = document.createElement('span')
  status.className = 'home-device-status'
  status.textContent = dev.state === 'unavailable' ? 'Unavailable' : dev.state === 'on' ? 'On' : 'Off'

  info.append(name, status)

  const toggle = document.createElement('span')
  toggle.className = `home-toggle${dev.state === 'on' ? ' on' : ''}`
  toggle.setAttribute('aria-hidden', 'true')

  card.append(icon, info, toggle)
  return card
}

export async function initHome(): Promise<void> {
  const container = document.getElementById('home-controls')
  if (!container) return

  async function load() {
    try {
      const devices = await fetchDevices()
      container.innerHTML = ''

      for (const dev of devices) {
        const card = renderDevice(dev)

        card.addEventListener('click', async () => {
          card.disabled = true
          try {
            const updated = await toggleDevice(dev.entity_id)
            dev.state = updated.state as HADevice['state']
            const fresh = renderDevice(dev)
            card.replaceWith(fresh)
            fresh.addEventListener('click', card.onclick as EventListener)
            // re-attach by reinitialising this device in place
            initHome()
          } catch {
            card.disabled = false
          }
        })

        container.appendChild(card)
      }
    } catch {
      container.innerHTML = '<span class="home-error">Home unavailable</span>'
    }
  }

  await load()
  // Refresh state every 30 s
  setTimeout(() => initHome(), 30_000)
}
