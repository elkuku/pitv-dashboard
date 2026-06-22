import { getLang, setLang, type Lang } from './i18n.js'

const LANGS: Lang[] = ['en', 'de', 'es']

const SHORTCUTS = [
  { key: '1 – 6',  desc: 'Open streaming service' },
  { key: 'Q / W',  desc: 'Toggle switch 1 / 2' },
  { key: '← →',   desc: 'Calendar prev / next month' },
  { key: 'T',      desc: 'Jump to today' },
  { key: 'L',      desc: 'Cycle language (EN → DE → ES)' },
  { key: 'S',      desc: 'Settings' },
  { key: '?',      desc: 'Show this help' },
  { key: 'Esc',    desc: 'Close popup' },
]

function createPopup(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'shortcuts-overlay'
  overlay.id = 'shortcuts-overlay'
  overlay.hidden = true
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')

  const modal = document.createElement('div')
  modal.className = 'shortcuts-modal'

  const title = document.createElement('h2')
  title.className = 'shortcuts-title'
  title.textContent = 'Keyboard Shortcuts'
  modal.appendChild(title)

  const table = document.createElement('table')
  table.className = 'shortcuts-table'
  for (const { key, desc } of SHORTCUTS) {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td class="shortcut-key"><kbd>${key}</kbd></td><td class="shortcut-desc">${desc}</td>`
    table.appendChild(tr)
  }
  modal.appendChild(table)

  overlay.appendChild(modal)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.hidden = true })
  return overlay
}

export function initShortcuts(): void {
  const overlay = createPopup()
  document.body.appendChild(overlay)

  document.getElementById('shortcuts-btn')?.addEventListener('click', () => { overlay.hidden = false })

  document.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    const settingsOpen = !document.getElementById('settings-overlay')?.hidden
    const helpOpen = !overlay.hidden

    if (e.key === 'Escape') {
      if (helpOpen)    { overlay.hidden = true; return }
      if (settingsOpen) { (document.getElementById('settings-overlay') as HTMLElement).hidden = true; return }
      return
    }

    if (settingsOpen || helpOpen) return

    if (e.key === '?') {
      overlay.hidden = false
      return
    }

    // 1–5: open streaming tiles
    if (e.key >= '1' && e.key <= '6') {
      const tiles = document.querySelectorAll<HTMLAnchorElement>('.tile')
      tiles[parseInt(e.key) - 1]?.click()
      return
    }

    // ← →: calendar month navigation
    if (e.key === 'ArrowLeft') {
      document.querySelectorAll<HTMLButtonElement>('.cal-nav:not(.cal-nav-today)')[0]?.click()
      return
    }
    if (e.key === 'ArrowRight') {
      document.querySelectorAll<HTMLButtonElement>('.cal-nav:not(.cal-nav-today)')[1]?.click()
      return
    }

    // T: calendar today
    if (e.key === 't' || e.key === 'T') {
      document.querySelector<HTMLButtonElement>('.cal-nav-today')?.click()
      return
    }

    // L: cycle language
    if (e.key === 'l' || e.key === 'L') {
      const current = getLang()
      const next = LANGS[(LANGS.indexOf(current) + 1) % LANGS.length]
      setLang(next)
      return
    }

    // Q / W: toggle home device 1 / 2
    if (e.key === 'q' || e.key === 'Q') {
      document.querySelectorAll<HTMLButtonElement>('.home-device')[0]?.click()
      return
    }
    if (e.key === 'w' || e.key === 'W') {
      document.querySelectorAll<HTMLButtonElement>('.home-device')[1]?.click()
      return
    }
  })
}
