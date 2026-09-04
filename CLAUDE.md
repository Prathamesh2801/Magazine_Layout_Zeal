# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

**Maxter Today — Magazine Cover Studio.** A tablet-friendly web app that
composes a magazine cover from a photo: snap/upload a picture, optionally remove
its background, drag & resize the subject and the headline over a layered
template, export a full-resolution PNG, upload it to a gallery API — and show
every generated cover on an unattended display wall (`/tv`) fed by SSE.

**This is a recurring, reusable project.** The same codebase is re-skinned per
event (different artwork, different fonts, different LAN host) and whole
features are switched on and off from [config.js](src/config.js) — the headline
text and the display wall are both **currently disabled**. Everything that
changes between events is deliberately isolated in a handful of files — see
[Re-skinning for a new event](#re-skinning-for-a-new-event). Treat that
separation as a constraint: when adding a feature, put its knobs where the
existing knobs live, never inline a magic number in a component.

Stack: **React 19 + Vite 8 + Tailwind CSS v4 + react-router-dom v7
(`createHashRouter`)**. Plain JSX, no TypeScript. axios for HTTP,
react-hot-toast for feedback, react-icons for iconography.

## Commands

```bash
npm install
npm run dev      # vite dev server, host: true (reachable on the LAN — needed for tablets)
npm run build    # production build; postbuild zips dist/ into dist.zip
npm run lint     # eslint
npm run preview  # serve the built bundle
```

There is no test suite. Verify changes by running the app.

## Architecture

```
src/
  main.jsx                    RouterProvider wrapped in MagazineProvider
  router.jsx                  createHashRouter — 3 studio routes under AppLayout + /tv outside it
  config.js                   ALL external endpoints & tunables (BASE_URL, flags, TV timings)
  index.css                   Tailwind v4 @theme tokens + the /tv keyframes
  context/MagazineContext.jsx useReducer store shared across the studio routes
  services/
    apiOrigin.js              API_ORIGIN + toReachableUrl() — rewrites internal-host links
    removeBg.js               background remover (honours BG_REMOVAL_ENABLED)
    uploadImage.js            POST the exported PNG to the MiniStack gallery API
    coverStream.js            SSE client + frame parser for the live feed
  hooks/useCoverReel.js       accumulates the SSE covers into a localStorage-backed reel
  utils/
    constants.js              cover dimensions, routes, default layout, text palette
    coverFont.js              font registry, letter-case modes, FontFace loading
    compose.js                canvas compositing for the export
    image.js                  file/blob/image helpers
    filename.js               shared slug for download + upload
  components/
    MagazineCanvas.jsx        the 4-layer composition (interactive or static)
    MovableLayer.jsx          reusable drag + resize via Pointer Events
    ImageUploader.jsx         camera + file inputs
    ui/                       Button, Card, Spinner
    layout/                   AppLayout (header/Toaster/footer), Stepper
  pages/                      UploadPage, EditorPage, ResultPage, TvPage
  assets/                     bg.jpeg, overlay.png, fonts/ (OLD/ holds the previous event's art)
```

### The two flows

**Studio** (`/`, `/editor`, `/result` — inside `AppLayout`):

1. **Upload** — pick a photo, plus the cover name when `TEXT_ENABLED`.
   Submitting runs `removeBackground()`, stores the result as the `person`
   layer, and navigates.
2. **Editor** — the stacked layers; the person (and the text, when enabled) are
   draggable and resizable. "Generate cover" composites locally, then uploads
   the PNG best-effort and always lands on `/result`.
3. **Result** — preview, download the PNG, copy the gallery link, or start over.

**Display wall** (`/tv` — deliberately outside `AppLayout`, no app chrome, and
only routed when `TV_ENABLED`): subscribes to the SSE feed, promotes each newly
arrived cover to the screen immediately, and otherwise cycles the back catalogue
with a paired slide-in/slide-out transition.

### Layer model — the core invariant

The cover is **1500 × 2100 (5:7)**. Four layers, back to front:

1. background (`assets/bg.jpeg`)
2. person (background-removed) — movable
3. name text — movable; **omitted entirely unless `TEXT_ENABLED`**
4. overlay frame (`assets/overlay.png`) — always on top, non-interactive

**Every layer transform is a normalised fraction (0..1) of the cover**, stored in
`layout` in the context. `x`/`y` are the layer's *centre* point; `width` (person)
and `fontScale` (text) are fractions of the cover *width*. This is what makes the
DOM editor and the canvas export agree at any screen size. Two renderers consume
the same `layout`:

- [components/MagazineCanvas.jsx](src/components/MagazineCanvas.jsx) — DOM
  preview; text scales with `cqw` (container query units) against
  `containerType: inline-size`.
- [utils/compose.js](src/utils/compose.js) — canvas export; `ctx.scale()` keeps
  all drawing maths in 1500 × 2100 space regardless of the chosen export scale.

**If you change how a layer is positioned, drawn, cased, or typeset, you must
change both renderers.** Anything they share belongs in
[utils/coverFont.js](src/utils/coverFont.js) (already true for the font stack and
the letter-case transform).

Export scale is derived from the subject's native resolution so a DSLR photo is
not downsampled, capped at `EXPORT_MAX_SCALE` (4 → up to 6000 × 8400 PNG).

### Backend contracts

All endpoints hang off `BASE_URL` in [config.js](src/config.js).

| Service | Endpoint | Shape |
| --- | --- | --- |
| Background removal | `${BASE_URL}:8004/remove-bg` | POST multipart, field `image` → image blob |
| Cover upload | `${BASE_URL}/Ministack/Birthday/API/api.php` | POST multipart → `{ Status, Message, Image_Path, Download_Image }` |
| Live feed | `${BASE_URL}/Ministack/Birthday/API/sse.php` | SSE, `{ Status:"Play", Play, Download, … }` |

Three things about these APIs shape the client and are easy to break:

- They echo links on their **own internal host** (`http://localhost:80/...`),
  unreachable from anywhere else. `toReachableUrl()` in
  [services/apiOrigin.js](src/services/apiOrigin.js) re-points them at the origin
  we actually reached. Every URL from these APIs must pass through it.
- The SSE stream is a **state feed, not an event log** — the same frame is
  re-sent as a keep-alive, so `useCoverReel` de-dupes on the uploaded filename.
- `Play` is the raw PNG and is what gets rendered; `Download` is `view.php`,
  which serves an HTML page — only ever usable as a link, never as an `<img>` src.

Both HTTP clients use `validateStatus: () => true` so error bodies can be read
and surfaced instead of throwing a generic axios error.

There is no "list covers" endpoint. The `/tv` history is accumulated client-side
from the stream and persisted in `localStorage` (`maxter.tv.reel.v1`) so a
rebooted display still has something to show.

## Re-skinning for a new event

This is the common task. In order of frequency:

1. **Host / endpoints** — `BASE_URL` in [config.js](src/config.js). Everything
   else derives from it. Never hardcode a URL elsewhere.
2. **Artwork** — replace [src/assets/bg.jpeg](src/assets/bg.jpeg) and
   [src/assets/overlay.png](src/assets/overlay.png) (keep them 5:7).
   [src/assets/OLD/](src/assets/OLD/) is the previous event's art; leave it be.
   If the new artwork is a different ratio, update `COVER_WIDTH`/`COVER_HEIGHT`
   in [utils/constants.js](src/utils/constants.js) — `COVER_RATIO` and the whole
   layout system follow automatically.
3. **Fonts** — drop the file in [src/assets/fonts/](src/assets/fonts/), add one
   entry to `COVER_FONTS` in [utils/coverFont.js](src/utils/coverFont.js), point
   `DEFAULT_COVER_FONT` at it. The editor's picker updates itself. `weightRange`
   must match what the file actually holds, or the browser skips synthetic
   bolding and the text renders lighter than asked.
4. **Default layout / palette** — `DEFAULT_PERSON`, `DEFAULT_TEXT`,
   `TEXT_COLORS` in [utils/constants.js](src/utils/constants.js).
5. **Theme** — the `@theme` block in [index.css](src/index.css). Semantic tokens
   (`paper`, `ink`, `clay`, `sage`, `stage`, `line`, `danger`) — components
   reference the token names, so recolouring is a one-block edit.
6. **Branding copy** — the header in
   [components/layout/AppLayout.jsx](src/components/layout/AppLayout.jsx) and the
   `<title>` in [index.html](index.html).
7. **TV pacing** — `TV_REEL_LIMIT`, `TV_SLIDE_MS`, `TV_TRANSITION_MS` in
   config.js. `TV_TRANSITION_MS` **must** match the `.tv-slide-in` /
   `.tv-slide-out` animation durations in index.css, or the outgoing frame is
   unmounted at the wrong moment.

### Feature flags

Three switches in [config.js](src/config.js) turn whole features on and off.
They are runtime constants, deliberately: an operator flips one and reloads, with
no rebuild-time coupling. **Every one of them has two live branches, and both
must keep working after any edit that touches them.**

| Flag | `false` behaviour |
| --- | --- |
| `BG_REMOVAL_ENABLED` | The self-hosted remover is often down. The original photo passes straight through to the editor; the upload page's copy and button change accordingly. |
| `TEXT_ENABLED` | The headline is gone end to end: no name field on upload (and no name validation), no Name tab or font/case/colour controls in the editor, no text layer in either renderer, and the export composites three layers instead of four. |
| `TV_ENABLED` | The `/tv` route is not registered at all, so `/#/tv` does not resolve and nothing ever opens an `EventSource`. The studio flow is untouched. |

When adding anything text-related, gate it on `TEXT_ENABLED` in **both**
renderers — `MagazineCanvas.jsx` and `compose.js` — or the preview and the
exported PNG will disagree, which is the one failure this architecture is built
to prevent.

Note that the flags do not shrink the bundle: `TvPage` and the ~1 MB of fonts are
static imports, so Vite still ships them when the features are off. That is the
accepted cost of flags an operator can flip without a rebuild.

## Conventions

- **Comments explain *why*, at length.** This codebase is unusually
  well-commented and the comments carry hard-won operational knowledge (why the
  reel appends instead of prepends, why letter case is applied to the string and
  not via CSS, why `/tv` sits outside `AppLayout`). Match that density and that
  register — write the reasoning, not a restatement of the code.
- **Config over constants over inline.** Anything an operator would change goes
  in `config.js`; anything a designer would change goes in `constants.js`,
  `coverFont.js`, or the `@theme` block. Nothing tunable is inlined in a
  component.
- **Tailwind utility classes only** — no CSS modules, no styled-components. The
  only hand-written CSS is the `@theme` tokens and the `/tv` keyframes.
- **Pointer Events, not mouse or touch events** — the app runs on tablets;
  `MovableLayer` handles mouse, touch and pen through one code path.
- **Failures are non-fatal wherever possible.** The upload never blocks the
  result page; a font that fails to load falls back to a serif; a cover deleted
  server-side is retired from the reel by its `onError`. Preserve that: when
  adding a network call, decide what still works when it fails.
- **`react-hot-toast` is the only feedback channel** — never `alert()`. Toast
  styling is centralised in `AppLayout`; use `toast.promise()` for async work.
- **Sizing on `/tv` is in `vmin`/`clamp()`**, so the same markup reads on a
  1080×1920 panel and in a laptop tab. Don't introduce fixed pixel sizes there.
- **JSX files use no semicolons; the `services/` files use them.** Follow the
  file you are editing.

## Gotchas

- `createHashRouter` — URLs carry a `#` (`/#/editor`, `/#/tv`). This is
  intentional: the build gets dropped onto a plain static host with no rewrite
  rules. Don't switch to `createBrowserRouter`.
- `EditorPage` and `ResultPage` guard on missing state and redirect to `/`. A
  hard refresh mid-flow loses everything — the context is in-memory by design.
- `setFinal` revokes the previous object URL before replacing it. Any new code
  creating object URLs owns revoking them.
- Canvas `fillText()` does **not** wait for a pending font —
  [utils/compose.js](src/utils/compose.js) awaits `ensureCoverFont()` before
  drawing. Keep that await.
- `TvPage` adjusts state during render (`setFollowedId`, `setStage`) so the wall
  never paints a stale cover for a frame. That is deliberate, supported React —
  don't "fix" it into an effect.
- `dist.zip` is a committed build artifact produced by the `postbuild` script.
