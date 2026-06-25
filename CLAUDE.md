# CLAUDE.md

This file provides guidance to Claude Code when working in `pitv-dashboard/`.

## Project

**KuKu's Home** (formerly PiTV) — a TV-optimized kiosk dashboard for a Raspberry Pi 5 connected to a 4K LG TV. Shows streaming service shortcuts, weather forecast, Google Calendar events, Home Assistant device controls, and live Pi system stats.

## Stack

- **HTML** — static layout in `index.html`
- **TypeScript** — all logic in `src/` (no framework)
- **CSS** — all styles in `src/styles.css` (no scoped/component CSS)
- **esbuild** — build tool (`scripts/build.js`); bundles TS + extracts CSS to `dist/assets/`
- **Python** — `server/stats.py` runs as a local HTTP server on port 3001

## Source files

| File | Purpose |
|------|---------|
| `src/main.ts` | Entry point — clock, service tiles, wires up all modules |
| `src/weather.ts` | Open-Meteo forecast fetch + render; moon phase calculation; tide display (refreshes every 30 min) |
| `src/calendar.ts` | ICS fetch + parse + render; full month grid with ‹ › navigation + upcoming list (refreshes every 15 min) |
| `src/home.ts` | Home Assistant device toggle cards (polls `/api/ha/devices` every 30s) |
| `src/system.ts` | Pi CPU temp + CPU% + RAM poll from `/api/stats` (refreshes every 10s) |
| `src/settings.ts` | Settings modal — dashboard title, language, city search, calendar URL |
| `src/config.ts` | `localStorage`-backed config: location (`pitv-location`), title (`pitv-title`) |
| `src/i18n.ts` | Translations (EN/DE/ES), `t()`, `locale()`, `wmoLabel()`, `applyI18n()` |
| `src/geocoding.ts` | Open-Meteo geocoding API for city search |
| `server/stats.py` | Python HTTP server on port 3001: stats, calendar proxy, HA proxy |
| `server/ha-config.json` | HA credentials + device list + optional Stormglass key — **gitignored, never commit** |

## Commands

Run from inside `pitv-dashboard/`:

```
npm run dev       # Dev server (esbuild watch + serve, port 5173, no HMR)
npm run build     # Production build → dist/ (minified)
npm run check     # TypeScript type check (tsc --noEmit)
npm run preview   # Serve dist/ on port 4173
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
Nginx proxies `/api/` to it. Endpoints:

- `GET /api/stats` — `{ cpu_temp, cpu_percent, mem: { used_mb, total_mb, percent } }`
- `GET /api/calendar?url=<encoded>` — proxies an ICS URL (avoids CORS)
- `GET /api/ha/devices` — returns HA device list with live state (reads `ha-config.json`)
- `POST /api/ha/toggle` — toggles a switch: `{ entity_id }` → `{ entity_id, state }`
- `GET /api/tides?lat=X&lng=Y` — proxies Stormglass tide extremes for today; cached per day (1 req/day); returns 404 if `stormglass_key` is empty

Service commands:
```
systemctl --user status pitv-stats
systemctl --user restart pitv-stats   # required after editing ha-config.json
journalctl --user -u pitv-stats -f
```

## Home Assistant integration

HA credentials and device list live in `server/ha-config.json` (gitignored):

```json
{
  "url": "http://192.168.178.25:8123",
  "token": "<long-lived access token>",
  "devices": [
    { "entity_id": "switch.wiz_socket_a0fac7", "name": "TV", "icon": "📺" },
    { "entity_id": "switch.kitchen_kitchen_1", "name": "Kitchen", "icon": "🍳" }
  ]
}
```

To add a device: append to `devices` and run `systemctl --user restart pitv-stats`. The `domain` (e.g. `switch`, `light`) is derived from the entity ID prefix and used to call the correct HA service.

Optional `stormglass_key` field enables tide data (free at stormglass.io, 10 req/day; stats server caches per day):

```json
"stormglass_key": "<key from stormglass.io>"
```

## Internationalisation

`src/i18n.ts` supports **English, German, Spanish**. Selected language is stored in `localStorage` under `pitv-lang`; defaults to browser language (falls back to `en`).

- `t(key)` — translated UI string
- `wmoLabel(code)` — translated WMO weather condition
- `locale()` — locale string for `toLocaleString` calls (`'en'`, `'de'`, `'es'`)
- `applyI18n()` — fills all `[data-i18n]` and `[data-i18n-ph]` elements in the DOM

To add a new string: add the key to all three language objects in `ui`, then use `t('yourKey')` and (if needed) add `data-i18n="yourKey"` to the HTML element.

## Weather section details

**Stats grid** (2-column, in order): Feels like, Humidity, Wind, UV index, Sunrise, Sunset, Moon phase (spans full width as 7th item).

**Moon phase** — pure astronomical calculation in `weather.ts`, no API. Uses a known new moon epoch (2000-01-06 18:14 UTC) and the 29.530588-day synodic period to compute age → emoji + translated phase name.

**Tides** — fetched from `GET /api/tides?lat=X&lng=Y`, which proxies Stormglass. Appears below the 5-day forecast only when data is returned (i.e. `stormglass_key` is set). High tides shown with blue border + ▲, low tides with ▼.

## Calendar navigation

The calendar renders a full month grid with prev/next buttons in the header:

- **‹ ›** step through months — re-renders from `_cachedEvents` without refetching
- **Today** button (shown in `--accent` colour when off the current month) jumps back to today
- Events list shows events from today onwards when on the current month; all events when on any other month
- Past-day dimming is always relative to the real today, not the displayed month
- `_monthOffset` and `_cachedEvents` are module-level in `calendar.ts`; `initCalendar()` resets offset to 0 and refetches

## Configuration (user-facing)

All config is stored in `localStorage` and set via the settings modal (press `S` or the gear icon):

| Setting | localStorage key | Default |
|---------|-----------------|---------|
| Dashboard title | `pitv-title` | `KuKu's Home` |
| Language | `pitv-lang` | browser language / `en` |
| Location | `pitv-location` | Mannheim |
| Calendar ICS URL | `pitv-calendar-url` | _(empty)_ |

## Display

The TV runs at 3840×2160 (4K). Chromium is launched with `--force-device-scale-factor=2` so the CSS viewport is 1920×1080. Autostart: `~/.config/autostart/chromium.desktop`.

## Repository

https://github.com/elkuku/pitv-dashboard

## Conventions

- Do not hardcode colors — use CSS custom properties: `--bg`, `--surface`, `--surface-hover`, `--border`, `--text`, `--text-muted`, `--accent`, `--focus-ring`.
- All styles live in `src/styles.css` — no inline styles except `--brand` per-tile CSS variable.
- UI is designed for TV navigation: `overflow: hidden` on body, `user-select: none`, visible focus rings (3px solid white). Preserve these when adding interactive elements.
- All user-visible strings must go through `t()` — never hardcode UI text in TS files.
