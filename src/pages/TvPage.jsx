import { useCallback, useEffect, useRef, useState } from 'react'
import { TbPhoto } from 'react-icons/tb'
import { FiMaximize, FiMinimize } from 'react-icons/fi'
import { TV_SLIDE_MS, TV_TRANSITION_MS } from '../config'
import { useCoverReel } from '../hooks/useCoverReel'
import { COVER_RATIO } from '../utils/constants'

/*
  The display wall (/tv).

  Runs unattended on a portrait screen: it listens to the cover feed, shows the
  newest cover the moment it lands, and otherwise cycles the ones before it.
  Everything is sized in vmin so the same markup reads correctly on a 1080×1920
  panel from across a room and in a laptop tab while you are building it.

  The cover is the whole screen — nothing is stacked above or below it. The
  status pill and the full-screen control float over the margin the 5:7 artwork
  leaves in a taller viewport, so they cost the cover no size at all.
*/

// A newly arrived cover wears its badge for this long.
const JUST_IN_MS = 20000

// Pointer stillness after which the cursor and controls get out of the way.
const IDLE_MS = 3500

export default function TvPage() {
  const { reel, status, drop } = useCoverReel()
  const [index, setIndex] = useState(0)

  const newestId = reel.length ? reel[reel.length - 1].id : null

  // Clamped on read, so a reel shortened by `drop` can never leave the carousel
  // pointing past the end — no correcting round-trip through state.
  const safeIndex = Math.min(index, Math.max(0, reel.length - 1))
  const current = reel[safeIndex] ?? null

  /* ---- following the feed ------------------------------------------------ */

  // A new cover takes the screen immediately — that is the whole point of the
  // wall. Adjusted during render rather than in an effect so the carousel never
  // paints the old cover for a frame first.
  const [followedId, setFollowedId] = useState(null)
  if (newestId && followedId !== newestId) {
    setFollowedId(newestId)
    setIndex(reel.length - 1)
  }

  // Badge only genuinely new arrivals — the reel restored from localStorage on
  // load is history, not news.
  const [justIn, setJustIn] = useState(false)
  const bootRef = useRef(true)
  useEffect(() => {
    const wasBoot = bootRef.current
    bootRef.current = false
    if (!newestId || wasBoot) return

    setJustIn(true)
    const timer = setTimeout(() => setJustIn(false), JUST_IN_MS)
    return () => clearTimeout(timer)
  }, [newestId])

  // Cycle the back catalogue. Keyed on `index`, so the dwell time restarts
  // whenever something else moves the carousel.
  useEffect(() => {
    if (reel.length < 2) return
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % reel.length),
      TV_SLIDE_MS,
    )
    return () => clearTimeout(timer)
  }, [index, reel.length])

  // Covers are shown straight from the server, so pull them into cache ahead of
  // their turn — a slide that arrives mid-download would show an empty frame.
  useEffect(() => {
    for (const cover of reel) {
      const img = new Image()
      img.src = cover.imageUrl
    }
  }, [reel])

  /* ---- the slide --------------------------------------------------------- */

  /*
    Two covers are on the stage during a change: the one arriving and the one
    leaving. Tracking them as a pair (rather than transforming a track of every
    cover) keeps the motion identical in every direction, including the wrap
    from the last cover back to the first. `seq` re-keys the frames so the CSS
    animations restart on each change.
  */
  const [stage, setStage] = useState({ incoming: null, outgoing: null, seq: 0 })

  if ((stage.incoming?.id ?? null) !== (current?.id ?? null)) {
    setStage({ incoming: current, outgoing: stage.incoming, seq: stage.seq + 1 })
  }

  useEffect(() => {
    if (!stage.outgoing) return
    const timer = setTimeout(
      () => setStage((s) => ({ ...s, outgoing: null })),
      TV_TRANSITION_MS,
    )
    return () => clearTimeout(timer)
  }, [stage.seq, stage.outgoing])

  /* ---- fitting the portrait frame ---------------------------------------- */

  /*
    The cover is a fixed 5:7. Measuring the stage and deriving the frame keeps
    it exactly that ratio at any viewport, which CSS `aspect-ratio` alone cannot
    promise once both dimensions are constrained.
  */
  const stageRef = useRef(null)
  const [frame, setFrame] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const h = Math.min(height, width / COVER_RATIO)
      setFrame({ width: h * COVER_RATIO, height: h })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /* ---- unattended-screen affordances ------------------------------------- */

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer
    const wake = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    window.addEventListener('pointermove', wake)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', wake)
    }
  }, [])

  /* ---- render ------------------------------------------------------------ */

  const showingNewest = safeIndex === reel.length - 1

  return (
    <div
      className={`fixed inset-0 overflow-hidden bg-stage text-paper
        ${idle ? 'cursor-none' : ''}`}
    >
      {/* Ambient wash — the cover lighting the wall behind itself. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {stage.outgoing && (
          <AmbientWash cover={stage.outgoing} className="opacity-40" />
        )}
        {stage.incoming && (
          <AmbientWash
            key={`ambient-${stage.seq}`}
            cover={stage.incoming}
            className="tv-ambient"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-stage via-stage/70 to-stage" />
      </div>

      {/* Floats over the stage margin so the cover keeps the full screen. */}
      <div
        className="absolute top-[clamp(1rem,3.5vmin,2.5rem)] right-[clamp(1rem,4vmin,3rem)]
          z-10 flex items-center gap-[1.5vmin]"
      >
        <StatusPill status={status} />
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen' : 'Go full screen'}
          className={`flex aspect-square w-[clamp(2rem,4.2vmin,3.25rem)] items-center
            justify-center rounded-full border border-paper/15 text-paper/60
            transition-opacity duration-500 hover:bg-paper/10 hover:text-paper
            ${idle ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        >
          {isFullscreen ? (
            <FiMinimize className="h-[45%] w-[45%]" />
          ) : (
            <FiMaximize className="h-[45%] w-[45%]" />
          )}
        </button>
      </div>

      {/* Stage — fills the screen, so the cover is centred against the viewport
          itself rather than against whatever is left over after other rows. */}
      <div
        ref={stageRef}
        className="absolute inset-0 flex items-center justify-center
          p-[clamp(1rem,4vmin,3rem)]"
      >
        {frame.height > 0 && (
          <div
            className="relative"
            style={{ width: frame.width, height: frame.height }}
          >
            {stage.outgoing && (
              <CoverFrame
                key={`out-${stage.seq}`}
                cover={stage.outgoing}
                className="tv-slide-out"
              />
            )}
            {stage.incoming && (
              <CoverFrame
                key={`in-${stage.seq}`}
                cover={stage.incoming}
                className="tv-slide-in"
                onError={() => drop(stage.incoming.id)}
              />
            )}

            {!stage.incoming && <EmptyStage status={status} />}

            {stage.incoming && justIn && showingNewest && (
              <span
                className="absolute top-[-1.5vmin] left-1/2 -translate-x-1/2
                  -translate-y-1/2 rounded-full bg-clay px-[2.2vmin] py-[0.9vmin]
                  text-[clamp(0.6rem,1.35vmin,1rem)] font-bold tracking-[0.22em]
                  text-white uppercase shadow-lift"
              >
                Just in
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */

function CoverFrame({ cover, className = '', onError }) {
  return (
    <img
      src={cover.imageUrl}
      alt="Magazine cover"
      onError={onError}
      className={`absolute inset-0 h-full w-full rounded-[1.4vmin] object-cover
        ring-1 ring-paper/15 shadow-[0_4vmin_10vmin_rgba(0,0,0,0.65)] ${className}`}
    />
  )
}

function AmbientWash({ cover, className = '' }) {
  return (
    <div
      className={`absolute inset-[-15%] bg-cover bg-center blur-[8vmin] saturate-150 ${className}`}
      style={{ backgroundImage: `url("${cover.imageUrl}")` }}
    />
  )
}

function EmptyStage({ status }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-[2vmin]
        rounded-[1.4vmin] border border-dashed border-paper/15 bg-stage-soft/60 px-[6%]
        text-center"
    >
      <TbPhoto className="h-[12vmin] w-[12vmin] animate-pulse text-paper/20" />
      <p className="font-display text-[clamp(1.1rem,3vmin,2.5rem)] font-bold text-paper/80">
        Waiting for the first cover
      </p>
      <p className="max-w-[28ch] text-[clamp(0.75rem,1.7vmin,1.3rem)] text-paper/40">
        {status === 'offline'
          ? 'The live feed is unavailable. Covers will appear as soon as it is back.'
          : 'Every cover generated in the studio appears here the moment it is saved.'}
      </p>
    </div>
  )
}

const STATUS_LABELS = {
  connecting: { text: 'Connecting', dot: 'bg-clay', pulse: true },
  live: { text: 'Live', dot: 'bg-sage', pulse: true },
  reconnecting: { text: 'Reconnecting', dot: 'bg-clay', pulse: true },
  offline: { text: 'Offline', dot: 'bg-danger', pulse: false },
}

function StatusPill({ status }) {
  const { text, dot, pulse } = STATUS_LABELS[status] ?? STATUS_LABELS.connecting

  return (
    <span
      className="flex items-center gap-[1.2vmin] rounded-full border border-paper/15
        bg-paper/5 px-[2vmin] py-[1vmin] text-[clamp(0.62rem,1.4vmin,1.05rem)]
        font-semibold tracking-[0.2em] text-paper/70 uppercase"
    >
      <span className="relative flex aspect-square w-[1.2vmin] min-w-1.5">
        {pulse && (
          <span
            className={`absolute inset-0 animate-ping rounded-full opacity-70 ${dot}`}
          />
        )}
        <span className={`relative h-full w-full rounded-full ${dot}`} />
      </span>
      {text}
    </span>
  )
}
