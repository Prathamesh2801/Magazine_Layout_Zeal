import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiDownload, FiEdit2, FiPlus, FiCheckCircle } from 'react-icons/fi'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useMagazine } from '../context/MagazineContext'
import { ROUTES } from '../utils/constants'

export default function ResultPage() {
  const navigate = useNavigate()
  const { finalDataUrl, finalMeta, name, reset } = useMagazine()

  useEffect(() => {
    if (!finalDataUrl) navigate(ROUTES.upload, { replace: true })
  }, [finalDataUrl, navigate])

  if (!finalDataUrl) return null

  const filename = `${(name || 'maxter-today').trim().toLowerCase().replace(/\s+/g, '-')}-cover.png`

  const download = () => {
    const a = document.createElement('a')
    a.href = finalDataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success('Cover downloaded!')
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
    </div>
  )
}
