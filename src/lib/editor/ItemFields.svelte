<script lang="ts">
  import type { WishlistItem } from '../types'

  let {
    item = $bindable(),
    index,
    count,
    open = false,
    onmove,
    onremove,
  }: {
    item: WishlistItem
    index: number
    count: number
    open?: boolean
    onmove: (delta: number) => void
    onremove: () => void
  } = $props()

  // Raw text so typing "a, " isn't rewritten mid-keystroke; the array updates live.
  // Each item gets a fresh component (keyed by object), so reading `item` once is fine.
  // svelte-ignore state_referenced_locally
  let tagsText = $state((item.tags ?? []).join(', '))

  function setTags(text: string) {
    tagsText = text
    item.tags = text
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  const label = $derived(item.name.trim() || 'Untitled item')
</script>

<li>
  <details {open}>
    <summary>{label}</summary>
    <div class="fields">
      <label>Name <input bind:value={item.name} required /></label>
      <label>Description <textarea rows="3" bind:value={item.description}></textarea></label>
      <label>Link <input type="url" bind:value={item.link} placeholder="https://" /></label>
      <label>Photo URL <input type="url" bind:value={item.photo} placeholder="https://" /></label>
      <label>Price <input bind:value={item.price} /></label>
      <label>
        Tags <span class="hint">(comma-separated)</span>
        <input value={tagsText} oninput={(e) => setTags(e.currentTarget.value)} />
      </label>
      <div class="actions">
        <button type="button" disabled={index === 0} onclick={() => onmove(-1)} aria-label="Move {label} up">
          ↑ Up
        </button>
        <button
          type="button"
          disabled={index === count - 1}
          onclick={() => onmove(1)}
          aria-label="Move {label} down"
        >
          ↓ Down
        </button>
        <button type="button" class="danger" onclick={onremove} aria-label="Remove {label}">Remove</button>
      </div>
    </div>
  </details>
</li>

<style>
  li {
    border: 1px solid var(--wk-border);
    border-radius: 8px;
    background: var(--wk-surface);
  }

  summary {
    padding: 10px 12px;
    font-weight: 600;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .fields {
    display: grid;
    gap: 10px;
    padding: 0 12px 12px;
  }

  .hint {
    color: var(--wk-muted);
    font-weight: 400;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .danger {
    margin-left: auto;
    color: var(--wk-danger);
  }
</style>
