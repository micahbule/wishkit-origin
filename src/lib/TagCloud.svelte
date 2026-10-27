<script lang="ts">
  let {
    counts,
    selected,
    onselect,
  }: {
    counts: Map<string, number>
    selected: string | null
    onselect: (tag: string | null) => void
  } = $props()

  const max = $derived(Math.max(1, ...counts.values()))

  // Scale 0.85rem → 1.25rem by how often a tag appears, so popular tags read bigger.
  function size(count: number): string {
    return `${0.85 + (0.4 * (count - 1)) / Math.max(1, max - 1)}rem`
  }
</script>

<nav class="tag-cloud" aria-label="Filter by tag">
  <button type="button" class="tag" aria-pressed={selected === null} onclick={() => onselect(null)}>
    All
  </button>
  {#each counts as [tag, count] (tag)}
    <button
      type="button"
      class="tag"
      style:font-size={size(count)}
      aria-pressed={selected === tag}
      onclick={() => onselect(selected === tag ? null : tag)}
    >
      #{tag} <span class="count">{count}</span>
    </button>
  {/each}
</nav>

<style>
  .tag-cloud {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .tag {
    min-height: var(--tap);
    padding: 0 14px;
    font: inherit;
    font-family: var(--mono);
    color: var(--accent);
    background: var(--accent-bg);
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    transition: border-color 0.3s;
  }

  .tag[aria-pressed='true'] {
    color: var(--bg);
    background: var(--accent);
  }

  .count {
    font-size: 0.75em;
    opacity: 0.7;
  }

  @media (min-width: 40rem) {
    .tag-cloud {
      margin-bottom: 28px;
    }

    .tag {
      min-height: 36px;
    }
  }

  @media (hover: hover) {
    .tag:hover {
      border-color: var(--accent-border);
    }
  }
</style>
