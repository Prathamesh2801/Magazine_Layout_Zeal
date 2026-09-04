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
import { useMagazine } from '../context/MagazineContext'
import { composeCover } from '../utils/compose'
import { uploadCoverImage } from '../services/uploadImage'
import { coverFilename } from '../utils/filename'
import {
  ROUTES,
  TEXT_COLORS,
  DEFAULT_PERSON,
  DEFAULT_TEXT,
} from '../utils/constants'
import {
  COVER_FONT_OPTIONS,
  TEXT_CASE_OPTIONS,
  applyTextCase,
  coverFontStack,
  ensureAllCoverFonts,
} from '../utils/coverFont'
import { TEXT_ENABLED, UPLOAD_ENABLED } from '../config'
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
  } = useMagazine()
  // With the headline off (TEXT_ENABLED, src/config.js) the person is the only
  // editable layer, so the selection never leaves it.
  const [selected, setSelected] = useState('person')
  const [phase, setPhase] = useState('idle') // idle | composing | uploading
  const [progress, setProgress] = useState(0)
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

  if (!person?.dataUrl) return null

  /*
    Generate = compose locally, then push the PNG to the image API.
    The upload is best-effort: whatever happens we land on /result, where the
    cover can always be downloaded straight from the browser.

    On an offline kiosk (UPLOAD_ENABLED === false, src/config.js) there is no
    server to post to, so we compose and go — no upload phase, no progress bar,
    no "saved online" panel waiting on the other side.
  */
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Canvas */}
        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <MagazineCanvas
            interactive
            bgSrc={bgSrc}
            overlaySrc={overlaySrc}
            personSrc={person.dataUrl}
            layout={layout}
            selected={selected}
            onSelect={setSelected}
            onChangePerson={updatePersonLayer}
            onChangeText={updateTextLayer}
          />
        </div>

        {/* Controls */}
        <Card className="h-fit p-5">
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
              min={0.1}
              max={1.6}
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
                  <FiDownload size={18} /> Generate cover
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
