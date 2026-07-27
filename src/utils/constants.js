import { DEFAULT_COVER_FONT, DEFAULT_TEXT_CASE } from './coverFont'

// Native artwork dimensions of bg.png / overlay.png (portrait magazine cover).
export const COVER_WIDTH = 1500
export const COVER_HEIGHT = 2100
export const COVER_RATIO = COVER_WIDTH / COVER_HEIGHT // 5 : 7

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
