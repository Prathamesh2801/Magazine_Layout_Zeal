import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiArrowLeft,
  FiImage,
  FiType,
  FiDownload,
  FiRotateCcw,
  FiUploadCloud,
} from 'react-icons/fi'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import MagazineCanvas from '../components/MagazineCanvas'
import KioskStage from '../components/kiosk/KioskStage'
import { useMagazine } from '../context/MagazineContext'
import { useKeyBindings } from '../hooks/useKeyBindings'
import { composeCover } from '../utils/compose'
import { uploadCoverImage } from '../services/uploadImage'
import { coverFilename } from '../utils/filename'
import {
  ROUTES,
  TEXT_COLORS,
  DEFAULT_PERSON,
  DEFAULT_TEXT,
  PERSON_MAX_WIDTH,
  PERSON_MIN_WIDTH,
} from '../utils/constants'
import {
  COVER_FONT_OPTIONS,
  TEXT_CASE_OPTIONS,
  applyTextCase,
  coverFontStack,
  ensureAllCoverFonts,
} from '../utils/coverFont'
import CoverFinale from '../components/CoverFinale'
import {
  IMMERSIVE_KIOSK,
  INSTANT_FINISH,
  KEY_FINE_MULTIPLIER,
  KEY_MOVE_STEP,
  KEY_SIZE_STEP,
  TEXT_ENABLED,
  UPLOAD_ENABLED,
} from '../config'
import bgSrc from '../assets/bg.jpeg'
import overlaySrc from '../assets/overlay.png'

