# wishkit-origin

A wishlist page you can make your own. Fork or clone this repo, edit two JSON
files in `data/`, and push: GitHub Pages builds and publishes your page.

Built with Svelte 5 and Vite.

## Make it yours

Everything a fork needs to change lives in `data/`. Keeping your edits there
means you can pull template updates later without merge conflicts.

### 1. Your wishlist: `data/wishlist.json`

```json
{
  "title": "Holiday Wishlist 2026",
  "author": "Your name",
  "items": [
    {
      "name": "Anker Prime Desktop Charger",
      "description": "200W GaN charger, 6 ports.",
      "link": "https://example.com/product",
      "photo": "https://example.com/photo.jpg",
      "price": "₱5,695",
      "tags": ["tech", "desk-setup"]
    }
  ]
}
```

Only `title`, `items` and each item's `name` are required. Tags show up on
each card and in a tag cloud that filters the list.

### 2. Your look: `data/theme.json`

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "text":       { "light": "#6b6375", "dark": "#9ca3af" },
    "heading":    { "light": "#08060d", "dark": "#f3f4f6" },
    "background": { "light": "#ffffff", "dark": "#16171d" },
    "surface":    { "light": "#ffffff", "dark": "#1c1d24" },
    "border":     { "light": "#e5e4e7", "dark": "#2e303a" },
    "muted":      { "light": "#f4f3ec", "dark": "#1f2028" },
    "accent":     { "light": "#b3261e", "dark": "#f2867d" }
  },
  "fonts": {
    "body": "system-ui, 'Segoe UI', Roboto, sans-serif",
    "mono": "ui-monospace, Consolas, monospace"
  },
  "radius": 12
}
```

| Key | Used for |
| --- | --- |
| `text` | Body text |
| `heading` | Headings |
| `background` | Page background |
| `surface` | Cards and controls |
| `border` | Dividers and outlines |
| `muted` | Image placeholder background |
| `accent` | Links, tags and highlights (its pale tints are derived for you) |
| `fonts.body`, `fonts.mono` | CSS font-family lists (optional) |
| `radius` | Card corner radius in px, 0–48 (optional) |

Every color needs a light and a dark value as a hex code. Visitors see the one
matching their OS, and can switch with the Auto / Light / Dark toggle in the
header.

The theme is applied at build time and checked first. The build stops and
lists every problem if a color is missing or isn't hex, or if `text`,
`heading` or `accent` is too hard to read on `background` or `surface`
(WCAG AA, 4.5:1). Editors that understand JSON Schema (VS Code does) also
autocomplete and flag mistakes as you type, using `data/theme.schema.json`.

### Edit in the browser (dev mode)

Prefer clicking to typing JSON? Run `npm install` and `npm run dev`, open the
page, and press the **Edit** button in the bottom-right corner. A side panel
lets you change the title, author and items (add, remove, reorder) and every
theme color, font and the corner radius, with the page updating as you type.
Contrast problems are listed in the panel, and Save stays disabled until they
are fixed.

**Save** (or Ctrl/Cmd+S) writes `data/wishlist.json` and `data/theme.json`;
**Discard** reverts to the last save. Then commit and push those files to
publish. The editor and its save endpoint only exist in `npm run dev`: they
are never part of the built site.

### 3. Publish

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site
and deploys it to GitHub Pages. In your fork, enable Pages once under
**Settings → Pages → Source: GitHub Actions**.

## Develop

```bash
npm install
npm run dev       # dev server; saving data/theme.json reloads the page
npm run build     # production build → dist/
npm run preview   # serve the production build
```

How theming works under the hood: `plugins/theme.ts` is a Vite plugin that
reads `data/theme.json`, validates it, and inlines CSS custom properties
(`--text`, `--bg`, `--accent`, …) into `index.html`. Components only read
those tokens, so they never need editing for a new look. Each color is a
`light-dark()` pair, resolved by `color-scheme`, which the toggle sets via
`<html data-theme>`.

## PR videos (Playwright)

```bash
npm run record          # films every spec in e2e/ → recordings/*.mp4
npm run test:e2e        # same specs, no video unless a test fails
SLOWMO=800 npm run record   # slower playback (default 400ms per action)
npm run record -- -g walkthrough   # record only matching tests
```

Specs run against the production build (`vite build` + `vite preview` on :4173).
Videos convert to mp4 when `ffmpeg` is installed, otherwise stay `.webm`; both play
inline on GitHub — drag the file from `recordings/` into the PR description.
To record a new flow, add a spec under `e2e/`.
