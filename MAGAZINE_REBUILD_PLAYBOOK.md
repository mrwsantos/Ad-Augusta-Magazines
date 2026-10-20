# Magazine Responsive Rebuild — Playbook

Step-by-step process for turning an InDesign/in5 HTML5 export (fixed-pixel,
non-responsive) into a real responsive website: vertical scroll on mobile
with a floating pager, horizontal scroll-snap slider on desktop, real
extracted text (not screenshots), and honest handling of placeholder/WIP
content. Written after doing this for "Ad Augusta" (Auckland Grammar
School magazine, May 2026 issue). Follow this same base every time a new
export shows up, then adjust to whatever that export's format turns out to
be (see Step 1 — there are at least two different in5/InDesign export
shapes in the wild).

## 0.5 Site structure — collection hub + per-issue folders

Once a second issue is on the horizon, the site is organized as a
collection, not a single page:

```
html5_output/                         ← project root
├─ index.html                         ← collection hub (its own page)
├─ assets/css/index.css               ← hub's own stylesheet, separate
│                                        from any issue's magazine.css
└─ collection/
   └─ <issue-slug>/                   ← e.g. may-26
      ├─ index.html                   ← the rebuilt issue (was magazine.html)
      ├─ assets/css/magazine.css      ← per-issue design system
      ├─ assets/js/{slider,mobile-pager}.js
      ├─ publication-web-resources/   ← that issue's own export bundle
      └─ font/
```

Each issue is fully self-contained under `collection/<slug>/` with paths
relative to itself (so nothing breaks when new issues are added). The hub
page links to each issue with a root-relative path
(`/collection/<slug>/index.html`) and pulls each issue's crest logo /
`publication-web-resources/Thumbnails/publication.jpg` (the export's own
lightweight page-1 thumbnail — much smaller than the full-res cover file
in `Thumbnails/Cover/`, prefer it for card art) directly from that
issue's own asset folder rather than duplicating images into a shared
location. Style the hub as a card grid (`.issue-grid` / `.issue-card`),
matching the same navy/gold + Lora/Inter palette as the per-issue
`magazine.css` for visual continuity, but keep it a genuinely separate
stylesheet — the hub has its own layout concerns (archive grid, hero
header) that don't belong in a single issue's CSS.

When wiring a new issue's card into the hub, double check the href
against the actual folder name on disk — root-relative links
(`/collection/...`) look right but 404 silently if the slug or a path
segment is off by one; `curl` every new link before calling it done.

## 0. Inputs to expect from the user

- A folder dropped in, containing an `index.html` plus an export bundle
  (assets/images/fonts/scripts). Sometimes replaces a previous export
  entirely — check for leftover files from a prior build (old
  `assets/`, old `magazine.html`) before assuming they're still there.
- Sometimes a "flat plan" PDF (an editorial planning grid: page number →
  section name → content description → owner initials). If provided, it
  is the authoritative source for page titles/order — cross-check
  extracted content against it, don't just trust the raw export's TOC
  page (TOCs in WIP issues are often stale/out of sync with actual page
  order).
- The user will ask for N pages at a time ("primeiras N páginas"). Scope
  the extraction + rebuild to exactly that range; leave the rest of the
  export alone.

## 1. Identify the export format first

Two shapes seen so far — check which one you have before writing any
extraction code:

**Format A — old in5 "slider" export** (single `index.html`, jQuery
engine): `li.page` elements, text baked into rasterized PNG/JPG images
with truncated `alt` text, `.hd` class = high-density image scaled `.5`
via CSS transform, `in5.config.js` / `jquery.anythingslider.min.js`.
Watch for a dead-code bug: `window.scaleModeType` is read but never
assigned, so mobile scaling silently does nothing — that's usually why
the export "looks broken on mobile."

