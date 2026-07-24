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
        outline: selected ? '2px dashed var(--color-clay)' : 'none',
        outlineOffset: '4px',
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
          <span className="pointer-events-none absolute -top-3 -left-3 rounded-full bg-clay p-1 text-white shadow-soft">
            <MdOutlineOpenWith size={14} />
          </span>
          {/* Resize handle */}
          <span
            role="slider"
            aria-label="Resize layer"
            className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full border-2 border-white bg-clay shadow-soft"
            style={{ cursor: 'nwse-resize', touchAction: 'none' }}
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
