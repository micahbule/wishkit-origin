// Dev-only save endpoint for the editor overlay (src/lib/editor/). `apply: 'serve'`
// keeps it out of `vite build`, so the published site never has it.
// POST /__wishkit/save { wishlist, theme } → validates, then writes data/*.json.
import { writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { COLOR_KEYS, validateTheme } from '../src/lib/themeTokens'
import type { Wishlist, WishlistItem } from '../src/lib/types'

const MAX_BODY = 1_000_000
const OPTIONAL = ['description', 'link', 'photo', 'price'] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validates raw JSON into a Wishlist with only known keys, collecting every problem. */
function validateWishlist(raw: unknown): { wishlist: Wishlist; errors: string[] } {
  const errors: string[] = []
  const input = isObject(raw) ? raw : {}
  if (!isObject(raw)) errors.push('expected a JSON object')
  if (typeof input.title !== 'string' || !input.title.trim()) errors.push('"title" must be a non-empty string')
  if (input.author !== undefined && typeof input.author !== 'string') errors.push('"author" must be a string')
  if (!Array.isArray(input.items)) errors.push('"items" must be an array')

  const items = (Array.isArray(input.items) ? input.items : []).map((rawItem: unknown, i) => {
    const item = isObject(rawItem) ? rawItem : {}
    if (!isObject(rawItem)) errors.push(`items[${i}] must be an object`)
    if (typeof item.name !== 'string' || !item.name.trim()) errors.push(`items[${i}].name must be a non-empty string`)
    const out: WishlistItem = { name: String(item.name ?? '') }
    for (const key of OPTIONAL) {
      if (item[key] === undefined) continue
      if (typeof item[key] !== 'string') errors.push(`items[${i}].${key} must be a string`)
      else out[key] = item[key]
    }
    if (item.tags !== undefined) {
      if (!Array.isArray(item.tags) || !item.tags.every((tag) => typeof tag === 'string')) {
        errors.push(`items[${i}].tags must be an array of strings`)
      } else out.tags = item.tags
    }
    return out
  })

  // Key order matches the hand-written file: title, author, items.
  const wishlist: Wishlist = {
    title: String(input.title ?? ''),
    ...(typeof input.author === 'string' ? { author: input.author } : {}),
    items,
  }
  return { wishlist, errors }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((done, fail) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      body += chunk
      if (body.length > MAX_BODY) fail(new Error('request body too large'))
    })
    req.on('end', () => done(body))
    req.on('error', fail)
  })
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/**
 * Matches the hand-written layout of data/*.json: containers are expanded (2-space
 * indent) down to `depth` levels; anything deeper is written on one line as
 * `{ "key": value, "k2": v2 }` / `["a", "b"]`.
 */
function format(value: unknown, depth: number, indent = ''): string {
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    if (depth <= 0) return `[${value.map((v) => format(v, 0)).join(', ')}]`
    const inner = `${indent}  `
    return `[\n${value.map((v) => inner + format(v, depth - 1, inner)).join(',\n')}\n${indent}]`
  }
  if (isObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    if (!entries.length) return '{}'
    const pair = (k: string, v: unknown, d: number, ind: string) => `${JSON.stringify(k)}: ${format(v, d, ind)}`
    if (depth <= 0) return `{ ${entries.map(([k, v]) => pair(k, v, 0, '')).join(', ')} }`
    const inner = `${indent}  `
    return `{\n${entries.map(([k, v]) => inner + pair(k, v, depth - 1, inner)).join(',\n')}\n${indent}}`
  }
  return JSON.stringify(value)
}

const pretty = (value: unknown) => `${format(value, 2)}\n`

export default function editorPlugin(dir = 'data'): Plugin {
  let root = process.cwd()
  return {
    name: 'wishkit-editor',
    apply: 'serve',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      server.middlewares.use('/__wishkit/save', async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { errors: ['use POST'] })
        // A JSON content type forces a CORS preflight, so other sites can't write files.
        if (!req.headers['content-type']?.startsWith('application/json')) {
          return send(res, 415, { errors: ['Content-Type must be application/json'] })
        }

        let body: unknown
        try {
          body = JSON.parse(await readBody(req))
        } catch (error) {
          return send(res, 400, { errors: [`invalid request: ${(error as Error).message}`] })
        }
        const payload = isObject(body) ? body : {}
        const list = validateWishlist(payload.wishlist)
        const look = validateTheme(payload.theme)
        const errors = [
          ...list.errors.map((e) => `wishlist.json: ${e}`),
          ...look.errors.map((e) => `theme.json: ${e}`),
        ]
        if (errors.length) return send(res, 400, { errors })

        const { colors, fonts, radius } = look.theme
        const theme = {
          $schema: './theme.schema.json',
          colors: Object.fromEntries(COLOR_KEYS.map((key) => [key, { light: colors[key].light, dark: colors[key].dark }])),
          fonts: { body: fonts.body, mono: fonts.mono },
          radius,
        }
        try {
          await writeFile(resolve(root, dir, 'wishlist.json'), pretty(list.wishlist))
          await writeFile(resolve(root, dir, 'theme.json'), pretty(theme))
        } catch (error) {
          return send(res, 500, { errors: [`could not write files: ${(error as Error).message}`] })
        }
        send(res, 200, { ok: true })
      })
    },
  }
}