**Format B — InDesign "Publish Online"-style export** (seen with the
"Ad Augusta" files): `index.html` is a thin iframe shell
(`publication-web-resources/script/main.js` swaps
`publication-N.html` into an iframe). Each `publication-N.html` is
normally a **two-page spread** (`publication.html` alone = page 1 /
cover, then `publication-1.html` = pages 2–3, `publication-2.html` =
pages 4–5, etc. — file N holds printed pages `2N` and `2N+1`). Real
text lives in `<span>` elements (not images!), positioned via a virtual
high-res coordinate space that gets scaled down (`transform:
scale(0.05)` is typical) — reading order in the DOM is already correct,
you don't need to fight it. Per-element position/size and font metrics
(`font-size`, `color`, `font-family`) live in one big generated
stylesheet, `css/idGeneratedStyles.css`, keyed by unique `#_idContainerNNN`
ids that do NOT repeat across pages (safe to build one global id→rule
map). Referenced fonts (e.g. Constantia, Minion Pro) are almost always
**not actually included** in the export (`font/` folder present but
empty) — pick close Google Fonts substitutes, don't block on it.

If you hit a third shape, extend this playbook with what you learned
rather than improvising from scratch next time.

## 2. Extraction script (Format B — write this fresh each time, paths differ)

Use Python + BeautifulSoup (`py -3`, not `python` — this machine's
default `python` resolves to a stale Python 2.7). Steps:

1. Regex-parse `idGeneratedStyles.css` once into two lookup dicts:
   - `#_idContainerNNN { left, top, width, height }` → position/size.
   - `span.CharOverride-N { font-size, font-family, font-weight,
     font-style, color, text-transform }` → text styling.
2. For each target `publication*.html` file, `find_all(id=re.compile(r'^_idContainer\d+$'))`
   in document order. For each container:
   - If it has a direct `<img>` child: record `src` (or flag
     `inline_data_uri: true` if it's a `data:` URI — see Step 3 on what
     to do with those), `alt`, and the `href` of any wrapping `<a>`.
   - If it has class `Basic-Text-Frame`: find the inner wrapper div with
     the `scale(...)` transform, read the scale factor, then for each
     `<p>` join its `<span>` texts (they already include the right
     inter-word spacing) and multiply the representative span's
     `font-size` by the scale factor to get the real on-page pt size —
     that size is your signal for headline vs. deck vs. body vs. caption
     when you write the semantic HTML later.
3. Dump both a machine-readable JSON and a human-readable `page → items`
   text summary. Read the text summary yourself before writing any HTML —
   don't skim, the real headline/body text is only fully there if you
   print the *untruncated* paragraph text (truncating to ~90 chars for
   a quick look is fine for a first pass, but re-dump full text before
   actually authoring copy).

## 3. Decide what to do with `data:` (inline base64) images

Don't assume every inline image is meaningful content. In practice most
of them are one of:
- **Invisible click-hotspot overlays** — a small transparent/blank PNG
  reused verbatim across many pages, each instance wrapped in a
  different `<a href>`. Confirm by rendering the file at ~200px and
  looking at it (`PIL.Image.open(...).thumbnail(...)`) — if it's blank,
  it's a hotspot, not content. Don't reproduce it; just make the real
  visual element (the ad image, a headline, etc.) the clickable link,
  or turn the href into a plain CTA text link.
- **Decorative gradient/vignette washes** (soft radial shadow behind a
  headline, a thin rule/divider). Same test — render small, eyeball it.
  Skip and approximate with a CSS box-shadow/border/gradient instead if
  it's worth keeping visually.
- **Actually meaningful graphics** (a diagram, a floor plan, a real
  photo that happens to be embedded as base64 rather than linked). These
  are rarer. If you can't tell from a thumbnail, it's meaningful — keep
  it, but note the base64 data itself usually isn't worth persisting
  into your extraction JSON (it bloats the file); just flag its presence
  and re-open the source HTML directly when you get to writing that
  section.

## 4. Cross-check against the flat plan PDF (if provided)

`fitz`/PyMuPDF is available in this environment (`import fitz`) —
`pdfplumber` too. `pdftoppm`/poppler is generally NOT installed, so the
`Read` tool's built-in PDF page rendering will fail; render manually:

```python
import fitz
doc = fitz.open(path)
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))  # upscale for legibility
pix.save('planner_full.png')
```

