// Build-time theming: reads data/theme.json, validates it (shape + WCAG AA
// contrast), and inlines the resulting CSS custom properties into index.html.
// Components only ever read the tokens (--text, --accent, …), so a fork changes
// its look by editing data/theme.json alone. The pure parts (Theme, parseTheme,
// themeCss) live in src/lib/themeTokens.ts so the dev editor can reuse them.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { parseTheme, themeCss } from '../src/lib/themeTokens'

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
