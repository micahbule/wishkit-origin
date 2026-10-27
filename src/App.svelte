<script lang="ts">
  import type { Wishlist } from './lib/types'
  import TagCloud from './lib/TagCloud.svelte'
  import WishCard from './lib/WishCard.svelte'
  import data from '../data/wishlist.json'

  const wishlist: Wishlist = data

  // Tag → number of items carrying it, most common first.
  const tagCounts = new Map(
    [
      ...wishlist.items
        .flatMap((item) => item.tags ?? [])
        .reduce((acc, tag) => acc.set(tag, (acc.get(tag) ?? 0) + 1), new Map<string, number>()),
    ].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)),
  )

  let selectedTag: string | null = $state(null)

  const visibleItems = $derived(
    selectedTag ? wishlist.items.filter((item) => item.tags?.includes(selectedTag!)) : wishlist.items,
  )

  function selectTag(tag: string | null) {
    selectedTag = tag
  }
</script>

<div class="shell">
  <header>
    <h1>{wishlist.title}</h1>
  </header>
  <main>
    {#if tagCounts.size}
      <TagCloud counts={tagCounts} selected={selectedTag} onselect={selectTag} />
    {/if}
    <ul class="wishes">
      {#each visibleItems as item (item.name)}
        <WishCard {item} selectedTag={selectedTag} onselect={selectTag} />
      {/each}
    </ul>
  </main>
  <footer>
    <p>
      Wishlist by {wishlist.author}
      {wishlist.author ? ' · ' : ''}
      Generated at <time dateTime={new Date().toISOString()}>{new Date().toISOString()}</time>
    </p>
  </footer>
</div>

<style>
  /* Mobile-first: single column with safe-area-aware gutters. */
  .shell {
    max-width: 1200px;
    min-height: 100svh;
    margin: 0 auto;
    padding: 20px max(var(--gutter), env(safe-area-inset-right))
      max(20px, env(safe-area-inset-bottom)) max(var(--gutter), env(safe-area-inset-left));
    display: flex;
    flex-direction: column;
  }

  header {
    border-bottom: 3px double var(--accent-border);
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  h1 {
    font-size: clamp(1.75rem, 6vw + 0.5rem, 2.75rem);
    letter-spacing: -0.02em;
  }

  main {
    flex-grow: 1;
  }

  .wishes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  footer {
    border-top: 1px solid var(--border);
    margin-top: 32px;
    padding-top: 16px;
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }

  @media (min-width: 40rem) {
    .shell {
      padding-top: 32px;
    }

    header {
      padding-bottom: 16px;
      margin-bottom: 28px;
    }

    .wishes {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
  }

  @media (min-width: 64rem) {
    .wishes {
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
  }
</style>