A flat plan is often one giant single page (a grid of thumbnail boxes,
not reading-order text) — `page.get_text()` alone comes out jumbled.
Crop the rendered PNG into tiles (e.g. a 3×2 grid with Pillow) and read
each tile as an image instead of trusting raw extracted text order. Cross-
reference page numbers, section names and owner initials against what
you extracted from the HTML in Step 2 — the flat plan wins on
authoritative section titles/order; the HTML export wins on actual
drafted copy.

## 5. Verify every image path before writing HTML

File names routinely contain spaces, commas, and inconsistent casing
(`Pg_16_gate_Tim,_Norma_and_Grant_IMG_9273.jpg` vs. `..._92731.jpg` —
easy to eyeball as duplicates when they're not). Before writing `<img>`
tags, glob/`ls` the image folder and check every filename you're about
to reference actually exists, exactly as spelled. Don't URL-encode
spaces/commas manually — plain relative paths with literal spaces/commas
work fine in `src` attributes.

## 6. Design system (CSS) — reusable almost as-is

Core decisions that worked well and are worth keeping as the default
starting point:

- Fluid type scale entirely via `clamp()` custom properties
  (`--fs-h1`...`--fs-small`, `--gap`, `--pad-x`, `--pad-y`) — no
  breakpoint-specific font-size overrides needed elsewhere.
- Two Google Fonts: one serif for headlines/body (Lora worked as a
  Minion Pro/Constantia stand-in), one sans for UI chrome/meta
  (Inter). Swap the serif per magazine's actual brand feel, keep the
  sans for nav/captions/labels.
- One `<section>`/`<article class="spread">` per printed spread (not
  per single page) — matches how these exports are actually paginated
  and keeps the desktop slider page count sane.
- **Desktop**: flex `main` with `overflow-x: auto`, `scroll-snap-type: x
  mandatory`, each `.spread` is `flex: 0 0 100%` with its own
  `overflow-y: auto`. Hide the horizontal scrollbar visually
  (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`)
  while keeping it fully scrollable by wheel/trackpad/buttons/keyboard.
- **Mobile**: normal vertical document flow, no special container.
- **Navigation, unified**: one floating bottom-center pill
  (`.mobile-pager`, kept visible on *all* breakpoints, not just mobile)
  showing current page number + name, expandable into a full jump list.
  Prev/next arrow buttons sit inside that same floating pill (flanking
  the toggle button), styled identically to it (dark navy circle, gold
  border) rather than as separate edge-of-screen arrows — reads as one
  coherent control instead of two different UI languages.
- **Page-to-page navigation always resets scroll to the top of the
  target page** — implement this inside the shared `goTo(i)` function
  (reset `slides[i].scrollTop = 0` before/while scrolling on desktop;
  on mobile the window-scroll target is already the slide's top) so it
  applies uniformly to button clicks, keyboard arrows, TOC links, *and*
  raw trackpad/swipe scroll-snap settling (debounce a `scroll` listener
  on `main` to catch that last case).
- **Performance**: `loading="lazy" decoding="async"` on every `<img>`
  except the very first one in document order (keep the above-the-fold
  cover image/crest eager). This alone is worth doing by default on any
  export beyond ~10–15 pages — these exports routinely ship print-
  resolution images (1–2MB PNGs are common). Actual image
  compression/resizing is a separate pass — flag it as a follow-up
  rather than doing it inline unless asked.

## 7. HTML content rules

- Use the *real* extracted text. Never invent body copy. If an article's
  body genuinely isn't drafted yet in the source (flat plan says
  "(report)" or similar but the HTML only has a title + one intro
  paragraph), say so on the page with a small `.tbc` badge and a short
  note — don't pad it out with invented paragraphs.
- Never remove/strip trial watermarks (e.g. in5 "demo" watermark baked
  into images) unless the user has explicitly said the export is a
  licensed/paid one. If a watermark is present, it's fine to build the
  responsive rebuild around it as a POC — just don't write code whose
  purpose is defeating the watermark.
- Table of contents: link only the entries that fall inside the page
  range actually built; grey out / mark `.unavailable` everything else,
  with a one-line note explaining why (this preview only covers pages
  X–Y).
- Skip decorative-only images identified in Step 3; keep every photo
  that's actual editorial content, with real (not generic) `alt` text
  where the export provided AI-generated alt descriptions.
- Build every multi-photo group (even a single photo) as
  `.photo-grid > .photo-grid-wrap` + sibling `.photo-caption` — a
  two-level CSS Grid component, not a flat structure. `.photo-grid-wrap`
  auto-sizes columns to match photo count (`:has()` selectors per N from
  2-8, `@media (min-width:640px)`), with named classes
  (`grid-A-B`, `custom-R-row-C-col` using `grid-template-areas`, and a
  5-photo "hero + 4 supporting" family — `custom-5-feature-left/top/right`
  — pick whichever variant puts the strongest photo where it actually
  sits in the DOM) for hand-designed mosaics when auto-columns don't read
  well. Use `minmax(0,1fr)` (not bare `1fr`) for any custom-area tracks —
  plain `1fr` carries an implicit content-based minimum that can force
  the grid taller than an intended `aspect-ratio`. Full detail (exact
  CSS) in the `photo-grid-system` memory. Flexbox was tried once for
  this and reverted (default `align-items:stretch` distorted images) —
  start from Grid, don't reach for flex.
  **Numbered photo badges** (a small corner badge per photo, for captions
  that reference them "1) ... 2) ...") were built, then **explicitly
  removed sitewide on 2026-10-08** ("não precisamos deles mais") — do
  NOT build this feature by default on a new issue; only add it if asked.
- Heading hierarchy per page: exactly one real `<h1>` (the lead headline
  in `.article-head`); every other in-page sub-topic is
  `<h2 class="contents-title">`; a sub-topic with a genuinely different
  kicker/category (not just a sub-headline under the same topic) gets an
  `<h3 class="page-kicker">` directly above its `<h2>`. Promote a
  paragraph's bold lead-in (`<p><b>Topic.</b> text...`) to a real `<h3>`
  once the same page uses real headings for its other subsections —
  don't leave it as inline bold text inconsistently.
- A "wall of names" separated by commas (donor lists, sponsor lists)
  should be a multi-column `<ul>` (one `<li>` per name, `columns:2/3/4`
  at breakpoints, split on ", " but keep "&"-joined pairs as one entry),
  not flowing prose paragraphs.

## 8. JS — mostly copy-paste, two files

- `slider.js`: desktop scroll-snap controller + mobile vertical-scroll
  controller sharing one `goTo(i)`/`currentIndex()` pair, gated by a
  `matchMedia('(min-width: 900px)')` check. Delegate the `a[href^="#"]`
  click handler on `document` (not bound at load time to a static
  `querySelectorAll`) — the pager's jump-list links are created
  dynamically by `mobile-pager.js` *after* this script runs, so a
  delegated listener is the only way both scripts' links work.
- `mobile-pager.js`: hardcoded `PAGES` array (`id` + human title) is the
  only thing that changes per magazine — keep the rest of the file as
  the template. Builds the jump list and open/close for the sheet.
  **Track the active section via scroll position, not
  `IntersectionObserver`**: on a rAF-throttled scroll listener, find the
  last section whose `getBoundingClientRect().top <= REF_Y` (~120px,
  just below the sticky header) and mark that one active. An earlier
  version used `IntersectionObserver` with a fixed `threshold` array and
  picked whichever section had the highest ratio in that callback's
  `entries` — this silently stops updating while scrolling through any
  section much taller than the viewport (common — photo-heavy pages run
  2-3+ screen heights), because the ratio can drift for a long time
  without crossing one of the exact threshold values, so the callback
  never fires. The scroll-position approach is height-agnostic and can't
  get stuck.
- Desktop header nav gets a live centered category label
  (`#headerCategory`, absolutely centered in `.header-wrapper` at
  ≥900px, hidden below it) that mirrors the current slide's
  `.page-kicker` textContent on the same scroll/resize listener that
  drives active-link tracking — build this by default alongside the nav
  itself, not just when asked. Flank it with prev/next page buttons
  (`#headerPrevPage`/`#headerNextPage`, inside a `.header-category-group`
  that carries the centering instead of the bare label) that reuse
  `slider.js`'s existing `goTo(currentIndex() ± 1)` — draw the arrows as
  solid CSS triangles via a `::before` border-trick with `currentColor`,
  not a Unicode ‹/› glyph (renders thin/open in most fonts). Dim the
  "previous" button with `.is-disabled{opacity:.3;pointer-events:none}`
  on the cover page (both this one and the floating pager's own prev
  button). Pair the category label with a mobile/tablet scroll-hide
  header (<900px): `.site-header` gets `.header-hidden { transform:
  translateY(-100%) }`, toggled on a rAF-throttled scroll listener —
  hide past 300px scrolled down, show immediately on any scroll up.
  Full detail in the `desktop-header-nav-pattern` memory.
- Floating pager (`.mobile-pager`) visibility is **breakpoint-asymmetric
  by design, not shared logic**: always fixed/visible on mobile
  (`transform:translate(-50%,0); transition:none;` — several attempts at
  a mobile hide/reveal behavior were all explicitly reverted, don't
  rebuild one unless asked again); hidden by default on desktop, sliding
  up (`.near-end{transform:translate(-50%,0)}`) once scrolled near the
  bottom of the ACTIVE `.spread` specifically — which on desktop needs
  its own scroll listener re-attached to whichever `.spread` is current,
  since neither `window` nor `main`'s own scroll event reflects vertical
  scroll within the current page there. **Watch for a sign-inversion
  bug**: a page whose content exactly fits its box with no real overflow
  (e.g. the cover) has `scrollHeight===clientHeight`, so a naive
  "distance to bottom" calc is always ~0 — treat that case as **always
  show** (nothing to hide the bar during), not always hide, or page
  navigation breaks entirely on that page. Full detail in
  `desktop-header-nav-pattern` items 10-11.

## 9. Testing loop

Serve locally and sanity-check every new/changed file with a `curl`
status check before telling the user it's ready:

```
py -3 -m http.server 8080     # run in the project root, background
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/magazine.html
```

`node --check file.js` after every JS edit. If the background server
gets killed by the environment between turns (happens — not a user
action), just restart it silently and re-verify; don't make it the
user's problem.

## 10. Working style notes

- The user iterates in short, specific feedback turns after actually
  opening the local preview — expect "not quite, do X" follow-ups
  rather than a full spec up front. Implement the literal ask, don't
  over-build speculative extra features.
- Conversation is in Portuguese; code, comments (sparingly), and this
  kind of playbook doc are in English.
- When scope is "first N pages", stop exactly there — don't extend into
  neighboring content even if it's clearly part of the same article
  (e.g. an article spanning pages 14–17 when the cutoff is page 19 is
  fine to finish; one that starts at page 18 and would run past the
  requested range should not be started).

## 11. Consolidating spreads into fewer sections (expect this repeatedly)

Once a full issue is built, expect repeated requests to merge spreads
that were originally one-story-per-page into fewer, denser sections —
this happened many times across one issue, not as a single one-off ask.
Full step-by-step in the `page-consolidation-procedure` memory; the
short version:

- **Content merge**: for the page being absorbed, drop its
  `.page-kicker`/`.article-head` if the kicker matches the target page's
  (convert `<h1>` → `<h2 class="contents-title">`, keep `.deck`, prepend
  `<hr>`); if the kicker is genuinely different, keep it as
  `<h3 class="page-kicker">` above the new `<h2>`. Never leave more than
  one real `<h1>` per page. Do each boundary as one edit spanning from
  the target's last content through the absorbed page's opening
  tags+kicker+heading — the absorbed page's own closing tags become the
  target's closing tags, leave them alone.
- **Renumbering**: remove the merged-away page from `.toc-nav`, the
  curated `.toc-list`/`.toc-featured`, and `mobile-pager.js`'s `PAGES`
  array. Fix any cross-reference pointing at the merged-away page's
  specific old id (e.g. a cover teaser link) to the target's *new* id as
  a special case — it doesn't follow the generic shift. Then renumber
  everything after the merge point in **one atomic regex pass**
  (`re.sub` with a `shift(n)` function computed from the original
  matched number — never sequential/chained renames, which
  double-renumber on collision) covering: `page-(\d{2})` ids/hrefs,
  `<span class="num">(\d{2})</span` badges (match only up to `</span`,
  not the full closing tag — this file's prettier-style formatting often
  breaks it across two lines as `</span\n>`, and an exact-match regex
  silently skips those, leaving stale badges), `PAGE (\d{2}) —` section
  comments, and `>Page (\d{1,2})<` visible references.
- **Verify every time**: sequential ids with no gaps, zero broken links,
  zero missing images, `node --check` + sequential pager array, zero
  `href` vs `<span class="num">` mismatches (audit by capturing each
  anchor's full contents and searching inside it — a fixed
  character-gap heuristic misses cases where an `<img>` sits between the
  href and the badge), and exactly one `<h1>` per merged page.

## 12. "List of related sub-topics" pages get a dedicated nav component

A page that's really a list of several short, same-weight items (16
Old Boys' profiles, 6 sports, 6 academia items...) should NOT be a plain
stack of `.article-columns` sections separated by `<hr>` — give it the
sticky-nav + content-item component instead: a left/top nav of anchor
links (sticky on desktop, horizontal-scroll strip on mobile) next to a
`.{type}-content` column of `.{type}-item` divs (image moved to the END
of each item, after its text). One accent color per page via
`article.{type} h2,h3,.page-kicker { color:#hex!important; }`. Built
first for Sport, then copied to Academia/Arts/Events — full HTML/CSS
spec, the shared `sport-nav.js` scrollspy (name is historical, it drives
every type now), and two real bugs (a mobile scroll-feedback loop from
calling `scrollIntoView()` inside a scroll handler, and a mobile
hero-panel white-text fix) are all in the `sticky-section-nav-pattern`
memory — copy that component, don't re-derive it.

## 13. Auditing an existing page that "feels off" with no specific complaint

When asked to improve a page's layout with a vague complaint ("tá
estranho"), grep for these recurring structural bugs before proposing
anything cosmetic — all have shown up more than once across this issue:

- A second sub-story nested inside the FIRST sub-story's `.article-text`
  instead of getting its own sibling `.article-columns` — its photo ends
  up stranded far from its own text, with a dead gap in the shared image
  column once the first story's shorter photo stack ends.
- A bare `<img>` sitting outside `.photo-grid > .photo-grid-wrap`.
- A `.masthead-grid` (2-column grid) with only ONE child — leaves an
  entire empty column on desktop. Drop the class (or add a real second
  child) when there's genuinely only one piece of content.
- On a page listing several short profiles, a heading rendering at a
  different size purely because it happens to be paired 2-up in a
  `.masthead-grid` rather than standalone — every item on such a page
  should share the same heading size regardless of 1-up/2-up layout.
- An `<hr>` missing between two items that are paired inside the same
  `.masthead-grid` row (every OTHER sequential item on the page gets an
  `<hr>` between it and its neighbor, but a 2-column grid pair doesn't,
  since inserting an `<hr>` as a 3rd grid child scatters it into the
  wrong cell). Fix by dropping the 2-column pairing for that pair —
  stack them as two plain sequential full-width items like all the
  others, with a normal `<hr>` between them.
- For a long single-narrative page (not a list — e.g. a ~25-paragraph
  feature story) with a short photo gallery stuck at the top of the
  25%-width `.article-images` column: `position:sticky` scoped to that
  one page id (`#page-NN .article-images {position:sticky;top:20px;}`
  inside `min-width:900px`) rather than enabling the sitewide (and
  deliberately commented-out) version. Do NOT also add pull-quotes that
  just repeat existing body text as a "break up the wall of text" trick
  — this was tried and explicitly rejected even when the quotes were
  verbatim and correctly attributed; only add pull-quotes if asked for
  specifically.

## 14. Low-contrast inline border/divider on a themed section's background

If an `<hr>` or border uses an inline `style="border-top:1px solid
var(--TOKEN)"` and effectively reads as "missing" on one particular
section's background (but is fine everywhere else), check the actual
contrast ratio before assuming the element is missing from the DOM —
happened twice (a table border, then every `<hr>` across 8 "Old Boys'"
pages, both against the same pale `#d0dfe0` background using the
default `--navy-light:#C3C3C3`, contrast ratio ~1.3). Fix by
**redefining the CSS custom property scoped to that section's class**
(`.spread.old-boys { --navy-light: var(--muted); }`) — this fixes every
inline `var(--navy-light)` usage inside that scope at once, without
touching the token anywhere else on the site or hunting down each
individual inline occurrence.

## 15. Desktop body-flex architecture trap

At `min-width:900px`, `body` becomes `display:flex;flex-direction:
column;overflow:hidden`, with `main` (the horizontal page slider) as
the ONLY scrollable region. `.site-header` and the floating pager
escape this by being `position:fixed` (removed from flow). Any OTHER
direct child added as a sibling after `</main>` that is NOT
`position:fixed` permanently reserves its own height inside that flex
column and renders pinned behind/below every single page — it does NOT
behave like normal end-of-document content the way it would on a plain
scrolling page, even though nothing about it looks "fixed" in the CSS.
If a request wants one element to appear only at the true end of the
whole site (the last page), nest it inside that LAST page's own content
instead of adding it as a sibling after `</main>`.

## 16. `.hero-split` row height must be fixed in CSS, not patched per page

`.hero-photo` switches to `aspect-ratio: auto` inside `.hero-split` at
`min-width:900px`, so with `align-items:stretch` on the grid, each hero
page's row height is set by that specific photo's own natural aspect
ratio — two hero pages end up visibly different heights even though the
CSS is identical, purely because the source photos are shaped
differently. Don't patch this one page at a time with an inline
`style="min-height: 400px"` on `.hero-split` — that's what happened on
both May and November's issues, and in both cases only a handful of
pages got marked, leaving the rest inconsistent. Put the `min-height`
directly on the shared `.hero-split` rule inside the
`@media (min-width:900px)` block so every hero page gets it, and don't
leave inline overrides lying around once that's done.

## 17. Swapping in a later externally-compressed image batch

A compression pass sometimes arrives after the main build, as a staging
folder (seen so far as `compressed-imgs/`, and earlier as a
`Microsite JPEGs/` folder) dropped straight into
`publication-web-resources/image/`. Match each staged file to its real
destination by **normalized filename** (lowercase, strip everything but
letters and digits) rather than assuming identical spelling — the
external batch's names are typically close but not exact: hyphens where
the project uses underscores, a stray trailing "-1" de-dup digit the
destination doesn't have, or a long filename truncated differently on
each side from OS path-length limits. Build the match with cascading
strategies — exact normalized match, then strip-trailing-digit loose
match, then long-name prefix match for the truncated cases — and print
the full mapping for a sanity check before touching any file. Resolve
anything still ambiguous by hand (a different file extension on the
destination, e.g. `.png` vs the new batch's `.jpg`; or a photo with no
existing counterpart at all) — ask the user rather than guessing where
an unmatched new image belongs.

Since this site's HTML only ever references the `.webp` in `src=`
(the `.jpg`/`.png` sitting next to it is backing/archival, never linked
directly), a same-basename extension change on the source side needs
**no HTML edit at all** — delete the old source file, write the new
one, and regenerate that single `.webp`. No cwebp/ImageMagick/PIL is
available on this machine; install `sharp` as a throwaway dependency in
the scratchpad directory (`npm init -y && npm install sharp`, then
`require()` it by absolute path) — never inside the project itself.
Clean up the staging folder's consumed files once done.

## 18. Table-of-contents nav column categorization

The desktop header's `.toc-nav` groups pages into labeled columns
(e.g. "Lead Stories" / "Departments" / "Events & Giving" / "Old Boys'
Association" on the November issue). "Lead Stories" means genuine
narrative FEATURE articles only — editorial/opinion pieces, the
headline human-interest stories (Contents, Headmaster's reflections,
Board report, and similar). Recurring whole-of-school content
categories that are also major sections — Academia, Extracurricular,
Arts and Culture, Sport, Student Stories — are NOT lead stories even
though they're prominent, and belong in "Departments" alongside the
organizational departments instead. Get this split right on the first
build of a new issue's nav rather than defaulting every section into
the first column.
