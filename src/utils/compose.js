import { COVER_WIDTH, COVER_HEIGHT } from './constants'
import { loadImage } from './image'

/*
  Renders the four layers to an off-screen canvas at native resolution and
  returns a PNG data URL. Layer order (back -> front):
    1. background (bg.png)
    2. person (bg-removed)
    3. name text
    4. overlay frame (overlay.png)

  All transforms are normalised fractions (0..1) of the cover, so this scales
  perfectly from the on-screen editor to the full 1500x2100 export.
*/
export async function composeCover({ bgSrc, personSrc, overlaySrc, layout }) {
  const canvas = document.createElement('canvas')
  canvas.width = COVER_WIDTH
  canvas.height = COVER_HEIGHT
  const ctx = canvas.getContext('2d')

  const [bg, overlay] = await Promise.all([loadImage(bgSrc), loadImage(overlaySrc)])

  // 1. Background
  ctx.drawImage(bg, 0, 0, COVER_WIDTH, COVER_HEIGHT)

  // 2. Person
  if (personSrc) {
    const person = await loadImage(personSrc)
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

  return canvas.toDataURL('image/png')
}
