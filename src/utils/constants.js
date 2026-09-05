import { DEFAULT_COVER_FONT, DEFAULT_TEXT_CASE } from './coverFont'

/*
  Native artwork dimensions (portrait magazine cover).

  These MUST match the aspect ratio of overlay.png, which is the frame drawn on
  top of everything: the DOM preview fits it with object-cover and the export
  stretches it to these exact dimensions, so a mismatch shows up as the frame
  being cropped on screen AND distorted in the PNG — and, worse, the two
  disagreeing with each other.

  Current art is 9:16, matching the kiosk panel (2160 x 3840) pixel for pixel.
  That is deliberate: the immersive shell fits its frame to COVER_RATIO rather
  than stretching it, so artwork at the panel's own ratio is what makes the
  studio genuinely edge to edge with no dead space to fill. Artwork at any other
  ratio still works — KioskStage lights the leftover with an ambient wash — but
  it will not be full bleed. The previous event's art was 2336 x 3536 (0.6606),
  which cost 285px of black at the top and bottom of this panel.

  When you re-skin, re-derive the height from the new overlay:
  COVER_HEIGHT = round(COVER_WIDTH * overlayHeight / overlayWidth).
*/
export const COVER_WIDTH = 2160
export const COVER_HEIGHT = 3840
export const COVER_RATIO = COVER_WIDTH / COVER_HEIGHT

/*
  Export quality. The final canvas is rendered at COVER_WIDTH * scale, where the
  scale is chosen so a high-res (DSLR) subject is drawn at its native pixel
  density and never downsampled.

  The cap is a memory guard, and it has to come down as the base goes up: at a
  2160-wide cover, scale 4 would ask for 8640 x 15360 — 132 megapixels, over half
  a gigabyte of RGBA, which browsers refuse to allocate. 2 keeps the ceiling at
  4320 x 7680 and still leaves headroom, and with the kiosk's webcam the scale
  lands at 1 regardless: a 1080p frame cropped to 9:16 is 608px wide, well under
  the 1296px the subject occupies on the cover at its default size.
*/
export const EXPORT_MAX_SCALE = 2

// Routes (used with createHashRouter)
export const ROUTES = {
  upload: '/',
  editor: '/editor',
  result: '/result',
  // Standalone display wall — no app chrome, meant for a portrait screen.
  tv: '/tv',
}

/*
  Default normalized layout (fractions of the cover container, 0..1).

  The subject is aimed at the transparent window in overlay.png rather than at
  the middle of the cover — the frame is not symmetrical, so "centred" and "in
  the window" are different places. The current art's window measures
  2008 x 2887 at (76, 136) in the 2160 x 3840 artwork: 76px of border either
  side, 133px above, and an 814px logo band below.

  Those numbers give the values here:
    x     = (76 + 2008/2) / 2160 = 0.5     — the window IS horizontally centred
    y     = (136 + 2887/2) / 3840 = 0.4113 — but it sits high, above the band
    width = 2887 * COVER_RATIO / 2160 = 0.7519

  The width is derived, not eyeballed: the camera crop is COVER_RATIO (9:16), so
  a photo 0.7519 of the cover wide is exactly 2887px tall — the window's height
  to the pixel. It fills the window top to bottom and leaves 192px of backdrop
  showing either side, which is what puts the guest inside the frame rather than
  behind it.

  Re-derive all three when the artwork changes; the formulas above are the whole
  method. If the background remover starts returning a tight crop of the subject
  rather than the full frame, the width wants to come down — that is a resize
  away on the kiosk (+ / -) and one number here.
*/
export const DEFAULT_PERSON = {
  x: 0.5, // center point X (fraction of width)
  y: 0.4113, // center point Y — the window's centre, not the cover's
  width: 0.7519, // fraction of cover width (height derives from image aspect)
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
