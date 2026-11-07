import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const target = document.getElementById('app')

if (!target) {
  throw new Error('Mount target #app not found')
}

const app = mount(App, { target })

// Dev-only editor overlay. `import.meta.env.DEV` is false in `vite build`, so
// Rollup drops this branch and the editor chunk never ships.
if (import.meta.env.DEV) {
  import('./lib/editor/Editor.svelte').then(({ default: Editor }) => {
    const root = document.createElement('div')
    root.id = 'wishkit-editor'
    document.body.append(root)
    mount(Editor, { target: root })
  })
}

export default app
