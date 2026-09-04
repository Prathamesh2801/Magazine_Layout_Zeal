import { DEFAULT_COVER_FONT, DEFAULT_TEXT_CASE } from './coverFont'

/*
  Native artwork dimensions (portrait magazine cover).

  These MUST match the aspect ratio of overlay.png, which is the frame drawn on
  top of everything: the DOM preview fits it with object-cover and the export
  stretches it to these exact dimensions, so a mismatch shows up as the frame
  being cropped on screen AND distorted in the PNG — and, worse, the two
  disagreeing with each other.

  Current art is 2336 x 3536 (ratio 0.6606), so the cover is 1500 x 2271 rather
  than a textbook 5:7. When you re-skin, re-derive the height from the new
  overlay: COVER_HEIGHT = round(COVER_WIDTH * overlayHeight / overlayWidth).
*/
export const COVER_WIDTH = 1500
export const COVER_HEIGHT = 2271
export const COVER_RATIO = COVER_WIDTH / COVER_HEIGHT

// Export quality. The final canvas is rendered at COVER_WIDTH * scale, where the
// scale is chosen so the (high-res DSLR) subject is drawn at its native pixel
// density and never downsampled. Capped so we don't blow up memory on tablets.
// EXPORT_MAX_SCALE = 4 -> up to 6000 x 8400 px PNG.
export const EXPORT_MAX_SCALE = 4

// Routes (used with createHashRouter)
export const ROUTES = {
  upload: '/',
  editor: '/editor',
  result: '/result',
  // Standalone display wall — no app chrome, meant for a portrait screen.
  tv: '/tv',
}

// Default normalized layout (fractions of the cover container, 0..1).
// The person sits in the middle band; the name text just below center.
export const DEFAULT_PERSON = {
  x: 0.5, // center point X (fraction of width)
  y: 0.52, // center point Y (fraction of height)
  width: 0.6, // width as fraction of cover width (height derives from image aspect)
}

/*
  How small and how large the subject may be scaled, as a fraction of the cover
  width. Shared by every control that resizes it — the editor's slider, the
  corner handle in MovableLayer, and the keyboard steps in the immersive kiosk —
  so the layer cannot be pushed past a bound by one route that another forbids.
*/
export const PERSON_MIN_WIDTH = 0.1
export const PERSON_MAX_WIDTH = 1.6

export const DEFAULT_TEXT = {
  x: 0.5,
  y: 0.86,
  fontScale: 0.075, // font size as fraction of cover width
  color: '#ffffff',
  fontKey: DEFAULT_COVER_FONT, // which face to use — see utils/coverFont.js
  textCase: DEFAULT_TEXT_CASE, // upper | original | lower — see utils/coverFont.js
}

// Curated text colors that read well over the warm artwork.
export const TEXT_COLORS = [
  '#ffffff',
  '#2b2620',
  '#f4d35e',
  '#c05f3c',
  '#1f2937',
]
