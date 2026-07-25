import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiDownload,
  FiEdit2,
  FiPlus,
  FiCheckCircle,
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

export default function ResultPage() {
  const navigate = useNavigate()
  const { finalDataUrl, finalMeta, name, remote, reset } = useMagazine()

  useEffect(() => {
    if (!finalDataUrl) navigate(ROUTES.upload, { replace: true })
  }, [finalDataUrl, navigate])

  if (!finalDataUrl) return null

  const filename = coverFilename(name)
  const sharedLink = remote?.downloadUrl || remote?.imagePath || null

  const download = () => {
    const a = document.createElement('a')
    a.href = finalDataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success('Cover downloaded!')
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-sage/15 text-sage">
          <FiCheckCircle size={24} />
        </span>
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Your cover is ready
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {finalMeta
            ? `Exported as a lossless PNG at ${finalMeta.width} × ${finalMeta.height}. Download or keep editing.`
            : 'Download or keep editing.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
        <Card className="overflow-hidden p-2">
          <img
            src={finalDataUrl}
            alt={`${name || 'Magazine'} cover`}
            className="w-full rounded-lg"
          />
        </Card>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={download}>
            <FiDownload size={18} /> Download PNG
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

      {/* Upload outcome — informational only, the download above always works. */}
      {remote?.status === 'success' && sharedLink && (
        <div className="mt-6 rounded-xl border border-sage/30 bg-sage/10 p-4">
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

      {remote?.status === 'error' && (
        <div className="mt-6 rounded-xl border border-danger/25 bg-danger-soft/50 p-4">
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
