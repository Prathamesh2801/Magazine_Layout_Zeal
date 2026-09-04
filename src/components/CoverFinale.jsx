import { useEffect, useState } from 'react'
import { FiCheck, FiDownload } from 'react-icons/fi'
import KioskStage from './kiosk/KioskStage'
import {
  IMMERSIVE_KIOSK,
  INSTANT_FINISH_FADE_MS,
  INSTANT_FINISH_HOLD_MS,
} from '../config'

/*
  The finish, shown in place of the separate result page.

  A kiosk session is one cover per guest, so this is the last thing they see:
  the finished cover held up while the PNG saves, then the kiosk resets itself
  for the next person. It deliberately takes over the whole viewport rather than
  sitting inside the editor's layout — the cover is the reward, and the editor's
  controls behind it are finished business.

  Nothing here is interactive. A guest who walks away mid-hold must not strand
  the kiosk on a screen that needs a tap, so `onDone` fires on a timer.

  Two shells, as everywhere else in the studio:

  · IMMERSIVE_KIOSK — the cover fills the SAME KioskStage frame the editor's
    canvas just occupied, so generating swaps the composition for the finished
    PNG without a single pixel of layout moving. There is no progress bar and no
    caption: at that size they were furniture around a picture that had already
    said everything. The beats in index.css carry the state instead — a sweep
    while it saves, a tick when the file lands, a dissolve as the session ends.

  · Windowed — the original staged panel: cover, label, badge and a draining bar
    that shows the wait is finite. Right for a laptop tab, where the cover is a
    few hundred pixels and there is room around it to explain itself.
*/

// The beat at which the download has actually reached the browser. Mirrors the
// click in EditorPage.saveCover, so the "saved" state flips when the file is
// taken rather than optimistically at mount.
const SAVED_AT_MS = 900

export default function CoverFinale({ src, onDone }) {
  // 'saving' → 'saved' → 'leaving' (the immersive shell's closing dissolve).
  const [stage, setStage] = useState('saving')

  useEffect(() => {
    const saved = setTimeout(() => setStage('saved'), SAVED_AT_MS)
    /*
      The dissolve is counted INSIDE the hold, not added to it: the guest waits
      INSTANT_FINISH_HOLD_MS either way, and the last stretch of it is spent
      fading. Clamped so a fade configured longer than the hold cannot schedule
      itself into the past and start the moment the cover appears.
    */
    const leaveAt = Math.max(
      SAVED_AT_MS,
      INSTANT_FINISH_HOLD_MS - INSTANT_FINISH_FADE_MS,
    )
    const leaving = setTimeout(() => setStage('leaving'), leaveAt)
    const done = setTimeout(onDone, INSTANT_FINISH_HOLD_MS)
    return () => {
      clearTimeout(saved)
      clearTimeout(leaving)
      clearTimeout(done)
    }
  }, [onDone])

  /*
    The finale lights the panel with the cover itself rather than the event
    backdrop every other screen uses. This is the one moment the guest's own
    picture is the subject of the whole room, so the glow around it should be
    theirs too — and the swap from backdrop to cover lands under the reveal,
    which reads as the cover arriving rather than as the wash changing.
  */
  if (IMMERSIVE_KIOSK) {
    return (
      <KioskStage ambientSrc={src}>
        <img
          src={src}
          alt="Your finished cover"
          className="finale-reveal absolute inset-0 h-full w-full object-cover"
        />

        {/* The saving state: one light sweep across the cover itself. */}
        {stage === 'saving' && (
          <span className="finale-sheen pointer-events-none absolute inset-0" />
        )}

        {/*
          The file has landed. Sized in vmin like everything else on the panel,
          and it clears itself — the guest should be left looking at their cover,
          not at a badge sitting on top of it.
        */}
        {stage !== 'saving' && (
          <span
            className="finale-tick pointer-events-none absolute left-1/2 top-1/2
              flex aspect-square w-[max(3.5rem,12vmin)] -translate-x-1/2
              -translate-y-1/2 items-center justify-center rounded-full
              bg-black/45 text-white backdrop-blur-sm"
          >
            <FiCheck className="h-[45%] w-[45%]" />
          </span>
        )}

        {/*
          The closing dissolve. A curtain fading in over the cover, rather than
          the cover fading out, so the stage colour behind it is what the guest
          is left with — which is exactly what the attract screen opens on.
        */}
        {stage === 'leaving' && (
          <span
            className="finale-curtain pointer-events-none absolute inset-0 bg-stage"
            style={{ animationDuration: `${INSTANT_FINISH_FADE_MS}ms` }}
          />
        )}
      </KioskStage>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-[3vmin] bg-paper px-[6vmin]">
      {/* The cover, arriving as the hero. */}
      <img
        src={src}
        alt="Your finished cover"
        className="reveal-cover max-h-[62vh] w-auto rounded-[1.2vmin] shadow-lift"
      />

      <div className="reveal-actions flex flex-col items-center gap-[2vmin]">
        <p className="font-display text-[clamp(1.6rem,5vmin,3.2rem)] leading-tight font-bold text-ink">
          {stage === 'saving' ? 'Saving your cover…' : 'Saved to your device'}
        </p>

        <span
          className={`flex aspect-square w-[clamp(2.75rem,7vmin,5rem)] items-center
            justify-center rounded-full transition-colors duration-500 ${
              stage === 'saving'
                ? 'bg-clay/10 text-clay'
                : 'bg-sage/15 text-sage'
            }`}
        >
          {stage === 'saving' ? (
            <FiDownload className="h-[45%] w-[45%] animate-bounce" />
          ) : (
            <FiCheck className="reveal-tick h-[45%] w-[45%]" />
          )}
        </span>

        {/*
          The hold, made visible. Runs for exactly INSTANT_FINISH_HOLD_MS so the
          bar empties as the kiosk resets — the guest can see the session ending
          instead of being surprised by it.
        */}
        <div
          className="mt-[1vmin] h-[0.8vmin] w-[38vmin] overflow-hidden rounded-full bg-paper-300"
          role="progressbar"
          aria-label="Returning to the start"
        >
          <div
            className="finale-timer h-full rounded-full bg-clay"
            style={{ animationDuration: `${INSTANT_FINISH_HOLD_MS}ms` }}
          />
        </div>

        <p className="text-[clamp(0.75rem,1.7vmin,1.15rem)] text-ink-muted">
          Starting a new cover in a moment…
        </p>
      </div>
    </div>
  )
}
