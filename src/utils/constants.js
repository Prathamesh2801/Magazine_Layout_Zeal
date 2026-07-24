// Native artwork dimensions of bg.png / overlay.png (portrait magazine cover).
export const COVER_WIDTH = 1500
export const COVER_HEIGHT = 2100
export const COVER_RATIO = COVER_WIDTH / COVER_HEIGHT // 5 : 7

// Routes (used with createHashRouter)
export const ROUTES = {
  upload: '/',
  editor: '/editor',
  result: '/result',
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
}

// Curated text colors that read well over the warm artwork.
export const TEXT_COLORS = [
  '#ffffff',
  '#2b2620',
  '#f4d35e',
  '#c05f3c',
  '#1f2937',
]
