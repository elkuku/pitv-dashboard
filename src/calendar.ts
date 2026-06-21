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
  const y = value.slice(0, 4), mo = value.slice(4, 6), d = value.slice(6, 8)
  if (allDay) return { date: new Date(`${y}-${mo}-${d}T00:00:00`), allDay: true }
  const h = value.slice(9, 11), mi = value.slice(11, 13)
  const utc = value.endsWith('Z')
  return { date: new Date(`${y}-${mo}-${d}T${h}:${mi}:00${utc ? 'Z' : ''}`), allDay: false }
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
      start, end, allDay,
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

function renderCalendar(events: CalEvent[]): HTMLElement {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  // Index events by day-of-month for this month
  const eventDays = new Map<number, CalEvent[]>()
  for (const evt of events) {
    if (evt.start.getFullYear() === year && evt.start.getMonth() === month) {
      const d = evt.start.getDate()
      if (!eventDays.has(d)) eventDays.set(d, [])
      eventDays.get(d)!.push(evt)
    }
  }

  const root = document.createElement('div')
  root.className = 'cal-root'

  // ── Month grid ──
  const grid = document.createElement('div')
  grid.className = 'cal-grid'

  // Month header
  const monthName = new Date(year, month, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })
  const header = document.createElement('div')
  header.className = 'cal-grid-header'
  header.textContent = monthName
  grid.appendChild(header)

  // Day-of-week names (Mon–Sun)
  const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const nameRow = document.createElement('div')
  nameRow.className = 'cal-grid-row'
  for (const n of dayNames) {
    const cell = document.createElement('span')
    cell.className = 'cal-cell cal-cell-name'
    cell.textContent = n
    nameRow.appendChild(cell)
  }
  grid.appendChild(nameRow)

  // Day cells
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // convert to Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let row = document.createElement('div')
  row.className = 'cal-grid-row'

  for (let i = 0; i < offset; i++) {
    const empty = document.createElement('span')
    empty.className = 'cal-cell'
    row.appendChild(empty)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const col = (offset + d - 1) % 7
    if (col === 0 && d > 1) {
      grid.appendChild(row)
      row = document.createElement('div')
      row.className = 'cal-grid-row'
    }

    const cell = document.createElement('span')
    cell.className = 'cal-cell'
    cell.textContent = String(d)

    if (d === today.getDate()) cell.classList.add('cal-cell-today')
    else if (d < today.getDate()) cell.classList.add('cal-cell-past')
    if (eventDays.has(d)) cell.classList.add('cal-cell-event')

    row.appendChild(cell)
  }
  grid.appendChild(row)
  root.appendChild(grid)

  // ── Upcoming events ──
  const upcoming = events.filter(e => e.start >= new Date(year, month, today.getDate()))
    .filter(e => e.start.getFullYear() === year && e.start.getMonth() === month)

  if (upcoming.length > 0) {
    const list = document.createElement('div')
    list.className = 'cal-events'

    for (const evt of upcoming) {
      const item = document.createElement('div')
      item.className = 'cal-event'

      const dateEl = document.createElement('span')
      dateEl.className = 'cal-event-date'
      const isToday = isSameDay(evt.start, today)
      dateEl.textContent = isToday
        ? 'Today'
        : evt.start.toLocaleDateString([], { weekday: 'short', day: 'numeric' })

      const timeEl = document.createElement('span')
      timeEl.className = 'cal-time'
      timeEl.textContent = evt.allDay ? 'All day' : formatTime(evt.start)

      const titleEl = document.createElement('span')
      titleEl.className = 'cal-title'
      titleEl.textContent = evt.summary

      item.append(dateEl, timeEl, titleEl)
      list.appendChild(item)
    }

    root.appendChild(list)
  }

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
    container.appendChild(renderCalendar(events))
  } catch {
    container.innerHTML = '<span class="cal-empty cal-error">Calendar unavailable</span>'
  }

  setTimeout(() => initCalendar(), 15 * 60 * 1000)
}
