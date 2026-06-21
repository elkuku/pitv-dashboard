# CLAUDE.md

This file provides guidance to Claude Code when working in `pitv-dashboard/`.

## Project

**PiTV** — a TV-optimized streaming services dashboard built with Vue 3 + Vite.

## Commands

Run from inside `pitv-dashboard/`:

```
npm run dev       # Dev server (Vite)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

## Deployment

After building, copy `dist/` to the nginx web root:

```
npm run build
sudo cp -r dist/. /var/www/pitv/
```

Nginx config is at `pitv-dashboard/pitv-nginx.conf`. Claude has local read access to `/etc/nginx` and `/var/www/pitv`.

## Testing

No test framework is set up yet. Verify changes with `npm run build` (catches JS/Vue errors) and manual browser testing with `npm run dev`.

## Vue conventions

- Use Vue 3 Composition API with `<script setup>` — no Options API.
- Scope CSS to components with `<style scoped>`.
- Do not hardcode colors — use the CSS custom properties defined in `src/styles.css`:
  `--bg`, `--surface`, `--surface-hover`, `--border`, `--text`, `--text-muted`, `--accent`, `--focus-ring`.

## UI considerations

The UI is designed for TV/remote navigation: `overflow: hidden` on body, `user-select: none`, and visible focus states (3px solid white ring) for keyboard navigation. Preserve these when adding new interactive elements.
