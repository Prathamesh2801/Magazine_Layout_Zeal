# Maxter Today — Magazine Cover Studio

A responsive, tablet-friendly magazine-cover composer. Snap or upload a photo,
optionally auto-remove its background, then drag & resize the subject and the
headline over a layered magazine template, export a full-resolution PNG — and
watch every finished cover land on a live display wall.

Built with **React 19 + Vite + JSX + Tailwind CSS v4**, using `createHashRouter`.

## Flow

1. **Upload** (`/`) — take a photo (camera) or upload one, preview it, and enter
   the cover name. Submitting runs the background-removal step.
2. **Compose** (`/editor`) — the layered elements you can arrange:
   1. background (`bg.jpeg`)
   2. person (background-removed) — draggable & resizable
   3. name text — draggable & resizable, with font, letter-case and colour
      options *(only when `TEXT_ENABLED`)*
   4. overlay frame (`overlay.png`) — always on top

   *Generate cover* composites the layers to a full-resolution PNG and uploads it
   to the gallery API. The upload is best-effort — it never blocks the next step.
3. **Export** (`/result`) — download the PNG, or copy the gallery link.
4. **Display wall** (`/tv`) — a standalone, chrome-free screen that listens to
   the live feed, shows each new cover the moment it is saved, and cycles the
   previous ones in between *(only when `TV_ENABLED`)*.

## Configuration

Every external endpoint and tunable lives in one file, [`src/config.js`](src/config.js):

```js
export const BASE_URL = 'http://192.168.1.3'   // the only host you normally change

export const BG_REMOVAL_ENABLED = true         // skip the remover while it is down
export const TEXT_ENABLED = false              // headline / cover name on or off
export const TV_ENABLED = false                // the /tv display wall on or off

export const IMAGE_API_URL = `${BASE_URL}/Ministack/Birthday/API/api.php`
export const SSE_URL       = `${BASE_URL}/Ministack/Birthday/API/sse.php`

export const TV_REEL_LIMIT = 20                // covers the wall remembers
export const TV_SLIDE_MS = 7000                // dwell time per cover
export const TV_TRANSITION_MS = 900            // must match the CSS slide animations
```

### Endpoints

| Service | Endpoint | Shape |
| --- | --- | --- |
| Background removal | `${BASE_URL}:8004/remove-bg` | POST multipart, field `image` → image blob |
| Cover upload | `IMAGE_API_URL` | POST multipart → `{ Status, Message, Image_Path, Download_Image }` |
| Live feed | `SSE_URL` | SSE frames, `{ Status: "Play", Play, Download, … }` |

### Feature flags

Three switches turn whole features on and off. Flip one and reload — no rebuild,
no code changes anywhere else. Each has two supported branches, so the app is
fully usable either way.

| Flag | What `false` does |
| --- | --- |
| `BG_REMOVAL_ENABLED` | Skips the remover: the original photo passes straight through to the editor. Use it whenever the self-hosted service is down. |
| `TEXT_ENABLED` | Removes the headline end to end — no name field, no font/case/colour controls, no text on the exported cover. For artwork that carries its own typography. |
| `TV_ENABLED` | Un-registers `/tv` entirely, so nothing opens a connection to the live feed. The studio flow is unaffected. |

`TEXT_ENABLED` and `TV_ENABLED` currently ship **off**.

## Scripts

```bash
npm install
npm run dev      # start dev server (exposed on the LAN for tablets)
npm run build    # production build — postbuild zips it into dist.zip
npm run lint     # eslint
npm run preview  # serve the built bundle
```

## Architecture

```
src/
  main.jsx                    RouterProvider + MagazineProvider
  router.jsx                  createHashRouter (AppLayout + 3 routes, /tv standalone)
  config.js                   external endpoints and tunables
  context/MagazineContext.jsx shared state across routes (useReducer)
  services/
    apiOrigin.js              rewrites the API's internal-host links to a reachable origin
    removeBg.js               background-removal API (axios)
    uploadImage.js            cover upload to the gallery API (axios)
    coverStream.js            SSE client for the live cover feed
  hooks/useCoverReel.js       the /tv reel — accumulated from the stream, kept in localStorage
  utils/
    compose.js                canvas compositing for export
    coverFont.js              cover fonts + letter-case, shared by both renderers
    constants.js              cover dimensions, defaults, palette
    image.js · filename.js    file/image helpers, shared export filename
  components/
    MagazineCanvas.jsx        the 4-layer composition (interactive/static)
    MovableLayer.jsx          reusable drag + resize (Pointer Events → touch)
    ImageUploader.jsx         camera + file inputs
    ui/                       Button, Card, Spinner
    layout/                   AppLayout, Stepper
  pages/                      UploadPage, EditorPage, ResultPage, TvPage
```

All layer transforms are stored as **normalised fractions (0–1)** of the cover,
so the on-screen editor maps exactly to the exported artwork at any screen size.
Text scales via CSS container-query units (`cqw`) for perfect responsiveness, and
the export scale is derived from the subject's native resolution so a DSLR
original is never downsampled.

## Re-skinning for a new event

This project is reused per event. See [CLAUDE.md](CLAUDE.md) for the full guide —
in short: `BASE_URL` in `config.js`, the two images in `src/assets/`, the font
registry in `src/utils/coverFont.js`, the defaults in `src/utils/constants.js`,
and the `@theme` colour tokens in `src/index.css`.
