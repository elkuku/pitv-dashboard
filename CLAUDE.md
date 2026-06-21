# CLAUDE.md

This file provides guidance to Claude Code when working in `pitv-dashboard/`.

## Project

**PiTV** — a TV-optimized streaming services dashboard built with plain HTML, CSS, and TypeScript, bundled by Vite.

## Stack

- **HTML** — static layout in `index.html`
- **TypeScript** — `src/main.ts` handles clock updates and dynamic tile rendering
- **CSS** — all styles in `src/styles.css` (no scoped/component CSS)
- **Vite** — build tool (handles TS natively, no framework plugin needed)

## Commands

Run from inside `pitv-dashboard/`:

```
npm run dev       # Dev server (Vite)
npm run build     # Production build → dist/
npm run check     # TypeScript type check (tsc --noEmit)
npm run preview   # Preview production build locally
```

## Deployment

After building, copy `dist/` to the nginx web root:

```
npm run build
sudo cp -r dist/. /var/www/pitv/
```

Nginx config is at `pitv-dashboard/pitv-nginx.conf`. Claude has local read access to `/etc/nginx` and `/var/www/pitv`.

## Repository

https://github.com/elkuku/pitv-dashboard

## Testing

No test framework is set up yet. Verify changes with `npm run check` (type errors) and `npm run build` (bundle errors), then manual browser testing with `npm run dev`.

## Configuration

Location for the weather section is set in `src/config.ts`:

```typescript
location: {
  name: 'Berlin',      // display name shown in the section header
  latitude: 52.52,     // decimal degrees
  longitude: 13.41,
}
```

Weather data is fetched from Open-Meteo (free, no API key). It refreshes every 30 minutes.

## Conventions

- Do not hardcode colors — use the CSS custom properties defined in `src/styles.css`:
  `--bg`, `--surface`, `--surface-hover`, `--border`, `--text`, `--text-muted`, `--accent`, `--focus-ring`.
- All styles live in `src/styles.css` — no inline styles except `--brand` per-tile CSS variable.

## UI considerations

The UI is designed for TV/remote navigation: `overflow: hidden` on body, `user-select: none`, and visible focus states (3px solid white ring) for keyboard navigation. Preserve these when adding new interactive elements.
