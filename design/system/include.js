// Inlines character SVGs: <span data-character="host/asking"></span> becomes the contents of
// ../characters/host/asking.svg. Inlined (not <img>) so the SVG's var(--color-…) fills resolve
// against design/system/tokens.css. A character that isn't drawn yet shows the placeholder.
document.addEventListener('DOMContentLoaded', () => {
  // Check the type, not just res.ok: a dev server may answer a missing file with index.html and a 200.
  const load = (path) =>
    fetch(path).then((res) =>
      res.ok && (res.headers.get('content-type') ?? '').includes('svg') ? res.text() : Promise.reject(new Error(path)),
    )
  for (const slot of document.querySelectorAll('[data-character]')) {
    const key = slot.dataset.character
    load(`../characters/${key}.svg`)
      .catch(() => load('../characters/placeholder.svg').then((svg) => svg.replace('{{key}}', key)))
      .then((svg) => {
        slot.innerHTML = svg
        slot.querySelector('svg')?.setAttribute('aria-hidden', slot.hasAttribute('aria-label') ? 'true' : 'false')
      })
  }
})
