/*
  How the person's name is typeset on the cover — the fonts, and the letter
  case. One place, one definition. Both renderers read from here, so the
  on-screen editor and the exported PNG can never drift apart:
    · src/components/MagazineCanvas.jsx  (DOM preview)
    · src/utils/compose.js               (canvas export)

  Both choices live in the layout state (`layout.text.fontKey` /
  `layout.text.textCase`), so the Name tab in the editor can flip between them
  and the export follows along.

  ── Adding / swapping a font ─────────────────────────────────────────────────
  1. Drop the file into src/assets/fonts/ (.otf / .ttf / .woff2 all work).
  2. Import it below and add one entry to COVER_FONTS.
  3. `family` must be the font's real family name; `weightRange` must be what
     the FILE actually holds (see the notes on those fields).
  The editor picks new entries up automatically — no UI changes needed.
  Delete an entry to retire a font (keep DEFAULT_COVER_FONT pointing at a real
  one), and set DEFAULT_COVER_FONT to whichever wins the comparison.
*/
import acuminUrl from '../assets/fonts/acumin-variable-concept.otf'
import cafetaUrl from '../assets/fonts/cafeta.ttf'

/*
  Shared fallback. Deliberately a serif: every custom font here is something
  else, so if one ever fails to load the cover text visibly turns serif instead
  of failing quietly and looking "almost right".
*/
const FALLBACK = "Georgia, 'Times New Roman', serif"

export const COVER_FONTS = {
  acumin: {
    label: 'Acumin',
    // Family name we register the file under. It is an alias, not a system
    // lookup — but keep it the font's real name for clarity.
    family: 'Acumin Variable Concept',
    source: acuminUrl,
    /*
      Weights the FILE provides.
        · variable font -> a range, e.g. '100 900'
        · static font   -> the single weight it holds, e.g. '400'
      Declaring a range the file cannot deliver makes the browser skip
      synthetic bolding, so text renders lighter than asked for — keep honest.
    */
    weightRange: '100 900', // variable wght axis
    // Weight the name is actually DRAWN at. Tune this to taste.
    weight: 600,
    style: 'normal',
    fallback: FALLBACK,
  },

  cafeta: {
    label: 'Cafeta',
    family: 'cafeta', // lowercase in the file's name table — matched as-is
    source: cafetaUrl,
    // Static font: regular only. Asking for >400 here gets synthetic bold,
    // which on a display face usually looks worse than leaving it at 400.
    weightRange: '400',
    weight: 400,
    style: 'normal',
    fallback: FALLBACK,
  },
}

// The font used until the user picks another. Set this to the winner.
export const DEFAULT_COVER_FONT = 'acumin'

// Stable list for building the picker UI: [{ key, label, ... }, …]
export const COVER_FONT_OPTIONS = Object.entries(COVER_FONTS).map(([key, font]) => ({
  key,
  ...font,
}))

// Resolves a key to its definition, tolerating stale/missing keys.
export function coverFont(key) {
  return COVER_FONTS[key] || COVER_FONTS[DEFAULT_COVER_FONT]
}

// Ready-to-use CSS font-family value (DOM side).
export function coverFontStack(key) {
  const font = coverFont(key)
  return `'${font.family}', ${font.fallback}`
}

// Ready-to-use ctx.font shorthand for a given pixel size (canvas side).
export function coverFontShorthand(key, sizePx) {
  const font = coverFont(key)
  return `${font.weight} ${sizePx}px ${coverFontStack(key)}`
}

/*
  Registers a font with the document once and resolves when it is usable.
  Idempotent — safe to call on every render and before every export.

  The canvas export MUST await this: unlike the DOM, ctx.fillText() does not
  wait for a pending font, it silently falls back to the next family in the
  stack. Resolves `false` when the font is unavailable (bad file, no FontFace
  support); callers carry on and get the fallback rather than a broken export.
*/
const loads = new Map()

export function ensureCoverFont(key) {
  const resolvedKey = COVER_FONTS[key] ? key : DEFAULT_COVER_FONT
  const cached = loads.get(resolvedKey)
  if (cached) return cached

  const font = COVER_FONTS[resolvedKey]
  let promise

  if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
    promise = Promise.resolve(false)
  } else {
    const face = new FontFace(font.family, `url(${font.source})`, {
      weight: font.weightRange,
      style: font.style,
      display: 'swap',
    })
    promise = face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded)
        return true
      })
      .catch((err) => {
        // Non-fatal: everything keeps working on the fallback stack.
        console.warn(`Could not load the cover font "${font.family}".`, err)
        return false
      })
  }

  loads.set(resolvedKey, promise)
  return promise
}

// Loads every font — used by the picker so each option previews in its own face.
export function ensureAllCoverFonts() {
  return Promise.all(Object.keys(COVER_FONTS).map(ensureCoverFont))
}

/*
  ── Letter case ──────────────────────────────────────────────────────────────
  Applied to the STRING, not via CSS text-transform: <canvas> has no
  text-transform, so transforming the characters is the only way the preview and
  the export can be guaranteed to agree.
*/
export const TEXT_CASES = {
  upper: { label: 'AA', hint: 'UPPERCASE', transform: (s) => s.toUpperCase() },
  original: { label: 'Aa', hint: 'As typed', transform: (s) => s },
  lower: { label: 'aa', hint: 'lowercase', transform: (s) => s.toLowerCase() },
}

// Covers open in caps — change this to 'original' or 'lower' to flip the default.
export const DEFAULT_TEXT_CASE = 'upper'

export const TEXT_CASE_OPTIONS = Object.entries(TEXT_CASES).map(([key, value]) => ({
  key,
  ...value,
}))

export function applyTextCase(text, caseKey) {
  if (!text) return text
  const mode = TEXT_CASES[caseKey] || TEXT_CASES[DEFAULT_TEXT_CASE]
  return mode.transform(text)
}
