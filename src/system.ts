export function initSystem(): void {
  const tempEl = document.getElementById('sys-temp')
  const ramEl = document.getElementById('sys-ram')
  if (!tempEl || !ramEl) return

  async function update() {
    try {
      const res = await fetch('/api/stats')
      if (!res.ok) return
      const d = await res.json()
      if (d.cpu_temp != null) tempEl.textContent = `${d.cpu_temp}°C`
      if (d.mem) {
        ramEl.textContent = `${d.mem.used_mb} / ${d.mem.total_mb} MB`
        ramEl.style.setProperty('--ram-pct', `${d.mem.percent}%`)
      }
    } catch { /* silently ignore */ }
  }

  update()
  setInterval(update, 10_000)
}
