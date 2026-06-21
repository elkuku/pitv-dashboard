import { getLang } from './i18n.js'

interface NewsItem {
  title: string
  source: string
}

function renderTicker(items: NewsItem[]): void {
  const track = document.getElementById('news-ticker')
  if (!track) return

  const sep = '<span class="ticker-sep">◆</span>'
  const html = items
    .map(i => `<span class="ticker-source">${i.source}</span><span class="ticker-item">${i.title}</span>`)
    .join(sep)

  const inner = document.createElement('div')
  inner.className = 'ticker-inner'
  // Duplicate content for seamless loop
  inner.innerHTML = html + sep + html + sep

  track.innerHTML = ''
  track.appendChild(inner)

  // Set speed to ~80px/s based on actual rendered width
  requestAnimationFrame(() => {
    const fullWidth = inner.scrollWidth
    const onePass = fullWidth / 2
    const duration = onePass / 80
    inner.style.animationDuration = `${duration}s`
  })
}

export async function initNews(): Promise<void> {
  try {
    const res = await fetch(`/api/news?lang=${getLang()}`)
    if (res.ok) {
      const items: NewsItem[] = await res.json()
      if (items.length > 0) renderTicker(items)
    }
  } catch {
    // silently ignore — ticker is non-critical
  }

  setTimeout(() => initNews(), 30 * 60 * 1000)
}
