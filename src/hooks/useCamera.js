import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAMERA_FACING,
  CAMERA_HEIGHT,
  CAMERA_WIDTH,
} from '../config'
import { COVER_RATIO } from '../utils/constants'

/*
  The webcam, as a hook.

  Owns one MediaStream and guarantees it is stopped: a live stream keeps the
  camera's LED on and locks the device against other apps, so every exit path
  here — unmount, a switch to another camera, an error, the caller closing the
  view — goes through stop(). This is the whole reason the stream lives in a
  hook rather than inside the upload page.

  Why getUserMedia at all: <input type="file" capture> is only a hint to a
  mobile OS to open its camera app. On a desktop browser it is ignored entirely,
  so a USB webcam plugged into the laptop driving the kiosk can ONLY be reached
  this way.

  Browser rules worth knowing before debugging a black preview:
    · getUserMedia needs a secure context — https:// or localhost. Opening the
      kiosk over http://192.168.x.x will not prompt, it will simply not exist.
      `isSupported` below reports that case rather than looking broken.
    · Permission is per-origin and remembered. A denied camera stays denied
      until the user clears it in site settings; no amount of retrying helps,
      which is why 'denied' gets its own error kind and its own message.
    · Labels for the device list are empty until permission has been granted
      once, so cameras are only enumerated after the stream opens.
*/

// What went wrong, in terms the UI can write a sentence about.
function classifyError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        kind: 'denied',
        message:
          'Camera access was blocked. Allow the camera in your browser’s site settings, then try again.',
      }
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        kind: 'missing',
        message:
          'No camera was found. Check that the webcam is plugged in, then try again.',
      }
    case 'NotReadableError':
      return {
        kind: 'busy',
        message:
          'The camera is already in use by another app. Close it and try again.',
      }
    default:
      return {
        kind: 'unknown',
        message: err?.message || 'The camera could not be started.',
      }
  }
}

export function useCamera() {
  // 'idle' | 'starting' | 'ready' | 'error'
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  // Guards against a slow getUserMedia resolving after we've already stopped:
  // without it, an unmount mid-request would attach an orphan stream.
  const generationRef = useRef(0)

  const stop = useCallback(() => {
    generationRef.current += 1
    const stream = streamRef.current
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [])

  const start = useCallback(
    async (requestedDeviceId) => {
      const isSupported =
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices?.getUserMedia

      if (!isSupported) {
        setError({
          kind: 'unsupported',
          message:
            'This browser cannot open a camera here. A secure page (https or localhost) is required.',
        })
        setStatus('error')
        return
      }

      // Release any previous stream first — some drivers refuse a second open.
      stop()

      const generation = generationRef.current
      setStatus('starting')
      setError(null)

      /*
        Resolution is requested as `ideal`, never `exact`: an exact constraint a
        camera cannot meet fails the whole call, while ideal lets the browser
        pick its closest mode. Same for the camera choice — a specific deviceId
        wins when the user has picked one, otherwise we express a preference.
      */
      const video = {
        width: { ideal: CAMERA_WIDTH },
        height: { ideal: CAMERA_HEIGHT },
      }
      if (requestedDeviceId) video.deviceId = { ideal: requestedDeviceId }
      else if (CAMERA_FACING) video.facingMode = { ideal: CAMERA_FACING }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio: false,
        })

        // Stopped (or restarted) while we were waiting — discard this stream.
        if (generation !== generationRef.current) {
          for (const track of stream.getTracks()) track.stop()
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Autoplay is only allowed because the stream is muted and playsInline.
          await videoRef.current.play().catch(() => {})
        }

        setDeviceId(stream.getVideoTracks()[0]?.getSettings()?.deviceId ?? null)
        setStatus('ready')

        /*
          Only now are device labels populated — enumerating before permission
          returns a list of unnamed entries that cannot be shown in a picker.
        */
        try {
          const all = await navigator.mediaDevices.enumerateDevices()
          setDevices(all.filter((d) => d.kind === 'videoinput'))
        } catch {
          // A missing device list only costs us the switcher.
        }
      } catch (err) {
        if (generation !== generationRef.current) return
        setError(classifyError(err))
        setStatus('error')
      }
    },
    [stop],
  )

  // Whatever happens, the camera light goes out when this unmounts.
  useEffect(() => stop, [stop])

  /*
    Grab what the guest actually framed.

    The webcam hands us a LANDSCAPE frame (1920x1080), but the preview shows it
    in a portrait box at the cover's ratio with object-cover — so most of the
    width is cropped away on screen and never seen. Capturing the raw frame
    would therefore hand back a wide shot nobody posed for: the guest lines up a
    portrait and receives a landscape.

    So the same crop the preview performs is applied here, centred, which is
    exactly what object-cover does: fill the box on the tighter axis and trim the
    overflow off the other. What is on screen is what gets taken.

    The crop is still made at the stream's NATIVE resolution, not the on-screen
    preview size, so the subject reaches the export scaler in utils/compose.js
    with all its detail intact.

    The preview may be mirrored for the user's comfort; the capture never is, or
    any text in the scene would come out backwards.
  */
  const capture = useCallback(async () => {
    const video = videoRef.current
    const track = streamRef.current?.getVideoTracks()[0]
    if (!video || !track) throw new Error('The camera is not running.')

    const settings = track.getSettings()
    const sourceW = settings.width || video.videoWidth
    const sourceH = settings.height || video.videoHeight
    if (!sourceW || !sourceH) throw new Error('The camera is not ready yet.')

    /*
      The object-cover window, in source pixels. A feed wider than the cover
      (the usual case: 16:9 into a portrait frame) is trimmed left and right;
      a feed that is proportionally taller is trimmed top and bottom instead.
    */
    let width = sourceW
    let height = Math.round(sourceW / COVER_RATIO)
    if (height > sourceH) {
      height = sourceH
      width = Math.round(sourceH * COVER_RATIO)
    }
    const sx = Math.round((sourceW - width) / 2)
    const sy = Math.round((sourceH - height) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(video, sx, sy, width, height, 0, 0, width, height)

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not capture the photo.'))),
        'image/png', // lossless — this is the source for the cover
      ),
    )

    // A File (not a bare Blob) so it flows through the same path as a picked
    // file: the bg-removal upload and fileToDataURL both expect a name.
    return new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' })
  }, [])

  return {
    videoRef,
    status,
    error,
    devices,
    deviceId,
    start,
    stop,
    capture,
    isReady: status === 'ready',
  }
}
