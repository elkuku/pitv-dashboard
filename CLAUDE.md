# CLAUDE.md

This file provides guidance to Claude Code when working in `pitv-dashboard/`.

## Project

**PiTV** — a TV-optimized kiosk dashboard for a Raspberry Pi 5 connected to a 4K LG TV. Shows streaming service shortcuts, weather forecast, calendar events, and live Pi system stats.

## Stack

- **HTML** — static layout in `index.html`
- **TypeScript** — all logic in `src/` (no framework)
- **CSS** — all styles in `src/styles.css` (no scoped/component CSS)
- **Vite** — build tool (handles TS natively, no framework plugin needed)
- **Python** — `server/stats.py` runs as a local HTTP server on port 3001

## Source files

| File | Purpose |
|------|---------|
| `src/main.ts` | Entry point — clock, service tiles, wires up all modules |
| `src/weather.ts` | Open-Meteo forecast fetch + render (refreshes every 30 min) |
| `src/calendar.ts` | ICS fetch + parse + render (refreshes every 15 min) |
| `src/system.ts` | Pi CPU temp + RAM poll from `/api/stats` (refreshes every 10s) |
| `src/settings.ts` | Settings modal — city search + calendar URL |
| `src/config.ts` | `localStorage`-backed location config (fallback: Mannheim) |
| `src/geocoding.ts` | Open-Meteo geocoding API for city search |
| `server/stats.py` | Python HTTP server: `/api/stats` and `/api/calendar?url=` |

## Commands

Run from inside `pitv-dashboard/`:

```
npm run dev       # Dev server (Vite)
npm run build     # Production build → dist/
npm run check     # TypeScript type check (tsc --noEmit)
npm run preview   # Preview production build locally
```

## Deployment

The pre-commit hook in `~/.claude/settings.json` handles build + deploy + browser restart automatically on every `git commit`. Manual deploy:

```
npm run build
cp -r dist/. /var/www/pitv/
```

Nginx config: `pitv-nginx.conf` (symlinked to `/etc/nginx/sites-available/pitv`).
`index.html` is served with `Cache-Control: no-store` to prevent stale cache issues.

## Local API server

`server/stats.py` runs as a systemd user service (`pitv-stats.service`) on `127.0.0.1:3001`.
Nginx proxies `/api/` to it. Two endpoints:

- `GET /api/stats` — returns `{ cpu_temp, cpu_percent, mem: { used_mb, total_mb, percent } }`
- `GET /api/calendar?url=<encoded>` — proxies an ICS URL (avoids CORS)

Service commands:
```
systemctl --user status pitv-stats
systemctl --user restart pitv-stats
journalctl --user -u pitv-stats -f
```

## Configuration (user-facing)

All config is stored in `localStorage` and set via the settings modal (press `S` or the gear icon):

- **Location** — city search via Open-Meteo geocoding, stored in `pitv-location`
- **Calendar** — Google Calendar ICS URL stored in `pitv-calendar-url`

## Display

The TV runs at 3840×2160 (4K). Chromium is launched with `--force-device-scale-factor=2` so the CSS viewport is 1920×1080. Autostart: `~/.config/autostart/chromium.desktop`.

## Repository

https://github.com/elkuku/pitv-dashboard

## Conventions

- Do not hardcode colors — use CSS custom properties: `--bg`, `--surface`, `--surface-hover`, `--border`, `--text`, `--text-muted`, `--accent`, `--focus-ring`.
- All styles live in `src/styles.css` — no inline styles except `--brand` per-tile CSS variable.
- UI is designed for TV navigation: `overflow: hidden` on body, `user-select: none`, visible focus rings (3px solid white). Preserve these when adding interactive elements.
