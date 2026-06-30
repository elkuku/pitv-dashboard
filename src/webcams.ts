export function initWebcams(): void {
  const overlay = document.getElementById('webcam-overlay')!
  const fullImg = document.getElementById('webcam-full') as HTMLImageElement

  document.querySelectorAll<HTMLButtonElement>('.webcam-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      const base = btn.dataset.full!
      fullImg.src = `${base}?t=${Date.now()}`
      overlay.removeAttribute('hidden')
    })
  })

  const close = () => {
    overlay.setAttribute('hidden', '')
    fullImg.src = ''
  }

  overlay.addEventListener('click', close)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hasAttribute('hidden')) close()
  })

  // Refresh thumbnails every 5 minutes
  setInterval(() => {
    document.querySelectorAll<HTMLImageElement>('.webcam-thumb img').forEach(img => {
      img.src = `${img.src.split('?')[0]}?t=${Date.now()}`
    })
  }, 5 * 60 * 1000)
}