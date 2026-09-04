import { useCallback, useEffect, useRef, useState } from 'react'
import { FiCamera, FiRefreshCw, FiX, FiAlertTriangle } from 'react-icons/fi'
import Button from './ui/Button'
import Spinner from './ui/Spinner'
import { useCamera } from '../hooks/useCamera'
import { COVER_RATIO } from '../utils/constants'
import { CAMERA_COUNTDOWN_S, CAMERA_MIRROR_PREVIEW } from '../config'

/*
  The live webcam view.

  Framed to the cover's own 5:7 portrait ratio rather than the camera's native
  16:9, so what the guest lines up in the preview is what actually lands on the
  cover — the video is cropped by object-cover exactly the way the composed
  layer will be.

  The preview is mirrored (CAMERA_MIRROR_PREVIEW) because people expect a mirror
  when facing a screen; the captured frame is never mirrored — see useCamera.
*/
export default function CameraCapture({ onCapture, onCancel }) {
  const { videoRef, status, error, devices, deviceId, start, stop, capture } =
    useCamera()

  // null when idle, otherwise the seconds remaining before the shutter.
  const [countdown, setCountdown] = useState(null)
  const [flash, setFlash] = useState(false)
  const busyRef = useRef(false)

  useEffect(() => {
    start()
  }, [start])

  const take = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      // A brief white wash on the shutter — the visual "click" that tells the
      // guest the photo was taken, since a webcam has no shutter sound.
      setFlash(true)
      setTimeout(() => setFlash(false), 320)

      const file = await capture()
      stop() // release the camera the moment we have the frame
      onCapture(file)
    } catch (err) {
      busyRef.current = false
      setCountdown(null)
      // Surfaced through the page's toast — this component owns no toasts.
      onCapture(null, err)
    }
  }, [capture, onCapture, stop])

  /*
    The countdown, one second at a time. Ticking down rather than scheduling the
    whole delay up front keeps the number on screen honest across re-renders.
    The shutter fires from inside the timer — not from the effect body — so the
    capture is driven by the elapsed second, not by a render pass.
  */
  useEffect(() => {
    if (countdown === null) return

    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null)
        take()
      } else {
        setCountdown((c) => c - 1)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, take])

  const onShutter = () => {
    if (busyRef.current || countdown !== null) return
    if (CAMERA_COUNTDOWN_S > 0) setCountdown(CAMERA_COUNTDOWN_S)
    else take()
  }

  // Only worth offering when there is actually something to switch to.
  const switchCamera = () => {
    const i = devices.findIndex((d) => d.deviceId === deviceId)
    const next = devices[(i + 1) % devices.length]
    if (next) start(next.deviceId)
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-danger/25 bg-danger-soft/40 p-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
          <FiAlertTriangle size={22} />
        </span>
        <p className="font-semibold text-ink">Camera unavailable</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
          {error?.message}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => start()}>
            <FiRefreshCw size={16} /> Try again
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl bg-ink shadow-lift"
        // Same ratio as the cover, so what the guest frames is what they get.
        style={{ aspectRatio: COVER_RATIO }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={
            CAMERA_MIRROR_PREVIEW ? { transform: 'scaleX(-1)' } : undefined
          }
        />

        {/* Framing guides — subtle, and never in the captured frame. */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-[8%] inset-y-[6%] rounded-xl border border-paper/25" />
        </div>

        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/80 text-paper">
            <Spinner size={26} />
            <p className="text-sm font-medium">Starting the camera…</p>
          </div>
        )}

        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/25">
            <span
              key={countdown}
              className="reveal-tick font-display text-[28vmin] leading-none font-bold text-paper drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
            >
              {countdown}
            </span>
          </div>
        )}

        {/* The shutter "click", since a webcam makes no sound. */}
        {flash && <div className="absolute inset-0 bg-paper camera-flash" />}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          size="lg"
          onClick={onShutter}
          disabled={status !== 'ready' || countdown !== null}
        >
          <FiCamera size={20} />
          {countdown !== null ? 'Get ready…' : 'Take photo'}
        </Button>

        {devices.length > 1 && (
          <Button
            variant="outline"
            size="lg"
            onClick={switchCamera}
            disabled={status !== 'ready' || countdown !== null}
            aria-label="Switch camera"
            title="Switch camera"
          >
            <FiRefreshCw size={18} />
          </Button>
        )}

        {onCancel && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              stop()
              onCancel()
            }}
            aria-label="Close camera"
          >
            <FiX size={18} />
          </Button>
        )}
      </div>
    </div>
  )
}
