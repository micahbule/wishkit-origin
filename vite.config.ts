import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import editor from './plugins/editor'
import theme from './plugins/theme'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build works under a GitHub Pages subpath.
  base: './',
  // editor() is dev-only (apply: 'serve'): the save endpoint for the in-browser editor.
  plugins: [svelte(), theme(), editor()],
})
