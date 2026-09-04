import { useEffect, useState } from 'react'
import { FiCheck, FiDownload } from 'react-icons/fi'
import { INSTANT_FINISH_HOLD_MS } from '../config'

/*
  The finish, shown in place of the separate result page.

  A kiosk session is one cover per guest, so this is the last thing they see:
  the finished cover held up full screen while the PNG saves, then the kiosk
  resets itself for the next person. It deliberately takes over the whole
  viewport rather than sitting inside the editor's layout — the cover is the
  reward, and the editor's controls behind it are finished business.

  Nothing here is interactive. A guest who walks away mid-hold must not strand
  the kiosk on a screen that needs a tap, so `onDone` fires on a timer and the
  progress bar exists purely to show that the wait is finite.
*/
export default function CoverFinale({ src, onDone }) {
  // 'saving' → 'saved'. The tick lands when the download has actually fired.
  const [stage, setStage] = useState('saving')

  useEffect(() => {
    // Mirrors the beat in the download handler, so the label flips to "Saved"
    // at the moment the browser takes the file rather than before it.
    const saved = setTimeout(() => setStage('saved'), 900)
    const done = setTimeout(onDone, INSTANT_FINISH_HOLD_MS)
    return () => {
      clearTimeout(saved)
      clearTimeout(done)
    }
  }, [onDone])

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
          {stage === 'saved' ? 'Saved to your device' : 'Saving your cover…'}
        </p>

        <span
          className={`flex aspect-square w-[clamp(2.75rem,7vmin,5rem)] items-center
            justify-center rounded-full transition-colors duration-500 ${
              stage === 'saved'
                ? 'bg-sage/15 text-sage'
                : 'bg-clay/10 text-clay'
            }`}
        >
          {stage === 'saved' ? (
            <FiCheck className="reveal-tick h-[45%] w-[45%]" />
          ) : (
            <FiDownload className="h-[45%] w-[45%] animate-bounce" />
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
