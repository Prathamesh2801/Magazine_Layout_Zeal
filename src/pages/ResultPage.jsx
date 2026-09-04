import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiDownload,
  FiEdit2,
  FiPlus,
  FiCheck,
  FiAlertTriangle,
  FiLink,
  FiExternalLink,
  FiCopy,
} from 'react-icons/fi'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useMagazine } from '../context/MagazineContext'
import { ROUTES } from '../utils/constants'
import { coverFilename } from '../utils/filename'
import { UPLOAD_ENABLED } from '../config'

/*
  The reveal.

  On the kiosk this is the payoff screen — the guest has been watching a
  progress spinner and now wants to see their cover. So the cover is the hero:
  it lifts in first, on its own, and the controls fade up underneath it a beat
  later rather than everything appearing at once.

  The download button carries its own state (idle → saving → saved) instead of
  relying on a toast, because on a wall-mounted portrait screen a toast at the
  top of the viewport can sit well above where the user is actually looking.
*/
export default function ResultPage() {
  const navigate = useNavigate()
  const { finalDataUrl, finalMeta, name, remote, reset } = useMagazine()

  // 'idle' | 'saving' | 'saved' — drives the button's own feedback.
  const [saveState, setSaveState] = useState('idle')

  useEffect(() => {
    if (!finalDataUrl) navigate(ROUTES.upload, { replace: true })
  }, [finalDataUrl, navigate])

  // Let the confirmation sit long enough to register, then return the button to
  // its normal state so a second copy can be taken.
  useEffect(() => {
    if (saveState !== 'saved') return
    const timer = setTimeout(() => setSaveState('idle'), 2600)
    return () => clearTimeout(timer)
  }, [saveState])

  if (!finalDataUrl) return null

  const filename = coverFilename(name)
  const sharedLink = remote?.downloadUrl || remote?.imagePath || null

  const download = () => {
    if (saveState === 'saving') return
    setSaveState('saving')

    const a = document.createElement('a')
    a.href = finalDataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()

    /*
      The browser gives no signal that a download started, so the short beat
      here is deliberate: it makes the button feel like it did something rather
      than flickering straight to "Saved" before the tap has even lifted.
    */
    setTimeout(() => setSaveState('saved'), 550)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedLink)
      toast.success('Link copied!')
    } catch {
      toast.error('Could not copy — long-press the link to copy it.')
    }
  }

  const startOver = () => {
    reset()
    navigate(ROUTES.upload)
  }

  /*
    Portrait-first: on the kiosk TV the cover stacks under the heading and takes
    the width, with the actions below it under the thumb. The two-column
    arrangement is reserved for landscape (`lg:`), where there is room beside
    the cover.
  */
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center lg:max-w-5xl">
      <div className="reveal-head mb-6 flex flex-col items-center text-center sm:mb-8">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage">
          <FiCheck size={26} className="reveal-tick" />
        </span>
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Your cover is ready
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {finalMeta
            ? `Exported as a lossless PNG at ${finalMeta.width} × ${finalMeta.height}.`
            : 'Your cover has been exported.'}
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-6 sm:gap-8
        lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* The hero — lifts in on its own before the controls arrive. */}
        <Card className="reveal-cover mx-auto w-full max-w-[min(78vw,26rem)]
          overflow-hidden p-2 lg:max-w-none">
          <img
            src={finalDataUrl}
            alt={`${name || 'Magazine'} cover`}
            className="w-full rounded-lg"
          />
        </Card>

        <div className="reveal-actions mx-auto w-full max-w-md space-y-3 lg:max-w-none">
          <Button
            size="lg"
            className={`w-full transition-colors duration-300 ${
              saveState === 'saved' ? '!bg-sage hover:!bg-sage' : ''
            }`}
            onClick={download}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saved' ? (
              <>
                <FiCheck size={18} className="reveal-tick" /> Saved to your device
              </>
            ) : saveState === 'saving' ? (
              <>
                <FiDownload size={18} className="animate-bounce" /> Saving…
              </>
            ) : (
              <>
                <FiDownload size={18} /> Download PNG
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate(ROUTES.editor)}
          >
            <FiEdit2 size={16} /> Keep editing
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={startOver}>
            <FiPlus size={16} /> Start a new cover
          </Button>
        </div>
      </div>

      {/*
        Upload outcome — informational only, and only ever present on a
        networked setup. On the offline kiosk (UPLOAD_ENABLED === false) there
        is no server, so neither panel below can appear.
      */}
      {UPLOAD_ENABLED && remote?.status === 'success' && sharedLink && (
        <div className="reveal-actions mt-6 rounded-xl border border-sage/30 bg-sage/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FiLink size={15} className="text-sage" /> Saved online
          </p>
          <p className="mt-1 break-all font-mono text-xs text-ink-soft">
            {sharedLink}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={copyLink}>
              <FiCopy size={14} /> Copy link
            </Button>
            <a
              href={sharedLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl
                border border-line px-3 py-1.5 text-sm font-semibold text-ink
                transition-colors hover:bg-paper-100"
            >
              <FiExternalLink size={14} /> Open
            </a>
          </div>
        </div>
      )}

      {UPLOAD_ENABLED && remote?.status === 'error' && (
        <div className="reveal-actions mt-6 rounded-xl border border-danger/25 bg-danger-soft/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FiAlertTriangle size={15} className="text-danger" /> Couldn&apos;t
            save online
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {remote.error} Your cover is finished either way — use{' '}
            <span className="font-semibold text-ink">Download PNG</span> above to
            keep it.
          </p>
        </div>
      )}
    </div>
  )
}
