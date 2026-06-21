import { t, locale } from './i18n.js'

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

let _cachedEvents: CalEvent[] = []
let _monthOffset = 0

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
  return d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
}

function renderView(events: CalEvent[], container: HTMLElement, offset: number): void {
  const today = new Date()
  const loc = locale()

  // Compute the month being displayed
  const displayDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const year = displayDate.getFullYear()
  const month = displayDate.getMonth()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  // Index events by day for this month
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

  // Navigation header
  const header = document.createElement('div')
  header.className = 'cal-grid-header'

  const prevBtn = document.createElement('button')
  prevBtn.className = 'cal-nav'
  prevBtn.textContent = '‹'
  prevBtn.setAttribute('aria-label', 'Previous month')
  prevBtn.addEventListener('click', () => {
    _monthOffset--
    renderView(_cachedEvents, container, _monthOffset)
  })

  const monthLabel = document.createElement('span')
  monthLabel.className = 'cal-month-label'
  monthLabel.textContent = displayDate.toLocaleDateString(loc, { month: 'long', year: 'numeric' })

  const nextBtn = document.createElement('button')
  nextBtn.className = 'cal-nav'
  nextBtn.textContent = '›'
  nextBtn.setAttribute('aria-label', 'Next month')
  nextBtn.addEventListener('click', () => {
    _monthOffset++
    renderView(_cachedEvents, container, _monthOffset)
  })

  // "Today" jump button — only show when not on current month
  if (!isCurrentMonth) {
    const todayBtn = document.createElement('button')
    todayBtn.className = 'cal-nav cal-nav-today'
    todayBtn.textContent = t('today')
    todayBtn.addEventListener('click', () => {
      _monthOffset = 0
      renderView(_cachedEvents, container, 0)
    })
    header.append(prevBtn, monthLabel, todayBtn, nextBtn)
  } else {
    header.append(prevBtn, monthLabel, nextBtn)
  }

  grid.appendChild(header)

  // Day-of-week names (locale-aware, Mon-based)
  const dayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, i + 1).toLocaleDateString(loc, { weekday: 'short' })
  )
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
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const offset2 = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let row = document.createElement('div')
  row.className = 'cal-grid-row'

  for (let i = 0; i < offset2; i++) {
    row.appendChild(Object.assign(document.createElement('span'), { className: 'cal-cell' }))
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const col = (offset2 + d - 1) % 7
    if (col === 0 && d > 1) {
      grid.appendChild(row)
      row = document.createElement('div')
      row.className = 'cal-grid-row'
    }

    const cell = document.createElement('span')
    cell.className = 'cal-cell'
    cell.textContent = String(d)

    const cellDate = new Date(year, month, d)
    if (isSameDay(cellDate, today)) cell.classList.add('cal-cell-today')
    else if (cellDate < today) cell.classList.add('cal-cell-past')
    if (eventDays.has(d)) cell.classList.add('cal-cell-event')

    row.appendChild(cell)
  }
  grid.appendChild(row)
  root.appendChild(grid)

  // ── Events list ──
  // Current month: from today onwards. Other months: all events in that month.
  const monthStart = new Date(year, month, isCurrentMonth ? today.getDate() : 1)
  const upcoming = events.filter(e =>
    e.start >= monthStart &&
    e.start.getFullYear() === year &&
    e.start.getMonth() === month
  )

  if (upcoming.length > 0) {
    const list = document.createElement('div')
    list.className = 'cal-events'

    for (const evt of upcoming) {
      const item = document.createElement('div')
      item.className = 'cal-event'

      const dateEl = document.createElement('span')
      dateEl.className = 'cal-event-date'
      dateEl.textContent = isSameDay(evt.start, today)
        ? t('today')
        : evt.start.toLocaleDateString(loc, { weekday: 'short', day: 'numeric' })

      const timeEl = document.createElement('span')
      timeEl.className = 'cal-time'
      timeEl.textContent = evt.allDay ? t('allDay') : formatTime(evt.start)

      const titleEl = document.createElement('span')
      titleEl.className = 'cal-title'
      titleEl.textContent = evt.summary

      item.append(dateEl, timeEl, titleEl)
      list.appendChild(item)
    }

    root.appendChild(list)
  }

  container.innerHTML = ''
  container.appendChild(root)
}

export async function initCalendar(): Promise<void> {
  const container = document.getElementById('calendar')
  if (!container) return

  _monthOffset = 0

  const url = loadCalendarUrl()
  if (!url) {
    container.innerHTML = ''
    const msg = document.createElement('span')
    msg.className = 'cal-empty'
    msg.textContent = t('calendarEmpty')
    container.appendChild(msg)
    return
  }

  try {
    const res = await fetch(`/api/calendar?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    _cachedEvents = parseICS(text)
    renderView(_cachedEvents, container, _monthOffset)
  } catch {
    container.innerHTML = ''
    const msg = document.createElement('span')
    msg.className = 'cal-empty cal-error'
    msg.textContent = t('calendarError')
    container.appendChild(msg)
  }

  setTimeout(() => initCalendar(), 15 * 60 * 1000)
}
