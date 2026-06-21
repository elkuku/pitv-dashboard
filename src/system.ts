export function initSystem(): void {
  const tempEl = document.getElementById('sys-temp')
  const cpuEl = document.getElementById('sys-cpu')
  const ramEl = document.getElementById('sys-ram')
  if (!tempEl || !cpuEl || !ramEl) return

  async function update() {
    try {
      const res = await fetch('/api/stats')
      if (!res.ok) return
      const d = await res.json()
      if (d.cpu_temp != null) tempEl.textContent = `${d.cpu_temp}°C`
      if (d.cpu_percent != null) cpuEl.textContent = `${d.cpu_percent}%`
      if (d.mem) ramEl.textContent = `${d.mem.used_mb} / ${d.mem.total_mb} MB`
    } catch { /* silently ignore */ }
  }

  update()
  setInterval(update, 10_000)
}
