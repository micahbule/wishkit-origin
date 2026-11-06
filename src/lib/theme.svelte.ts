// Theme preference: 'system' follows the OS; 'light' / 'dark' force one via
// <html data-theme>, which app.css maps to `color-scheme`. The inline script in
// index.html applies the saved value before first paint so there is no flash.

export type Theme = 'system' | 'light' | 'dark'

export const THEMES: Theme[] = ['system', 'light', 'dark']
const KEY = 'theme'

function read(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage blocked (private mode, etc.): fall back to the OS.
  }
  return 'system'
}

let current = $state<Theme>(read())

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

export const theme = {
  get value(): Theme {
    return current
  },
  set(next: Theme) {
    current = next
    apply(next)
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  },
}
