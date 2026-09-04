/*
  `size` and `thickness` take a number (px, the windowed studio's usual case) or
  any CSS length string. The string form is what the immersive kiosk uses —
  `size="max(2rem,6vmin)"` — because a spinner fixed at 34px is a speck on a
  2880px panel and there is no breakpoint that fixes that, only a unit that
  tracks the screen. React passes strings through untouched and only appends
  'px' to numbers, so both work with no branching here.

  `thickness` exists because the ring is drawn by the border: scaling the box
  without it gives a huge circle drawn with a 2px hairline.
*/
export default function Spinner({ size = 20, thickness, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current
        border-t-transparent ${className}`}
      style={{ width: size, height: size, borderWidth: thickness }}
      role="status"
      aria-label="Loading"
    />
  )
}
