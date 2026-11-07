// Theme shape, validation (shape + WCAG AA contrast) and the CSS token block.
// Browser-safe (no node imports): shared by the build plugin (plugins/theme.ts)
// and the dev-only editor overlay (src/lib/editor/), which previews drafts live.
// Schema: data/theme.schema.json.

type Scheme = 'light' | 'dark'
export type Pair = Record<Scheme, string>

export const COLOR_KEYS = ['text', 'heading', 'background', 'surface', 'border', 'muted', 'accent'] as const
export type ColorKey = (typeof COLOR_KEYS)[number]

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

/** Validates raw JSON into a Theme, collecting every problem instead of throwing. */
export function validateTheme(raw: unknown): { theme: Theme; errors: string[] } {
  const errors: string[] = isObject(raw) ? [] : ['expected a JSON object']
  const input: Record<string, unknown> = isObject(raw) ? raw : {}

  const colors = {} as Record<ColorKey, Pair>
  if (!isObject(input.colors)) errors.push('"colors" is required and must be an object')
  else {
    for (const key of COLOR_KEYS) {
      const pair = input.colors[key]
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
    for (const key of Object.keys(input.colors)) {
      if (!(COLOR_KEYS as readonly string[]).includes(key)) errors.push(`colors.${key} is not a known color`)
    }
  }

  const fonts = { ...DEFAULT_FONTS }
  if (input.fonts !== undefined) {
    if (!isObject(input.fonts)) errors.push('"fonts" must be an object')
    else
      for (const key of ['body', 'mono'] as const) {
        const value = input.fonts[key]
        if (value === undefined) continue
        // Font lists land inside a <style> block: refuse anything that could close it.
        if (typeof value !== 'string' || !value.trim() || /[<>{};]/.test(value)) {
          errors.push(`fonts.${key} must be a CSS font-family list`)
        } else fonts[key] = value
      }
  }

  let radius = DEFAULT_RADIUS
  if (input.radius !== undefined) {
    if (typeof input.radius !== 'number' || input.radius < 0 || input.radius > 48) {
      errors.push('"radius" must be a number of px between 0 and 48')
    } else radius = input.radius
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

  return { theme: { colors, fonts, radius }, errors }
}

/** Validates raw JSON into a Theme, collecting every problem before failing. */
export function parseTheme(raw: unknown): Theme {
  if (!isObject(raw)) throw new Error('theme.json: expected a JSON object')
  const { theme, errors } = validateTheme(raw)
  if (errors.length) throw new Error(`Invalid data/theme.json:\n  - ${errors.join('\n  - ')}`)
  return theme
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

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
