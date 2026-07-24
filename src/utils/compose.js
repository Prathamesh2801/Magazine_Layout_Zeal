import { COVER_WIDTH, COVER_HEIGHT, EXPORT_MAX_SCALE } from './constants'
import { loadImage } from './image'

/*
  Composites the four layers to an off-screen canvas and returns a lossless
  PNG blob (plus an object URL). Layer order (back -> front):
    1. background (bg.png)
    2. person (bg-removed)
    3. name text
    4. overlay frame (overlay.png)

  Quality: the canvas is rendered at COVER_WIDTH * scale. The scale is derived
  from the subject's NATIVE resolution so a high-res DSLR photo is drawn at (or
  near) full pixel density instead of being downsampled to 1500px. All drawing
  stays in the 1500x2100 coordinate space via ctx.scale(), so the layout maths
  are unchanged. PNG output is lossless — no quality-degrading compression.

  Returns: { blob, url, width, height, scale }
*/
export async function composeCover({ bgSrc, personSrc, overlaySrc, layout }) {
  const [bg, overlay, person] = await Promise.all([
    loadImage(bgSrc),
    loadImage(overlaySrc),
    personSrc ? loadImage(personSrc) : Promise.resolve(null),
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
  ctx.scale(scale, scale) // draw everything in 1500x2100 space

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

  // 3. Name text
  const text = layout.text?.content?.trim()
  if (text) {
    const fontPx = layout.text.fontScale * COVER_WIDTH
    ctx.font = `700 ${fontPx}px 'Playfair Display', Georgia, serif`
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
    width: canvas.width,
    height: canvas.height,
    scale,
  }
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
