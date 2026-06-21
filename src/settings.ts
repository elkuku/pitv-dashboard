import { searchCity, type GeoResult } from './geocoding.js'
import { saveLocation } from './config.js'
import { saveCalendarUrl, loadCalendarUrl, initCalendar } from './calendar.js'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function overlay(): HTMLElement | null { return document.getElementById('settings-overlay') }
function input(): HTMLInputElement | null { return document.getElementById('settings-input') as HTMLInputElement | null }
function resultsList(): HTMLElement | null { return document.getElementById('settings-results') }
function calInput(): HTMLInputElement | null { return document.getElementById('cal-url-input') as HTMLInputElement | null }

function open(): void {
  overlay()?.removeAttribute('hidden')
  const ci = calInput()
  if (ci) ci.value = loadCalendarUrl()
  input()?.focus()
}

function close(): void {
  overlay()?.setAttribute('hidden', '')
  clearResults()
  const inp = input()
  if (inp) inp.value = ''
}

function clearResults(): void {
  const list = resultsList()
  if (list) list.innerHTML = ''
}

function setMessage(msg: string, isError = false): void {
  const list = resultsList()
  if (!list) return
  list.innerHTML = ''
  const li = document.createElement('li')
  li.className = isError ? 'settings-result-message settings-result-error' : 'settings-result-message'
  li.textContent = msg
  list.appendChild(li)
}

function renderResults(results: GeoResult[]): void {
  const list = resultsList()
  if (!list) return
  list.innerHTML = ''

  if (results.length === 0) { setMessage('No cities found', true); return }

  for (const r of results) {
    const li = document.createElement('li')
    li.className = 'settings-result'
    li.tabIndex = 0

    const nameEl = document.createElement('span')
    nameEl.className = 'settings-result-name'
    nameEl.textContent = r.name

    const metaEl = document.createElement('span')
    metaEl.className = 'settings-result-meta'
    metaEl.textContent = [r.admin1, r.country].filter(Boolean).join(', ')

    li.append(nameEl, metaEl)

    const select = (): void => {
      saveLocation({ name: r.name, latitude: r.latitude, longitude: r.longitude })
      window.location.reload()
    }
    li.addEventListener('click', select)
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select() }
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowDown') (li.nextElementSibling as HTMLElement | null)?.focus()
      if (e.key === 'ArrowUp') {
        const prev = li.previousElementSibling as HTMLElement | null
        prev ? prev.focus() : input()?.focus()
      }
    })
    list.appendChild(li)
  }
}

async function doSearch(query: string): Promise<void> {
  const q = query.trim()
  if (q.length < 2) { clearResults(); return }
  setMessage('Searching…')
  try {
    const results = await searchCity(q)
    renderResults(results)
  } catch {
    setMessage('Search failed — check your connection', true)
  }
}

export function initSettings(): void {
  document.getElementById('settings-btn')?.addEventListener('click', open)
  document.getElementById('settings-close')?.addEventListener('click', close)

  overlay()?.addEventListener('click', (e) => { if (e.target === overlay()) close() })

  const inp = input()
  inp?.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void doSearch(inp.value), 400)
  })
  inp?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'Enter') {
      if (debounceTimer) clearTimeout(debounceTimer)
      void doSearch(inp.value)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      ;(resultsList()?.querySelector<HTMLElement>('.settings-result'))?.focus()
    }
  })

  // Calendar URL save
  document.getElementById('cal-url-save')?.addEventListener('click', () => {
    const url = calInput()?.value.trim() ?? ''
    saveCalendarUrl(url)
    void initCalendar()
    close()
  })

  document.addEventListener('keydown', (e) => {
    const hidden = overlay()?.hasAttribute('hidden')
    if ((e.key === 's' || e.key === 'S') && hidden && !(document.activeElement instanceof HTMLInputElement)) open()
    if (e.key === 'Escape' && !hidden) close()
  })
}
