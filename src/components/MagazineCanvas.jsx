import { useEffect, useRef } from 'react'
import MovableLayer from './MovableLayer'
import {
  applyTextCase,
  coverFont,
  coverFontStack,
  ensureCoverFont,
} from '../utils/coverFont'

/*
  The four-layer magazine composition, rendered with DOM so the on-screen
  editor is pixel-faithful to the exported canvas (see utils/compose.js).

  Layer order (back -> front):
    1. background   (bg.png)
    2. person       (bg-removed) — draggable + resizable when interactive
    3. name text    — draggable + resizable when interactive
    4. overlay      (overlay.png, frame) — always on top, non-interactive

  Font size uses container query units (cqw) so text scales exactly with the
  cover at any screen size — essential for responsive tablet/portrait layouts.

  When `selected`/`onSelect`/`onChange*` are omitted the canvas renders a
  static preview (used on the result page).
*/
export default function MagazineCanvas({
  bgSrc,
  overlaySrc,
  personSrc,
  layout,
  interactive = false,
  selected,
  onSelect,
  onChangePerson,
  onChangeText,
  className = '',
}) {
  const containerRef = useRef(null)
  const fontKey = layout.text?.fontKey
  // Case is applied to the string (not CSS) so the export matches exactly.
  const text = applyTextCase(layout.text?.content?.trim(), layout.text?.textCase)

  // Kick off the selected name font (see utils/coverFont.js). The browser
  // re-renders the text by itself once the face lands — no state to track.
  useEffect(() => {
    ensureCoverFont(fontKey)
  }, [fontKey])

  const textStyle = {
    fontFamily: coverFontStack(fontKey),
    fontWeight: coverFont(fontKey).weight,
    fontSize: `${layout.text.fontScale * 100}cqw`,
    color: layout.text.color,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textShadow: '0 2px 6px rgba(0,0,0,0.45)',
    WebkitTextStroke: '0.5px rgba(0,0,0,0.25)',
  }

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full overflow-hidden rounded-lg bg-paper-200
        shadow-lift ${className}`}
      style={{ aspectRatio: '5 / 7', containerType: 'inline-size' }}
      onPointerDown={interactive ? () => onSelect?.(null) : undefined}
    >
      {/* 1. Background */}
      <img
        src={bgSrc}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* 2. Person */}
      {personSrc &&
        (interactive ? (
          <MovableLayer
            containerRef={containerRef}
            x={layout.person.x}
            y={layout.person.y}
            size={layout.person.width}
            minSize={0.1}
            maxSize={1.6}
            selected={selected === 'person'}
            onSelect={() => onSelect?.('person')}
            onChange={(patch) =>
              onChangePerson(mapSize(patch, 'width'))
            }
            style={{ width: `${layout.person.width * 100}%` }}
          >
            <img
              src={personSrc}
              alt="Cover subject"
              draggable={false}
              className="pointer-events-none w-full select-none"
            />
          </MovableLayer>
        ) : (
          <img
            src={personSrc}
            alt="Cover subject"
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              left: `${layout.person.x * 100}%`,
              top: `${layout.person.y * 100}%`,
              width: `${layout.person.width * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

      {/* 3. Name text */}
      {text &&
        (interactive ? (
          <MovableLayer
            containerRef={containerRef}
            x={layout.text.x}
            y={layout.text.y}
            size={layout.text.fontScale}
            minSize={0.02}
            maxSize={0.3}
            selected={selected === 'text'}
            onSelect={() => onSelect?.('text')}
            onChange={(patch) => onChangeText(mapSize(patch, 'fontScale'))}
          >
            <span style={textStyle}>{text}</span>
          </MovableLayer>
        ) : (
          <span
            className="pointer-events-none absolute"
            style={{
              ...textStyle,
              left: `${layout.text.x * 100}%`,
              top: `${layout.text.y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {text}
          </span>
        ))}

      {/* 4. Overlay frame */}
      <img
        src={overlaySrc}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}

// MovableLayer emits { x, y } or { size }. Re-key `size` to the field the
// consumer stores (width for the person, fontScale for the text).
function mapSize(patch, sizeKey) {
  if ('size' in patch) {
    const { size, ...rest } = patch
    return { ...rest, [sizeKey]: size }
  }
  return patch
}
