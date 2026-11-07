<script lang="ts">
  // Dev-only editor overlay (mounted from src/main.ts behind import.meta.env.DEV).
  // Wishlist edits mutate the shared state so the page re-renders live; theme
  // edits rewrite <style id="theme"> from a draft. Save POSTs both to the
  // /__wishkit/save endpoint (plugins/editor.ts), which writes data/*.json.
  import { tick } from 'svelte'
  import themeData from '../../../data/theme.json'
  import { COLOR_KEYS, parseTheme, themeCss, validateTheme, type Theme } from '../themeTokens'
  import type { Wishlist, WishlistItem } from '../types'
  import { wishlist } from '../wishlist.svelte'
  import ItemFields from './ItemFields.svelte'

  type Tab = 'wishlist' | 'theme'
  const SCHEMES = ['light', 'dark'] as const
  type Status = { kind: 'idle' | 'saving' | 'saved' } | { kind: 'error'; errors: string[] }

  // Survives the full reload that saving data/*.json triggers.
  const KEY = 'wishkit-editor'
  // Separate key so an HMR remount re-running persist() can't clobber it.
  const SAVED_KEY = 'wishkit-editor-saved'
  const SAVED_FRESH_MS = 10_000
  const session: { open?: boolean; tab?: Tab } = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
    } catch {
      return {}
    }
  })()
  const justSaved = (() => {
    try {
      return Date.now() - Number(sessionStorage.getItem(SAVED_KEY)) < SAVED_FRESH_MS
    } catch {
      return false
    }
  })()
  function persist() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ open, tab }))
    } catch {
      // Storage blocked: the editor just won't reopen after a reload.
    }
  }
  function markSaved() {
    try {
      sessionStorage.setItem(SAVED_KEY, String(Date.now()))
    } catch {
      // Storage blocked: the reloaded page just shows "No changes".
    }
  }

  let open = $state(session.open ?? false)
  let tab = $state<Tab>(session.tab === 'theme' ? 'theme' : 'wishlist')
  // A save that just succeeded triggers a full reload; keep showing its result.
  let status = $state<Status>({ kind: justSaved ? 'saved' : 'idle' })
  let newItem = $state<WishlistItem | null>(null)
  let editButton: HTMLButtonElement | undefined = $state()
  let closeButton: HTMLButtonElement | undefined = $state()

  $effect(() => persist())

  let draft = $state<Theme>(parseTheme(themeData))
  // Last saved state (initially what's on disk); Discard restores it.
  // svelte-ignore state_referenced_locally
  let saved = $state.raw({ wishlist: $state.snapshot(wishlist), theme: $state.snapshot(draft) })

  const themeErrors = $derived(validateTheme(draft).errors)
  const dirty = $derived(
    JSON.stringify([clean(wishlist), draft]) !== JSON.stringify([clean(saved.wishlist), saved.theme]),
  )
  const canSave = $derived(dirty && !themeErrors.length && status.kind !== 'saving')

  // Live preview: the page reads only these tokens, so swapping the block re-themes it.
  $effect(() => {
    const css = themeCss(draft)
    const style = document.getElementById('theme')
    if (style) style.textContent = css
  })

  /** Drops blank optional fields and empty tag lists so the JSON stays clean. */
  function clean(list: Wishlist): Wishlist {
    const author = list.author?.trim()
    return {
      title: list.title.trim(),
      ...(author ? { author } : {}),
      items: list.items.map((item) => {
        const out: WishlistItem = { name: item.name.trim() }
        for (const key of ['description', 'link', 'photo', 'price'] as const) {
          const value = item[key]?.trim()
          if (value) out[key] = value
        }
        const tags = item.tags?.map((tag) => tag.trim()).filter(Boolean)
        if (tags?.length) out.tags = tags
        return out
      }),
    }
  }

  function toggle(next: boolean) {
    open = next
    // Hand focus to the drawer / back to the button that opened it.
    tick().then(() => (next ? closeButton : editButton)?.focus())
  }

  function onkeydown(event: KeyboardEvent) {
    if (!open) return
    if (event.key === 'Escape') toggle(false)
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      save()
    }
  }

  function addItem() {
    newItem = { name: 'New item' }
    wishlist.items.push(newItem)
  }

  function moveItem(index: number, delta: number) {
    const [item] = wishlist.items.splice(index, 1)
    wishlist.items.splice(index + delta, 0, item)
  }

  function discard() {
    const restored = structuredClone(saved.wishlist)
    wishlist.title = restored.title
    wishlist.author = restored.author
    wishlist.items = restored.items
    draft = structuredClone(saved.theme)
    status = { kind: 'idle' }
  }

  async function save() {
    if (!canSave) return
    const body = { wishlist: clean(wishlist), theme: $state.snapshot(draft) }
    status = { kind: 'saving' }
    try {
      const res = await fetch('/__wishkit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw result.errors ?? [`Save failed (HTTP ${res.status})`]
      markSaved()
      saved = body
      status = { kind: 'saved' }
    } catch (error) {
      status = { kind: 'error', errors: Array.isArray(error) ? error : [String(error)] }
    }
  }

  /** <input type="color"> only takes #rrggbb. */
  function pickerValue(hex: string): string {
    if (/^#[0-9a-f]{6}$/i.test(hex)) return hex
    if (/^#[0-9a-f]{3}$/i.test(hex)) return `#${[...hex.slice(1)].map((ch) => ch + ch).join('')}`
    return '#000000'
  }
</script>

<svelte:window {onkeydown} />

{#if !open}
  <button bind:this={editButton} type="button" class="edit" aria-expanded="false" onclick={() => toggle(true)}>
    Edit{dirty ? ' •' : ''}
  </button>
{:else}
  <aside class="drawer" aria-labelledby="wk-title">
    <header>
      <h2 id="wk-title">Editor</h2>
      <div class="tabs" role="group" aria-label="Editor section">
        <button type="button" aria-pressed={tab === 'wishlist'} onclick={() => (tab = 'wishlist')}>Wishlist</button>
        <button type="button" aria-pressed={tab === 'theme'} onclick={() => (tab = 'theme')}>Theme</button>
      </div>
      <button bind:this={closeButton} type="button" class="close" aria-label="Close editor" onclick={() => toggle(false)}>
        ✕
      </button>
    </header>

    <div class="body">
      {#if tab === 'wishlist'}
        <section aria-label="Wishlist">
          <label>Title <input bind:value={wishlist.title} required /></label>
          <label>Author <input bind:value={wishlist.author} /></label>
          <h3>Items ({wishlist.items.length})</h3>
          <ul class="items">
            {#each wishlist.items as item, i (item)}
              <ItemFields
                bind:item={wishlist.items[i]}
                index={i}
                count={wishlist.items.length}
                open={item === newItem}
                onmove={(delta) => moveItem(i, delta)}
                onremove={() => wishlist.items.splice(i, 1)}
              />
            {/each}
          </ul>
          <button type="button" onclick={addItem}>+ Add item</button>
        </section>
      {:else}
        <section aria-label="Theme">
          {#each COLOR_KEYS as key (key)}
            <fieldset>
              <legend>{key}</legend>
              {#each SCHEMES as scheme (scheme)}
                <div class="color">
                  <input
                    type="color"
                    aria-label="{key} {scheme} color picker"
                    value={pickerValue(draft.colors[key][scheme])}
                    oninput={(e) => (draft.colors[key][scheme] = e.currentTarget.value)}
                  />
                  <label>
                    {scheme}
                    <input class="hex" bind:value={draft.colors[key][scheme]} spellcheck="false" />
                  </label>
                </div>
              {/each}
            </fieldset>
          {/each}
          <label>Body font <input bind:value={draft.fonts.body} spellcheck="false" /></label>
          <label>Mono font <input bind:value={draft.fonts.mono} spellcheck="false" /></label>
          <label>
            Corner radius: {draft.radius}px
            <input type="range" min="0" max="48" bind:value={draft.radius} />
          </label>
        </section>
      {/if}
    </div>

    <footer>
      <!-- In the footer so the reason Save is disabled is always in view. -->
      {#if themeErrors.length}
        <div class="problems" role="alert">
          <p>Fix these theme problems before saving:</p>
          <ul>
            {#each themeErrors as error, i (i)}<li>{error}</li>{/each}
          </ul>
        </div>
      {/if}
      <p class="status" aria-live="polite">
        {#if status.kind === 'saving'}
          Saving…
        {:else if status.kind === 'error'}
          <span class="error">Save failed:</span>
        {:else if dirty}
          Unsaved changes
        {:else if status.kind === 'saved'}
          Saved to data/*.json
        {:else}
          No changes
        {/if}
      </p>
      {#if status.kind === 'error'}
        <ul class="error">
          {#each status.errors as error, i (i)}<li>{error}</li>{/each}
        </ul>
      {/if}
      <div class="actions">
        <button type="button" disabled={!dirty || status.kind === 'saving'} onclick={discard}>Discard</button>
        <button type="button" class="primary" disabled={!canSave} onclick={save} aria-keyshortcuts="Control+S Meta+S">
          Save
        </button>
      </div>
    </footer>
  </aside>
{/if}

<style>
  /* Fixed neutral palette, independent of the page theme being edited. */
  .edit,
  .drawer {
    --wk-bg: light-dark(#ffffff, #18181b);
    --wk-surface: light-dark(#f4f4f5, #27272a);
    --wk-text: light-dark(#18181b, #f4f4f5);
    --wk-muted: light-dark(#52525b, #a1a1aa);
    --wk-border: light-dark(#d4d4d8, #3f3f46);
    --wk-primary: light-dark(#1d4ed8, #60a5fa);
    --wk-on-primary: light-dark(#ffffff, #0b1220);
    --wk-danger: light-dark(#b91c1c, #f87171);
    color-scheme: light dark;
    font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: var(--wk-text);
    z-index: 2147483000;
  }

  .edit {
    position: fixed;
    right: max(16px, env(safe-area-inset-right));
    bottom: max(16px, env(safe-area-inset-bottom));
    padding: 10px 18px;
    border: 1px solid var(--wk-border);
    border-radius: 999px;
    background: var(--wk-bg);
    font-weight: 600;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
    cursor: pointer;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(420px, 100vw);
    display: flex;
    flex-direction: column;
    background: var(--wk-bg);
    border-left: 1px solid var(--wk-border);
    box-shadow: -8px 0 24px rgb(0 0 0 / 0.2);
  }

  header,
  footer {
    padding: 12px 16px;
    background: var(--wk-bg);
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--wk-border);
  }

  footer {
    border-top: 1px solid var(--wk-border);
  }

  h2,
  h3 {
    color: var(--wk-text);
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  h3 {
    margin-top: 8px;
  }

  .tabs {
    display: inline-flex;
    gap: 4px;
  }

  .tabs button[aria-pressed='true'] {
    background: var(--wk-primary);
    border-color: var(--wk-primary);
    color: var(--wk-on-primary);
  }

  .close {
    margin-left: auto;
  }

  .body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  section {
    display: grid;
    gap: 12px;
  }

  .items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  fieldset {
    margin: 0;
    padding: 8px 12px 12px;
    border: 1px solid var(--wk-border);
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  legend {
    padding: 0 4px;
    font-weight: 600;
  }

  .color {
    display: flex;
    align-items: end;
    gap: 6px;
  }

  input[type='color'] {
    flex: none;
    width: 36px;
    height: 34px;
    padding: 2px;
  }

  .hex {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }

  .problems,
  .error {
    color: var(--wk-danger);
  }

  .problems {
    max-height: 30vh;
    overflow-y: auto;
    margin-bottom: 8px;
  }

  .problems p {
    margin: 0;
  }

  .problems ul,
  ul.error {
    margin: 4px 0 0;
    padding-left: 18px;
    overflow-wrap: anywhere;
  }

  .status {
    margin: 0;
    color: var(--wk-muted);
  }

  footer .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  /* Shared form styles (also reach ItemFields, which renders inside .drawer). */
  .drawer :global(label) {
    display: grid;
    gap: 4px;
    font-weight: 500;
    flex: 1;
    min-width: 0;
  }

  .drawer :global(input:not([type='color'], [type='range'])),
  .drawer :global(textarea) {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--wk-border);
    border-radius: 6px;
    background: var(--wk-bg);
    color: var(--wk-text);
    font: inherit;
    font-weight: 400;
  }

  .drawer :global(textarea) {
    resize: vertical;
  }

  .drawer :global(button) {
    padding: 6px 12px;
    border: 1px solid var(--wk-border);
    border-radius: 6px;
    background: var(--wk-surface);
    color: var(--wk-text);
    font: inherit;
    cursor: pointer;
  }

  .drawer :global(button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .drawer .primary {
    background: var(--wk-primary);
    border-color: var(--wk-primary);
    color: var(--wk-on-primary);
    font-weight: 600;
  }

  .edit:focus-visible,
  .drawer :global(:focus-visible) {
    outline: 2px solid var(--wk-primary);
    outline-offset: 2px;
  }
</style>
