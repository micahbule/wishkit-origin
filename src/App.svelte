<script>
  import wishlist from '../data/wishlist.json'

  // Placeholder gift icon, same data:URL the the build-time generator used,
  // so layouts match exactly when a photo is absent.
  const placeholder =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
        '<rect width="600" height="400" fill="#8883"/>' +
        '<text x="300" y="225" font-size="72" text-anchor="middle">🎁</text></svg>',
    )
</script>

<div id="app">
  <header>
    <h1>{wishlist.title}</h1>
  </header>
  <main>
    <ul class="wishes">
      {#each wishlist.items as item (item.name)}
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
          </div>
        </li>
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

<!-- Placeholder gift icon for items without a photo. Reuse the same
     data:URL the build-time generator used, so layouts match exactly. -->
<svg style="display: none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#8883" />
  <text x="300" y="225" font-size="72" text-anchor="middle">🎁</text>
</svg>

<style>
  :root {
    --accent: #b3261e;
    --accent-bg: rgba(179, 38, 30, 0.08);
    --accent-border: rgba(179, 38, 30, 0.4);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --accent: #f2867d;
      --accent-bg: rgba(242, 134, 125, 0.12);
      --accent-border: rgba(242, 134, 125, 0.4);
    }
  }

  #app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
    font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
  }

  header {
    border-bottom: 3px double var(--accent-border);
    padding-bottom: 16px;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 2.5rem;
    color: var(--text-h);
    margin: 0;
  }

  .wishes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
    text-align: left;
  }

  .wish {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-top: 4px solid var(--accent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg);
    transition: box-shadow 0.3s;
  }

  .wish:hover {
    box-shadow: var(--shadow);
  }

  .wish img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    background: var(--code-bg);
  }

  .wish-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 20px 20px;
    flex-grow: 1;
  }

  .wish-body h2 {
    font-size: 1.25rem;
    color: var(--text-h);
    margin: 0;
  }

  .wish-body p {
    color: var(--text);
    font-size: 0.95rem;
    margin: 0;
  }

  .wish-meta {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-top: 8px;
  }

  .price {
    font-family: ui-monospace, Consolas, monospace;
    color: var(--text-h);
    font-size: 0.9rem;
  }

  .wish-meta a {
    margin-left: auto;
    color: var(--accent);
    background: var(--accent-bg);
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 4px 12px;
    text-decoration: none;
    font-size: 0.9rem;
    transition: border-color 0.3s;
  }

  .wish-meta a:hover {
    border-color: var(--accent-border);
  }

  footer {
    border-top: 1px solid var(--border);
    padding: 20px 0;
    font-size: 0.85rem;
    color: var(--text);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