export default function EditorPage() {
  const navigate = useNavigate()
  const {
    person,
    layout,
    name,
    updatePersonLayer,
    updateTextLayer,
    setFinal,
    setRemote,
    reset,
  } = useMagazine()
  // With the headline off (TEXT_ENABLED, src/config.js) the person is the only
  // editable layer, so the selection never leaves it.
  const [selected, setSelected] = useState('person')
  const [phase, setPhase] = useState('idle') // idle | composing | uploading
  const [progress, setProgress] = useState(0)
  // The finished cover, held up full screen while INSTANT_FINISH runs its hold.
  const [finaleUrl, setFinaleUrl] = useState(null)
  const busy = phase !== 'idle'

  // Guard: no processed image means the user skipped the upload step.
  useEffect(() => {
    if (!person?.dataUrl) navigate(ROUTES.upload, { replace: true })
  }, [person, navigate])

  // Load every cover font up front so the picker can preview each in its own
  // face. No picker, nothing to preload.
  useEffect(() => {
    if (TEXT_ENABLED) ensureAllCoverFonts()
  }, [])

  /*
    Generate = compose locally, then push the PNG to the image API.
    The upload is best-effort: whatever happens we land on /result, where the
    cover can always be downloaded straight from the browser.

    On an offline kiosk (UPLOAD_ENABLED === false, src/config.js) there is no
    server to post to, so we compose and go — no upload phase, no progress bar,
    no "saved online" panel waiting on the other side.
  */
  /*
    Hand the PNG to the browser. Built from the blob rather than the object URL
    already in context so the file is saved even if that URL is revoked by a
    reset racing this download.
  */
  const saveCover = (blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = coverFilename(name)
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Give the browser a moment to take the file before the URL goes away.
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  /*
    End of session: clear everything the guest entered and return to the attract
    screen, where the camera is off until someone taps Start.
  */
  const finishSession = () => {
    setFinaleUrl(null)
    reset()
    navigate(ROUTES.upload, { replace: true })
  }

  const onGenerate = async () => {
    if (busy) return

    setPhase('composing')
    let composed
    try {
      composed = await composeCover({
        bgSrc,
        personSrc: person.dataUrl,
        overlaySrc,
        layout,
      })
      setFinal(composed.url, {
        width: composed.width,
        height: composed.height,
        scale: composed.scale,
      })
    } catch (err) {
      toast.error(err.message || 'Could not generate the cover.')
      setPhase('idle')
      return // nothing to show on /result — stay put so the user can retry
    }

    /*
      INSTANT_FINISH: the kiosk finishes here instead of on /result. Hand the
      guest the PNG straight away, hold the cover up for a beat, then reset for
      the next person — one cover per session, no extra screen to dismiss.
    */
    if (INSTANT_FINISH) {
      saveCover(composed.blob)
      setFinaleUrl(composed.url)
      setPhase('idle')
      return
    }

    if (!UPLOAD_ENABLED) {
      setPhase('idle')
      navigate(ROUTES.result)
      return
    }

    setProgress(0)
    setPhase('uploading')
    setRemote({ status: 'uploading', imagePath: null, downloadUrl: null, error: null })

    try {
      const result = await toast.promise(
        uploadCoverImage(composed.blob, {
          filename: coverFilename(name),
          onProgress: setProgress,
        }),
        {
          loading: 'Uploading your cover…',
          success: 'Cover uploaded!',
          error: (err) => err?.message || 'Upload failed — download still works.',
        },
      )
      setRemote({
        status: 'success',
        imagePath: result.imagePath,
        downloadUrl: result.downloadUrl,
        error: null,
      })
    } catch (err) {
      setRemote({
        status: 'error',
        imagePath: null,
        downloadUrl: null,
        error: err?.message || 'Upload failed.',
      })
    } finally {
      setPhase('idle')
      navigate(ROUTES.result)
    }
  }

  const resetLayers = () => {
    updatePersonLayer({ ...DEFAULT_PERSON })
    if (TEXT_ENABLED) {
      updateTextLayer({
        x: DEFAULT_TEXT.x,
        y: DEFAULT_TEXT.y,
        fontScale: DEFAULT_TEXT.fontScale,
      })
    }
    toast('Layout reset', { icon: '↺' })
  }

  /*
    The keyboard's half of the editor.

    These write the same normalised layout the pointer does — MovableLayer and
    these steps are two ways into one state — so a guest can start a drag with
    the mouse and finish it with the arrows without the two disagreeing. Holding
    Shift shrinks the step (KEY_FINE_MULTIPLIER) for the last few pixels of
    placement; the browser's own key repeat supplies the "held down" motion, so
    there is no timer here to keep in sync with anything.
  */
  const nudge = (dx, dy, event) => {
    const step = KEY_MOVE_STEP * (event?.shiftKey ? KEY_FINE_MULTIPLIER : 1)
    updatePersonLayer({
      x: clamp(layout.person.x + dx * step, 0, 1),
      y: clamp(layout.person.y + dy * step, 0, 1),
    })
  }

  const resizeBy = (direction, event) => {
    const step = KEY_SIZE_STEP * (event?.shiftKey ? KEY_FINE_MULTIPLIER : 1)
    updatePersonLayer({
      width: clamp(
        layout.person.width + direction * step,
        PERSON_MIN_WIDTH,
        PERSON_MAX_WIDTH,
      ),
    })
  }

  useKeyBindings(
    {
      moveLeft: (e) => nudge(-1, 0, e),
      moveRight: (e) => nudge(1, 0, e),
      moveUp: (e) => nudge(0, -1, e),
      moveDown: (e) => nudge(0, 1, e),
      grow: (e) => resizeBy(1, e),
      shrink: (e) => resizeBy(-1, e),
      resetLayout: resetLayers,
      finish: onGenerate,
      /*
        Esc abandons the whole session rather than stepping back a page. The
        windowed studio's Back button keeps the photo so it can be retaken, but
        on the kiosk the guest who presses Esc is walking away — leaving their
        face in context for the next person to find would be both confusing and
        a small privacy leak, so this clears everything.
      */
      quit: finishSession,
    },
    /*
      Disabled while composing (a second Enter would start a second export) and
      during the finale, which is deliberately not interactive. Also gated on the
      photo actually being here: the redirect above runs in an effect, so for one
      render this component exists with no subject for onGenerate to compose.
    */
    IMMERSIVE_KIOSK && Boolean(person?.dataUrl) && !busy && !finaleUrl,
  )

  if (!person?.dataUrl) return null

  // Takes over the whole viewport — the editor behind it is finished business.
  if (finaleUrl) {
    return <CoverFinale src={finaleUrl} onDone={finishSession} />
  }

  const canvas = (
    <MagazineCanvas
      interactive
      flush={IMMERSIVE_KIOSK}
      bgSrc={bgSrc}
      overlaySrc={overlaySrc}
      personSrc={person.dataUrl}
      layout={layout}
      selected={selected}
      onSelect={setSelected}
      onChangePerson={updatePersonLayer}
      onChangeText={updateTextLayer}
    />
  )

  /*
    The kiosk editor: the composition at the size of the panel, and nothing
    else. The sliders and the layer tabs are gone because there is no one to
    click them — the arrows move the subject, +/- resize it, Enter finishes —
    but the canvas itself stays fully interactive, so a mouse plugged into the
    kiosk still drags and resizes exactly as it does in the windowed studio.
  */
  if (IMMERSIVE_KIOSK) {
    return (
      <KioskStage
        hints={[
          { keys: ['←', '→', '↑', '↓'], label: 'Move' },
          { keys: ['+', '−'], label: 'Resize' },
          { keys: ['R'], label: 'Reset' },
          { keys: ['Enter'], label: 'Save my cover' },
          { keys: ['Esc'], label: 'Back' },
        ]}
      >
        <div className="absolute inset-0">{canvas}</div>

        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[2vmin] bg-stage/75">
            <Spinner size="max(2rem,6vmin)" thickness="max(2px,0.5vmin)" />
            <p className="text-kiosk-base font-medium text-paper">
              {phase === 'uploading'
                ? `Uploading… ${progress}%`
                : 'Making your cover…'}
            </p>
          </div>
        )}
      </KioskStage>
    )
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Compose your cover
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {TEXT_ENABLED
            ? 'Drag to move · pull the corner handle to resize. Tap a layer to select it.'
            : 'Drag to move · pull the corner handle to resize.'}
        </p>
      </div>

      {/*
        Portrait (the kiosk TV) keeps a single column with the cover on top —
        the `landscape:` guard matters because a 1080x1920 panel is wider than
        the `lg` breakpoint and would otherwise be handed a cramped sidebar.
      */}
      <div className="grid grid-cols-1 gap-5 landscape:lg:grid-cols-[1fr_340px] landscape:lg:gap-6">
        {/* Canvas — capped so it cannot crowd out the controls on a tall panel. */}
        <div className="mx-auto w-full max-w-[min(72vh,28rem)] landscape:lg:max-w-none">
          {canvas}
        </div>

        {/* Controls */}
        <Card className="mx-auto h-fit w-full max-w-md p-4 sm:p-5 landscape:lg:max-w-none">
          {/* Layer switcher — a switcher only makes sense with two layers to
              switch between, so it goes with the headline (TEXT_ENABLED). */}
          {TEXT_ENABLED && (
            <div className="mb-5 grid grid-cols-2 gap-2">
              <LayerTab
                active={selected === 'person'}
                icon={<FiImage size={16} />}
                label="Photo"
                onClick={() => setSelected('person')}
              />
              <LayerTab
                active={selected === 'text'}
                icon={<FiType size={16} />}
                label="Name"
                onClick={() => setSelected('text')}
              />
            </div>
          )}

          {!TEXT_ENABLED || selected === 'person' ? (
            <Control
              label="Photo size"
              value={layout.person.width}
              min={PERSON_MIN_WIDTH}
              max={PERSON_MAX_WIDTH}
              step={0.01}
              onChange={(v) => updatePersonLayer({ width: v })}
            />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Font</p>
                <div className="grid grid-cols-2 gap-2">
                  {COVER_FONT_OPTIONS.map((font) => (
                    <button
                      key={font.key}
                      type="button"
                      onClick={() => updateTextLayer({ fontKey: font.key })}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        layout.text.fontKey === font.key
                          ? 'border-clay bg-clay/10 text-ink'
                          : 'border-line bg-paper text-ink-soft hover:bg-paper-200'
                      }`}
                    >
                      {/* Each option renders in its own face — pick by eye. */}
                      <span
                        className="block truncate text-lg leading-tight"
                        style={{
                          fontFamily: coverFontStack(font.key),
                          fontWeight: font.weight,
                        }}
                      >
                        {applyTextCase(name || 'Aa Bb Cc', layout.text.textCase)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-muted">
                        {font.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Letter case</p>
                <div className="grid grid-cols-3 gap-2">
                  {TEXT_CASE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      title={option.hint}
                      onClick={() => updateTextLayer({ textCase: option.key })}
                      className={`rounded-xl border px-2 py-2 text-sm font-semibold
                        transition-colors ${
                          layout.text.textCase === option.key
                            ? 'border-clay bg-clay text-white'
                            : 'border-line bg-paper text-ink-soft hover:bg-paper-200'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <Control
                label="Text size"
                value={layout.text.fontScale}
                min={0.03}
                max={0.2}
                step={0.005}
                onChange={(v) => updateTextLayer({ fontScale: v })}
              />
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Text color</p>
                <div className="flex flex-wrap gap-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Use color ${c}`}
                      onClick={() => updateTextLayer({ color: c })}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        layout.text.color === c
                          ? 'border-clay ring-2 ring-clay/40'
                          : 'border-white shadow-soft'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {!name && (
                <p className="text-xs text-ink-muted">
                  Tip: add a name on the previous step to show a headline.
                </p>
              )}
            </div>
          )}

          <hr className="my-5 border-line" />

          <div className="space-y-2.5">
            <Button size="lg" className="w-full" onClick={onGenerate} disabled={busy}>
              {phase === 'composing' && (
                <>
                  <Spinner size={18} /> Generating…
                </>
              )}
              {phase === 'uploading' && (
                <>
                  <Spinner size={18} /> Uploading… {progress}%
                </>
              )}
              {phase === 'idle' && (
                <>
                  <FiDownload size={18} />
                  {INSTANT_FINISH ? 'Generate & download' : 'Generate cover'}
                </>
              )}
            </Button>

            {phase === 'uploading' && (
              <div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200"
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-clay transition-[width] duration-200"
                    style={{ width: `${Math.max(4, progress)}%` }}
                  />
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  <FiUploadCloud size={13} /> Saving to the gallery — you can
                  download it either way.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => navigate(ROUTES.upload)}
              >
                <FiArrowLeft size={16} /> Back
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                disabled={busy}
                onClick={resetLayers}
              >
                <FiRotateCcw size={16} /> Reset
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

function LayerTab({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5
        text-sm font-semibold transition-colors ${
          active
            ? 'border-clay bg-clay text-white'
            : 'border-line bg-paper text-ink-soft hover:bg-paper-200'
        }`}
    >
      {icon}
      {label}
    </button>
  )
}

function Control({ label, value, min, max, step, onChange }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-xs text-ink-muted">{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-paper-300
          accent-clay"
      />
    </div>
  )
}
