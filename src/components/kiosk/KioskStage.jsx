import { useHintsVisible } from '../../hooks/useHintsVisible'
import { COVER_RATIO } from '../../utils/constants'
import ambientDefault from '../../assets/bg.jpeg'

/*
  The full-bleed kiosk surface.

  Everything the guest sees in IMMERSIVE_KIOSK mode is rendered into this: the
  live camera, the shot they just took, and the editor canvas. It takes the
  whole viewport (fixed, above the studio's normal page flow) so the panel shows
  the picture and nothing else — no card, no footer, no browser-shaped layout.

  With `frame` (the default) the content is held in a box at COVER_RATIO, sized
  to the largest that fits the screen. Fitting rather than stretching is the
  whole point: the preview, the review and the composition are the SAME shape as
  the exported PNG, so what the guest lines up is what they get. Stretching to
  the panel would break that agreement the moment the panel's ratio was not
  exactly the artwork's — and it never is.

  How much the fit leaves over depends entirely on the panel. A 900x1400 screen
  (0.643) is within three percent of the artwork and comes out essentially edge
  to edge; a 9:16 panel (0.5625) is not, and loses about 7.4% of its height above
  and below the frame. That is geometry, not a bug — the honest fix for a panel
  you own is to re-skin the artwork to its ratio (see "Re-skinning for a new
  event"). What is NOT a fix is stretching the frame: the guest would line up
  against one shape and be handed another.

  So the leftover is filled rather than removed. `ambientSrc` — the event
  backdrop by default, the finished cover on the finale — is blurred hard and
  dimmed behind everything, the same trick the /tv wall uses to light itself.
  The panel reads as edge-to-edge light with the accurate frame floating in the
  middle of it, instead of as a picture with two black bands bolted on.

  `frame={false}` is for the attract screen, which is type rather than artwork:
  it already owns the whole panel, so there is nothing to fill and the wash
  would only compete with the type.
*/
export default function KioskStage({
  frame = true,
  hints,
  ambientSrc,
  children,
  className = '',
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-stage">
      {/*
        The wash. Blur radius is in vmin so it stays proportional from a laptop
        tab to a 2880px panel, and the whole thing is scaled up past the edges
        because a blur pulls transparency in from outside the image — without
        the overscan the bars would fade out to bare stage at the very top and
        bottom, which is precisely where they are being looked at.

        aria-hidden and pointer-events-none: it is lighting, not content.
      */}
      {frame && (
        <img
          src={ambientSrc || ambientDefault}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-125
            object-cover opacity-40 blur-[6vmin]"
        />
      )}

      <div
        className={`relative overflow-hidden ${
          frame ? 'bg-stage-soft' : 'flex h-full w-full items-center justify-center'
        } ${className}`}
        /*
          The fitted frame, in one expression: as wide as the screen allows, but
          never taller than it. dvh rather than vh so a browser with a
          disappearing toolbar does not push the bottom of the cover off-screen.
        */
        style={
          frame
            ? {
                aspectRatio: COVER_RATIO,
                width: `min(100dvw, ${COVER_RATIO} * 100dvh)`,
              }
            : undefined
        }
      >
        {children}
        {hints?.length ? <KeyHints hints={hints} /> : null}
      </div>
    </div>
  )
}

/*
  The only instructions on screen.

  With no buttons to look at, the guest needs to be told which key does what —
  so this is a legend, not decoration, and it sits inside the frame over a wash
  rather than stealing height from the picture. Sized in vmin like the rest of
  the kiosk so it is readable from across a room and still sane in a laptop tab.

  Labels are written by the caller but the KEYS they show come from config, so
  a remapped kiosk cannot end up advertising a key that no longer works.

  Visibility is decided HERE rather than by each caller, and rather than by
  KioskStage — CameraCapture renders this component directly, outside the stage,
  so a gate one level up would have let the camera screen keep showing its
  legend after the operator hid everything else. Callers describe their keys;
  whether those keys are on screen is not theirs to decide.
*/
export function KeyHints({ hints }) {
  const visible = useHintsVisible()
  if (!visible) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap
        items-center justify-center gap-x-[3vmin] gap-y-[1.2vmin]
        bg-linear-to-t from-black/75 via-black/40 to-transparent
        px-[4vmin] pt-[10vmin] pb-[3vmin]"
    >
      {hints.filter(Boolean).map((hint) => (
        <span
          key={hint.label}
          className="flex items-center gap-[0.9vmin] text-kiosk-sm
            font-medium tracking-wide text-white/80"
        >
          {hint.keys.map((key) => (
            <kbd
              key={key}
              className="rounded-[0.7vmin] border border-white/30 bg-white/12 px-[1.3vmin]
                py-[0.5vmin] font-sans text-[0.95em] leading-none text-white"
            >
              {key}
            </kbd>
          ))}
          {hint.label}
        </span>
      ))}
    </div>
  )
}
