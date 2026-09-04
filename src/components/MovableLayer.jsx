import { useCallback, useRef } from 'react'
import { MdOutlineOpenWith } from 'react-icons/md'

/*
  A single positioned layer that can be dragged and resized inside a cover
  container. Everything is expressed in normalised fractions (0..1) of the
  container, so it maps 1:1 to the exported artwork.

  - Drag:   pointer on the body updates { x, y } (the layer's CENTER point).
  - Resize: pointer on the corner handle scales `size` by the pointer's
            distance-from-center ratio (natural pinch-like feel).

  Uses Pointer Events, so mouse, touch (tablet/portrait) and pen all work.

  The affordances — the selection outline, the move badge, the resize handle —
  are sized in `cqw` against the cover container, which MagazineCanvas already
  declares as `containerType: inline-size` for the headline. Fixed pixels do not
  survive this app's size range: a 24px handle is a comfortable target in a
  laptop tab and an invisible speck on a 2880px kiosk panel. Each keeps a rem
  floor so it stays grabbable when the cover is small.
*/
export default function MovableLayer({
  containerRef,
  x,
  y,
  size,
  minSize = 0.05,
  maxSize = 2,
  selected,
  onSelect,
  onChange,
  style,
  className = '',
  children,
}) {
  const drag = useRef(null)

  const getRect = useCallback(
    () => containerRef.current?.getBoundingClientRect(),
    [containerRef],
  )

  // ---- Drag (move) --------------------------------------------------------
  const onBodyPointerDown = useCallback(
    (e) => {
      const rect = getRect()
      if (!rect) return
      e.stopPropagation()
      onSelect?.()
      drag.current = {
        mode: 'move',
        startPx: { x: e.clientX, y: e.clientY },
        start: { x, y },
        rect,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [getRect, onSelect, x, y],
  )

  // ---- Resize -------------------------------------------------------------
  const onHandlePointerDown = useCallback(
    (e) => {
      const rect = getRect()
      if (!rect) return
      e.stopPropagation()
      onSelect?.()
      const centerPx = { x: rect.left + x * rect.width, y: rect.top + y * rect.height }
      const startDist = Math.hypot(e.clientX - centerPx.x, e.clientY - centerPx.y) || 1
      drag.current = { mode: 'resize', centerPx, startDist, startSize: size, rect }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [getRect, onSelect, size, x, y],
  )

  const onPointerMove = useCallback(
    (e) => {
      const d = drag.current
      if (!d) return
      if (d.mode === 'move') {
        const dx = (e.clientX - d.startPx.x) / d.rect.width
        const dy = (e.clientY - d.startPx.y) / d.rect.height
        onChange({
          x: clamp(d.start.x + dx, 0, 1),
          y: clamp(d.start.y + dy, 0, 1),
        })
      } else if (d.mode === 'resize') {
        const dist = Math.hypot(e.clientX - d.centerPx.x, e.clientY - d.centerPx.y)
        const next = clamp((d.startSize * dist) / d.startDist, minSize, maxSize)
        onChange({ size: next })
      }
    },
    [maxSize, minSize, onChange],
  )

  const endDrag = useCallback((e) => {
    if (drag.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* pointer already released */
      }
    }
    drag.current = null
  }, [])

  return (
    <div
      className={`absolute no-select ${className}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        cursor: 'grab',
        outline: selected
          ? 'max(2px, 0.3cqw) dashed var(--color-clay)'
          : 'none',
        outlineOffset: 'max(4px, 0.6cqw)',
        ...style,
      }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {children}

      {selected && (
        <>
          {/* Move affordance */}
          <span
            className="pointer-events-none absolute flex items-center justify-center
              rounded-full bg-clay text-white shadow-soft"
            style={{
              top: 'calc(-1 * max(0.75rem, 1.5cqw))',
              left: 'calc(-1 * max(0.75rem, 1.5cqw))',
              width: 'max(1.5rem, 3cqw)',
              height: 'max(1.5rem, 3cqw)',
            }}
          >
            {/* The icon rides the badge rather than carrying its own size. */}
            <MdOutlineOpenWith size="58%" />
          </span>
          {/* Resize handle */}
          <span
            role="slider"
            aria-label="Resize layer"
            className="absolute rounded-full border-white bg-clay shadow-soft"
            style={{
              cursor: 'nwse-resize',
              touchAction: 'none',
              bottom: 'calc(-1 * max(0.75rem, 1.5cqw))',
              right: 'calc(-1 * max(0.75rem, 1.5cqw))',
              width: 'max(1.5rem, 3cqw)',
              height: 'max(1.5rem, 3cqw)',
              borderWidth: 'max(2px, 0.35cqw)',
            }}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        </>
      )}
    </div>
  )
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}
