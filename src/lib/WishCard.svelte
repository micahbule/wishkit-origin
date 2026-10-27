<script lang="ts">
  import type { WishlistItem } from './types'

  let {
    item,
    selectedTag = null,
    onselect,
  }: {
    item: WishlistItem
    selectedTag?: string | null
    onselect?: (tag: string | null) => void
  } = $props()

  // Placeholder gift icon, same data:URL the build-time generator used,
  // so layouts match exactly when a photo is absent.
  const placeholder: string =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
        '<rect width="600" height="400" fill="#8883"/>' +
        '<text x="300" y="225" font-size="72" text-anchor="middle">🎁</text></svg>',
    )
</script>

<li class="wish">
  <img
    src={item.photo || placeholder}
    alt={item.name}
    width="600"
    height="400"
    loading="lazy"
  />
  <div class="wish-body">
    <h2>{item.name}</h2>
    {#if item.description}
      <p>{item.description}</p>
    {/if}
    {#if item.tags?.length}
      <ul class="tags" aria-label="Tags">
        {#each item.tags as tag (tag)}
          <li>
            <button
              type="button"
              aria-pressed={selectedTag === tag}
              onclick={() => onselect?.(selectedTag === tag ? null : tag)}
            >
              #{tag}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if item.price || item.link}
      <div class="wish-meta">
        {#if item.price}
          <span class="price">{item.price}</span>
        {/if}
        {#if item.link}
          <a
            href={item.link}
            rel="noopener noreferrer"
            target="_blank"
            aria-label="View item: {item.name}"
          >
            View item
          </a>
        {/if}
      </div>
    {/if}
  </div>
</li>

<style>
  .wish {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-top: 4px solid var(--accent);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
    transition: box-shadow 0.3s;
  }

  img {
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    background: var(--code-bg);
  }

  .wish-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    flex-grow: 1;
  }

  h2 {
    font-size: 1.125rem;
  }

  p {
    font-size: 0.95rem;
  }

  .tags {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tags button {
    padding: 2px 10px;
    font: inherit;
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--accent);
    background: var(--accent-bg);
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    transition: border-color 0.3s;
  }

  .tags button[aria-pressed='true'] {
    color: var(--bg);
    background: var(--accent);
  }

  /* Phones: price on top, full-width tap target below. */
  .wish-meta {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-top: 8px;
  }

  .price {
    font-family: var(--mono);
    color: var(--text-h);
    font-size: 0.95rem;
  }

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
    padding: 0 16px;
    color: var(--accent);
    background: var(--accent-bg);
    border: 1px solid transparent;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    transition: border-color 0.3s;
  }

  @media (min-width: 40rem) {
    .wish-body {
      padding: 16px 20px 20px;
    }

    .wish-meta {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    a {
      margin-left: auto;
      min-height: 36px;
      font-size: 0.9rem;
    }
  }

  /* Hover effects only where a real pointer exists, so taps don't stick. */
  @media (hover: hover) {
    .wish:hover {
      box-shadow: var(--shadow);
    }

    a:hover,
    .tags button:hover {
      border-color: var(--accent-border);
    }
  }
</style>
