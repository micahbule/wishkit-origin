// Reads data/wishlist.json and writes a static dist/index.html.
// No network access; set SOURCE_DATE_EPOCH for a reproducible timestamp.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const path = (p) => fileURLToPath(new URL(p, root))

const data = JSON.parse(readFileSync(path('data/wishlist.json'), 'utf8'))
// Reuse the app's design tokens (and base typography) as the single source of truth.
const baseCss = readFileSync(path('src/app.css'), 'utf8')

if (typeof data.title !== 'string' || !Array.isArray(data.items)) {
  throw new Error('data/wishlist.json: expected "title" (string) and "items" (array)')
}

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )

// Only allow http(s) and relative URLs, so data can't inject javascript: links.
const safeUrl = (url) => (/^(https?:\/\/|\/|\.\/)/i.test(url) ? url : null)

const placeholder =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
      '<rect width="600" height="400" fill="#8883"/>' +
      '<text x="300" y="225" font-size="72" text-anchor="middle">🎁</text></svg>',
  )

const epoch = process.env.SOURCE_DATE_EPOCH
const generatedAt = (epoch ? new Date(Number(epoch) * 1000) : new Date()).toISOString()

function renderItem(item) {
  if (typeof item?.name !== 'string') throw new Error('Each item needs a "name" string')
  const photo = item.photo && safeUrl(item.photo)
  const link = item.link && safeUrl(item.link)
  return `
      <li class="wish">
        <img src="${escape(photo || placeholder)}" alt="${escape(item.name)}" width="600" height="400" loading="lazy" />
        <div class="wish-body">
          <h2>${escape(item.name)}</h2>
          ${item.description ? `<p>${escape(item.description)}</p>` : ''}
          <div class="wish-meta">
            ${item.price ? `<span class="price">${escape(item.price)}</span>` : ''}
            ${link ? `<a href="${escape(link)}" rel="noopener noreferrer">View item<span class="visually-hidden">: ${escape(item.name)}</span></a>` : ''}
          </div>
        </div>
      </li>`
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>${escape(data.title)}</title>
    <style>
${baseCss}
/* Festive accent: override existing tokens rather than adding new ones */
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
#app { padding: 0 24px 0; }
header { border-bottom: 3px double var(--accent-border); }
.wishes {
  list-style: none;
  margin: 0;
  padding: 32px 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  text-align: left;
  flex-grow: 1;
  align-content: start;
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
  &:hover { box-shadow: var(--shadow); }
  img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    background: var(--code-bg);
  }
}
.wish-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px 20px;
  flex-grow: 1;
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
  font-family: var(--mono);
  color: var(--text-h);
}
.wish-meta a {
  margin-left: auto;
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 12px;
  text-decoration: none;
  &:hover { border-color: var(--accent-border); }
  &:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
}
footer {
  border-top: 1px solid var(--border);
  padding: 20px 0;
  font-size: 14px;
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
  </head>
  <body>
    <div id="app">
      <header>
        <h1>${escape(data.title)}</h1>
      </header>
      <main>
        <ul class="wishes">${data.items.map(renderItem).join('')}
        </ul>
      </main>
      <footer>
        <p>${data.author ? `Wishlist by ${escape(data.author)} · ` : ''}Generated at <time datetime="${generatedAt}">${generatedAt}</time></p>
      </footer>
    </div>
  </body>
</html>
`

mkdirSync(path('dist'), { recursive: true })
writeFileSync(path('dist/index.html'), html)
console.log(`Generated dist/index.html with ${data.items.length} item(s)`)
