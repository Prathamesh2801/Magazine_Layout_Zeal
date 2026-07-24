# Maxter Today — Magazine Cover Studio

A responsive, tablet-friendly magazine-cover composer. Snap or upload a photo,
auto-remove its background, then drag & resize the subject and the headline over
a layered magazine template and export a full-resolution PNG.

Built with **React 19 + Vite + JSX + Tailwind CSS v4**, using `createHashRouter`.

## Flow

1. **Upload** (`/`) — take a photo (camera) or upload one, preview it, and enter
   the cover name. Submitting calls the background-removal API.
2. **Compose** (`/editor`) — four layered elements you can arrange:
   1. background (`bg.png`)
   2. person (background-removed) — draggable & resizable
   3. name text — draggable & resizable, with color options
   4. overlay frame (`overlay.png`) — always on top
3. **Export** (`/result`) — the layers are composited to a 1500 × 2100 canvas and
   offered as a PNG download.

## Background-removal API

The endpoint lives in a single outward config file, `src/config.js`:

```js
export const BG_REMOVER_URL = 'http://192.168.1.88:8004/remove-bg'
```

`src/services/removeBg.js` posts the image (multipart, field name `image`) with
axios and expects an image blob back. To point at a different host, change only
`BG_REMOVER_URL`.

## Scripts

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

## Architecture

```
src/
  main.jsx                    RouterProvider + MagazineProvider
  router.jsx                  createHashRouter (AppLayout + 3 routes)
  config.js                   external endpoints (BG_REMOVER_URL)
  context/MagazineContext.jsx shared state across routes (useReducer)
  services/removeBg.js        background-removal API (axios)
  hooks · utils/
    compose.js                canvas compositing for export
    image.js                  file/image helpers
    constants.js              cover dimensions, defaults, palette
  components/
    MagazineCanvas.jsx        the 4-layer composition (interactive/static)
    MovableLayer.jsx          reusable drag + resize (Pointer Events → touch)
    ImageUploader.jsx         camera + file inputs
    ui/                       Button, Card, Spinner
    layout/                   AppLayout, Stepper
  pages/                      UploadPage, EditorPage, ResultPage
```

All layer transforms are stored as **normalised fractions (0–1)** of the cover,
so the on-screen editor maps exactly to the exported artwork at any screen size.
Text scales via CSS container-query units (`cqw`) for perfect responsiveness.
