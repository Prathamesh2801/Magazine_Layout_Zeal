import { COVER_WIDTH, COVER_HEIGHT, EXPORT_MAX_SCALE } from './constants'
import {
  PRINT_EDGE_INSET,
  PRINT_FIT_ENABLED,
  PRINT_MARGIN,
  PRINT_RATIO_H,
  PRINT_RATIO_W,
  TEXT_ENABLED,
} from '../config'
import { loadImage } from './image'
import { applyTextCase, coverFontShorthand, ensureCoverFont } from './coverFont'

/*
  Composites the four layers to an off-screen canvas and returns a lossless
  PNG blob (plus an object URL). Layer order (back -> front):
    1. background (assets/bg.*)
    2. person (bg-removed)
    3. name text
    4. overlay frame (assets/overlay.png)

  Quality: the canvas is rendered at COVER_WIDTH * scale. The scale is derived
  from the subject's NATIVE resolution so a high-res DSLR photo is drawn at (or
  near) full pixel density instead of being downsampled to the cover's base
  width. All drawing stays in COVER_WIDTH x COVER_HEIGHT space via ctx.scale(),
  so the layout maths are unchanged whatever the export scale turns out to be.
  PNG output is lossless — no quality-degrading compression.

  Returns: { blob, url, printBlob, width, height, scale }

  `printBlob` is the same cover reshaped to the paper's ratio for the printer
  (PRINT_FIT_ENABLED) — null when it is off or already the right shape. It is a
  separate blob rather than a replacement because the two have different jobs:
  the cover is what the screen and the gallery want, the print file is what the
  guest walks away with.
*/
export async function composeCover({ bgSrc, personSrc, overlaySrc, layout }) {
  const [bg, overlay, person] = await Promise.all([
    loadImage(bgSrc),
    loadImage(overlaySrc),
    personSrc ? loadImage(personSrc) : Promise.resolve(null),
    // The name font must be decoded BEFORE fillText — canvas never waits.
    // Nothing to decode when the headline is off.
    TEXT_ENABLED ? ensureCoverFont(layout.text?.fontKey) : null,
  ])

  // Choose an export scale that preserves the subject's native detail.
  let scale = 1
  if (person) {
    const renderedWidthAt1x = layout.person.width * COVER_WIDTH // px at 1500-space
    if (renderedWidthAt1x > 0) {
      scale = person.naturalWidth / renderedWidthAt1x
    }
  }
  scale = clamp(Math.ceil(scale), 1, EXPORT_MAX_SCALE)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(COVER_WIDTH * scale)
  canvas.height = Math.round(COVER_HEIGHT * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(scale, scale) // draw everything in COVER_WIDTH x COVER_HEIGHT space

  // 1. Background
  ctx.drawImage(bg, 0, 0, COVER_WIDTH, COVER_HEIGHT)

  // 2. Person
  if (person) {
    const aspect = person.naturalWidth / person.naturalHeight || 1
    const w = layout.person.width * COVER_WIDTH
    const h = w / aspect
    const cx = layout.person.x * COVER_WIDTH
    const cy = layout.person.y * COVER_HEIGHT
    ctx.drawImage(person, cx - w / 2, cy - h / 2, w, h)
  }

  // 3. Name text — skipped entirely when the headline is switched off
  //    (TEXT_ENABLED, src/config.js), so the export matches the editor.
  const text = TEXT_ENABLED
    ? applyTextCase(layout.text?.content?.trim(), layout.text?.textCase)
    : null
  if (text) {
    const fontPx = layout.text.fontScale * COVER_WIDTH
    ctx.font = coverFontShorthand(layout.text?.fontKey, fontPx) // utils/coverFont.js
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tx = layout.text.x * COVER_WIDTH
    const ty = layout.text.y * COVER_HEIGHT

    // Legibility: soft shadow + subtle stroke.
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = fontPx * 0.12
    ctx.shadowOffsetY = fontPx * 0.04
    ctx.lineWidth = Math.max(2, fontPx * 0.03)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.strokeText(text, tx, ty)
    ctx.fillStyle = layout.text.color || '#ffffff'
    ctx.fillText(text, tx, ty)
    ctx.restore()
  }

  // 4. Overlay frame
  ctx.drawImage(overlay, 0, 0, COVER_WIDTH, COVER_HEIGHT)

  const blob = await canvasToBlob(canvas)
  return {
    blob,
    url: URL.createObjectURL(blob),
    printBlob: PRINT_FIT_ENABLED ? await fitForPrint(canvas) : null,
    width: canvas.width,
    height: canvas.height,
    scale,
  }
}

/*
  Put the whole cover on the printer's paper.

  The cover is cut to the display's ratio, the paper is not, and a printer
  reconciles that by cropping — which eats the logo band off the bottom of the
  print. So the cover is placed WHOLE on a canvas of the paper's ratio, centred,
  and the leftover is filled, leaving the printer nothing to decide.

  Only one axis is ever padded: whichever way the paper is proportionally
  roomier. Everything stays at the cover's native resolution — the canvas grows
  around the artwork rather than the artwork being rescaled into it — so nothing
  is resampled and the frame reaches paper at exactly the proportions the kiosk
  displayed it.

  The margin either continues the artwork's border outward or is a flat colour
  (PRINT_MARGIN). Two things about the extension are load-bearing, both learned
  from a print that came out wrong:

  · The colour is sampled PRINT_EDGE_INSET pixels in, not from the outermost
    column. This overlay's edge column is 92% transparent, so extending from x=0
    stretched background photo down the sides instead of the navy border.

  · The extension is drawn OVER the cover, not beside it, so it covers those
    soft edge columns as well as the margin. Painting it first and dropping the
    cover on top would leave the antialiased seam visible right where the two
    meet — a few pixels of half-transparent border blended with sky, which is
    exactly the artefact this is meant to remove.

  A single source column stretched across the margin reproduces a gradient
  border exactly, since the colour varies down the frame rather than across it.

  Returns null when the cover already matches the paper: there is nothing to fix,
  and handing back a re-encoded identical file would only cost a second.
*/
async function fitForPrint(cover) {
  const target = PRINT_RATIO_W / PRINT_RATIO_H
  const source = cover.width / cover.height
  // A hair of tolerance: ratios written as integers rarely divide exactly, and
  // a one-pixel band is not worth a second encode of an 8-megapixel PNG.
  if (Math.abs(target - source) < 0.0005) return null

  const width =
    target > source ? Math.round(cover.height * target) : cover.width
  const height =
    target > source ? cover.height : Math.round(cover.width / target)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const dx = Math.round((width - cover.width) / 2)
  const dy = Math.round((height - cover.height) / 2)

  if (PRINT_MARGIN !== 'extend') {
    ctx.fillStyle = PRINT_MARGIN
    ctx.fillRect(0, 0, width, height)
  }

  ctx.drawImage(cover, dx, dy)

  if (PRINT_MARGIN === 'extend') {
    // Never let the inset run past the middle of the artwork, however it is set.
    const inset = clamp(
      PRINT_EDGE_INSET,
      0,
      Math.floor(Math.min(cover.width, cover.height) / 2) - 1,
    )

    if (dx > 0) {
      // One solid column each side, stretched out to the paper AND back over
      // the cover's own soft edge.
      ctx.drawImage(
        cover,
        inset, 0, 1, cover.height,
        0, dy, dx + inset, cover.height,
      )
      ctx.drawImage(
        cover,
        cover.width - 1 - inset, 0, 1, cover.height,
        dx + cover.width - inset, dy, width - dx - cover.width + inset, cover.height,
      )
    }
    if (dy > 0) {
      // Same again with rows, for paper that is proportionally taller.
      ctx.drawImage(
        cover,
        0, inset, cover.width, 1,
        dx, 0, cover.width, dy + inset,
      )
      ctx.drawImage(
        cover,
        0, cover.height - 1 - inset, cover.width, 1,
        dx, dy + cover.height - inset, cover.width, height - dy - cover.height + inset,
      )
    }
  }

  return canvasToBlob(canvas)
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export image.'))),
      'image/png', // lossless
    )
  })
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}
