// Build-time theming: reads data/theme.json, validates it (shape + WCAG AA
// contrast), and inlines the resulting CSS custom properties into index.html.
// Components only ever read the tokens (--text, --accent, …), so a fork changes
// its look by editing data/theme.json alone. Schema: data/theme.schema.json.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

type Scheme = 'light' | 'dark'
type Pair = Record<Scheme, string>

const COLOR_KEYS = ['text', 'heading', 'background', 'surface', 'border', 'muted', 'accent'] as const
type ColorKey = (typeof COLOR_KEYS)[number]

export interface Theme {
  colors: Record<ColorKey, Pair>
  fonts: { body: string; mono: string }
  radius: number
}

const DEFAULT_FONTS = {
  body: "system-ui, 'Segoe UI', Roboto, sans-serif",
  mono: 'ui-monospace, Consolas, monospace',
}
const DEFAULT_RADIUS = 12
const MIN_CONTRAST = 4.5
// Foregrounds that must stay readable on background and surface.
const READABLE: ColorKey[] = ['text', 'heading', 'accent']

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validates raw JSON into a Theme, collecting every problem before failing. */
export function parseTheme(raw: unknown): Theme {
  const errors: string[] = []
  if (!isObject(raw)) throw new Error('theme.json: expected a JSON object')

  const colors = {} as Record<ColorKey, Pair>
  if (!isObject(raw.colors)) errors.push('"colors" is required and must be an object')
  else {
    for (const key of COLOR_KEYS) {
      const pair = raw.colors[key]
      if (!isObject(pair)) {
        errors.push(`colors.${key} must be { "light": "#hex", "dark": "#hex" }`)
        continue
      }
      for (const scheme of ['light', 'dark'] as const) {
        const value = pair[scheme]
        if (typeof value !== 'string' || !HEX.test(value)) {
          errors.push(`colors.${key}.${scheme} must be a hex color like "#b3261e" (got ${JSON.stringify(value)})`)
        }
      }
      colors[key] = pair as Pair
    }
    for (const key of Object.keys(raw.colors)) {
      if (!(COLOR_KEYS as readonly string[]).includes(key)) errors.push(`colors.${key} is not a known color`)
    }
  }

  const fonts = { ...DEFAULT_FONTS }
  if (raw.fonts !== undefined) {
    if (!isObject(raw.fonts)) errors.push('"fonts" must be an object')
    else
      for (const key of ['body', 'mono'] as const) {
        const value = raw.fonts[key]
        if (value === undefined) continue
        // Font lists land inside a <style> block: refuse anything that could close it.
        if (typeof value !== 'string' || !value.trim() || /[<>{};]/.test(value)) {
          errors.push(`fonts.${key} must be a CSS font-family list`)
        } else fonts[key] = value
      }
  }

  let radius = DEFAULT_RADIUS
  if (raw.radius !== undefined) {
    if (typeof raw.radius !== 'number' || raw.radius < 0 || raw.radius > 48) {
      errors.push('"radius" must be a number of px between 0 and 48')
    } else radius = raw.radius
  }

  if (!errors.length) {
    for (const scheme of ['light', 'dark'] as const) {
      for (const bg of ['background', 'surface'] as const) {
        for (const fg of READABLE) {
          const ratio = contrast(colors[fg][scheme], colors[bg][scheme])
          if (ratio < MIN_CONTRAST) {
            errors.push(
              `${scheme}: colors.${fg} (${colors[fg][scheme]}) on colors.${bg} (${colors[bg][scheme]}) ` +
                `has contrast ${ratio.toFixed(2)}:1, needs at least ${MIN_CONTRAST}:1`,
            )
          }
        }
      }
    }
  }

  if (errors.length) throw new Error(`Invalid data/theme.json:\n  - ${errors.join('\n  - ')}`)
  return { colors, fonts, radius }
}

/** The :root token block. Colors use light-dark(), so `color-scheme` picks the set. */
export function themeCss({ colors: c, fonts, radius }: Theme): string {
  const ld = ({ light, dark }: Pair) => `light-dark(${light}, ${dark})`
  const tint = ({ light, dark }: Pair, lightPct: number, darkPct: number) =>
    `light-dark(color-mix(in srgb, ${light} ${lightPct}%, transparent), color-mix(in srgb, ${dark} ${darkPct}%, transparent))`

  const tokens: Record<string, string> = {
    '--text': ld(c.text),
    '--text-h': ld(c.heading),
    '--bg': ld(c.background),
    '--surface': ld(c.surface),
    '--border': ld(c.border),
    '--code-bg': ld(c.muted),
    '--accent': ld(c.accent),
    '--accent-bg': tint(c.accent, 8, 12),
    '--accent-border': tint(c.accent, 40, 40),
    '--sans': fonts.body,
    '--mono': fonts.mono,
    '--radius': `${radius}px`,
  }
  const body = Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ')
  return `:root { ${body} }`
}

function luminance(hex: string): number {
  const h = hex.slice(1)
  const full = h.length === 3 ? [...h].map((ch) => ch + ch).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export default function themePlugin(file = 'data/theme.json'): Plugin {
  let path = file
  return {
    name: 'wishkit-theme',
    configResolved(config) {
      path = resolve(config.root, file)
    },
    // Fail fast: a bad theme stops `vite build` / `vite dev` with the reasons.
    buildStart() {
      this.addWatchFile(path)
      parseTheme(JSON.parse(readFileSync(path, 'utf8')))
    },
    transformIndexHtml() {
      const theme = parseTheme(JSON.parse(readFileSync(path, 'utf8')))
      return [{ tag: 'style', attrs: { id: 'theme' }, children: themeCss(theme), injectTo: 'head' }]
    },
    configureServer(server) {
      server.watcher.add(path)
      server.watcher.on('change', (changed) => {
        if (resolve(changed) === path) server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
