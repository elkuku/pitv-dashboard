const STORAGE_KEY = 'pitv-calendar-url'

export function loadCalendarUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ''
}

export function saveCalendarUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url)
}

interface CalEvent {
  summary: string
  start: Date
  end: Date
  allDay: boolean
}

function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, '')
}

function parseIcsDate(value: string, params: string): { date: Date; allDay: boolean } {
  const allDay = params.includes('VALUE=DATE') || value.length === 8
  const y = value.slice(0, 4)
  const mo = value.slice(4, 6)
  const d = value.slice(6, 8)
  if (allDay) {
    return { date: new Date(`${y}-${mo}-${d}T00:00:00`), allDay: true }
  }
  const h = value.slice(9, 11)
  const mi = value.slice(11, 13)
  const utc = value.endsWith('Z')
  const iso = `${y}-${mo}-${d}T${h}:${mi}:00${utc ? 'Z' : ''}`
  return { date: new Date(iso), allDay: false }
}

function parseICS(text: string): CalEvent[] {
  const events: CalEvent[] = []
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1)

  for (const block of blocks) {
    const content = block.substring(0, block.indexOf('END:VEVENT'))
    const get = (key: string) => {
      const m = content.match(new RegExp(`^(${key}[^:]*):(.*)$`, 'm'))
      return m ? { params: m[1], value: m[2].trim() } : null
    }

    const summaryMatch = get('SUMMARY')
    const startMatch = get('DTSTART')
    const endMatch = get('DTEND')

    if (!summaryMatch || !startMatch) continue

    const { date: start, allDay } = parseIcsDate(startMatch.value, startMatch.params)
    const end = endMatch ? parseIcsDate(endMatch.value, endMatch.params).date : start

    events.push({
      summary: summaryMatch.value.replace(/\\n/g, ' ').replace(/\\,/g, ','),
      start,
      end,
      allDay,
    })
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderEvents(events: CalEvent[]): HTMLElement {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const todayEvents = events.filter(e => isSameDay(e.start, today))
  const tomorrowEvents = events.filter(e => isSameDay(e.start, tomorrow))

  const root = document.createElement('div')
  root.className = 'cal-root'

  const renderGroup = (label: string, evts: CalEvent[]) => {
    const group = document.createElement('div')
    group.className = 'cal-group'

    const heading = document.createElement('span')
    heading.className = 'cal-group-label'
    heading.textContent = label
    group.appendChild(heading)

    if (evts.length === 0) {
      const empty = document.createElement('span')
      empty.className = 'cal-empty'
      empty.textContent = 'No events'
      group.appendChild(empty)
    } else {
      for (const evt of evts) {
        const item = document.createElement('div')
        item.className = 'cal-event'

        const time = document.createElement('span')
        time.className = 'cal-time'
        time.textContent = evt.allDay ? 'All day' : formatTime(evt.start)

        const title = document.createElement('span')
        title.className = 'cal-title'
        title.textContent = evt.summary

        item.append(time, title)
        group.appendChild(item)
      }
    }

    return group
  }

  root.appendChild(renderGroup('Today', todayEvents))
  root.appendChild(renderGroup('Tomorrow', tomorrowEvents))
  return root
}

export async function initCalendar(): Promise<void> {
  const container = document.getElementById('calendar')
  if (!container) return

  const url = loadCalendarUrl()
  if (!url) {
    container.innerHTML = '<span class="cal-empty">No calendar configured — open settings to add one.</span>'
    return
  }

  try {
    const res = await fetch(`/api/calendar?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const events = parseICS(text)
    container.innerHTML = ''
    container.appendChild(renderEvents(events))
  } catch {
    container.innerHTML = '<span class="cal-empty cal-error">Calendar unavailable</span>'
  }

  setTimeout(() => initCalendar(), 15 * 60 * 1000)
}
