import { useCallback, useEffect, useState } from 'react'
import { TV_REEL_LIMIT } from '../config'
import { subscribeToCovers } from '../services/coverStream'

/*
  The reel behind the /tv wall.

  The API has no "list covers" endpoint — sse.php only ever reports the one
  cover playing right now — so the history of previous covers is something we
  accumulate here, from the stream, and keep in localStorage. That is what lets
  a display that reboots (or a tab reopened next morning) still have a reel to
  show instead of a blank screen until the next upload.

  Order is oldest → newest. Appending rather than prepending matters: it means a
  new arrival never renumbers the covers already on screen, so the carousel's
  index stays pointing at the same cover it was showing.
*/

const STORAGE_KEY = 'maxter.tv.reel.v1'

function loadReel() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!Array.isArray(saved)) return []
    return saved
      .filter((c) => c && typeof c.id === 'string' && typeof c.imageUrl === 'string')
      .slice(-TV_REEL_LIMIT)
  } catch {
    return []
  }
}

export function useCoverReel() {
  const [reel, setReel] = useState(loadReel)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    return subscribeToCovers({
      onStatus: setStatus,
      onCover: (cover) => {
        setReel((prev) => {
          // Already the newest — this is one of the stream's keep-alive repeats.
          if (prev[prev.length - 1]?.id === cover.id) return prev

          // An older cover can be re-played; it moves to the front of the queue
          // rather than appearing twice.
          const rest = prev.filter((c) => c.id !== cover.id)
          return [...rest, { ...cover, receivedAt: Date.now() }].slice(
            -TV_REEL_LIMIT,
          )
        })
      },
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reel))
    } catch {
      // A full or disabled store only costs us history across reloads.
    }
  }, [reel])

  /*
    Covers are remembered by URL, so a file cleared from the server's uploads
    folder would otherwise sit in the reel as a permanently broken frame. The
    <img> onError handler retires it.
  */
  const drop = useCallback((id) => {
    setReel((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { reel, status, drop }
}
