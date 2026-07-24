import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiArrowLeft,
  FiImage,
  FiType,
  FiDownload,
  FiRotateCcw,
} from 'react-icons/fi'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import MagazineCanvas from '../components/MagazineCanvas'
import { useMagazine } from '../context/MagazineContext'
import { composeCover } from '../utils/compose'
import {
  ROUTES,
  TEXT_COLORS,
  DEFAULT_PERSON,
  DEFAULT_TEXT,
} from '../utils/constants'
import bgSrc from '../assets/bg.png'
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
  } = useMagazine()
  const [selected, setSelected] = useState('person')
  const [busy, setBusy] = useState(false)

  // Guard: no processed image means the user skipped the upload step.
  useEffect(() => {
    if (!person?.dataUrl) navigate(ROUTES.upload, { replace: true })
  }, [person, navigate])

  if (!person?.dataUrl) return null

  const onGenerate = async () => {
    setBusy(true)
    try {
      const { url, width, height, scale } = await composeCover({
        bgSrc,
        personSrc: person.dataUrl,
        overlaySrc,
        layout,
      })
      setFinal(url, { width, height, scale })
      navigate(ROUTES.result)
    } catch (err) {
      toast.error(err.message || 'Could not generate the cover.')
    } finally {
      setBusy(false)
    }
  }

  const resetLayers = () => {
    updatePersonLayer({ ...DEFAULT_PERSON })
    updateTextLayer({ x: DEFAULT_TEXT.x, y: DEFAULT_TEXT.y, fontScale: DEFAULT_TEXT.fontScale })
    toast('Layout reset', { icon: '↺' })
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Compose your cover
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Drag to move · pull the corner handle to resize. Tap a layer to select it.
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
          {/* Layer switcher */}
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

          {selected === 'person' ? (
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
              {busy ? (
                <>
                  <Spinner size={18} /> Generating…
                </>
              ) : (
                <>
                  <FiDownload size={18} /> Generate cover
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(ROUTES.upload)}
              >
                <FiArrowLeft size={16} /> Back
              </Button>
              <Button variant="ghost" className="flex-1" onClick={resetLayers}>
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
