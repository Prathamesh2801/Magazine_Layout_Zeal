import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowRight, FiRefreshCw, FiScissors } from 'react-icons/fi'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ImageUploader from '../components/ImageUploader'
import { useMagazine } from '../context/MagazineContext'
import { removeBackground } from '../services/removeBg'
import { fileToDataURL, getAspectRatio } from '../utils/image'
import { ROUTES } from '../utils/constants'
import { BG_REMOVAL_ENABLED, TEXT_ENABLED } from '../config'

export default function UploadPage() {
  const navigate = useNavigate()
  const { name, setName, setUpload, setPerson, original, file } = useMagazine()
  const [busy, setBusy] = useState(false)

  const onSelect = async (picked) => {
    try {
      const dataUrl = await fileToDataURL(picked)
      setUpload(picked, dataUrl)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file || !original) return toast.error('Please add a photo first.')
    // Only a required field while the cover actually carries a headline.
    if (TEXT_ENABLED && !name.trim())
      return toast.error('Please enter the cover name.')

    setBusy(true)
    const t = toast.loading(
      BG_REMOVAL_ENABLED ? 'Removing background…' : 'Preparing photo…',
    )
    try {
      const { dataUrl, processed } = await removeBackground(file)
      const aspect = await getAspectRatio(dataUrl)
      setPerson(dataUrl, aspect, processed)
      toast.dismiss(t)
      toast.success(processed ? 'Background removed!' : 'Photo ready!')
      navigate(ROUTES.editor)
    } catch (err) {
      toast.dismiss(t)
      toast.error(err.message || 'Could not prepare the photo.')
    } finally {
      setBusy(false)
    }
  }

  const hasImage = Boolean(original?.dataUrl)

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Create your cover
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {BG_REMOVAL_ENABLED
            ? `Add a photo${TEXT_ENABLED ? ' and a name' : ''} — we’ll cut out the subject and drop it onto the magazine.`
            : `Add a photo${TEXT_ENABLED ? ' and a name' : ''} — we’ll drop it onto the magazine for you to position.`}
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        {!hasImage ? (
          <ImageUploader onSelect={onSelect} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="relative overflow-hidden rounded-xl border border-line bg-paper-200">
              <img
                src={original.dataUrl}
                alt="Selected preview"
                className="mx-auto max-h-72 w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setUpload(null, null)}
                className="absolute right-2 top-2 flex items-center gap-1 rounded-lg
                  bg-ink/70 px-2.5 py-1.5 text-xs font-medium text-paper
                  backdrop-blur hover:bg-ink"
              >
                <FiRefreshCw size={13} /> Change
              </button>
            </div>

            {/* Headline field — only when the cover carries one (TEXT_ENABLED). */}
            {TEXT_ENABLED && (
              <div>
                <label htmlFor="cover-name" className="mb-1.5 block text-sm font-semibold text-ink">
                  Cover name
                </label>
                <input
                  id="cover-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  maxLength={40}
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3
                    text-ink placeholder:text-ink-muted focus:border-clay
                    focus:outline-none focus:ring-2 focus:ring-clay/40"
                />
                <p className="mt-1 text-xs text-ink-muted">
                  Shown as the headline over your photo.
                </p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Spinner size={18} /> Processing…
                </>
              ) : BG_REMOVAL_ENABLED ? (
                <>
                  <FiScissors size={18} /> Remove background &amp; continue
                  <FiArrowRight size={18} />
                </>
              ) : (
                <>
                  Continue to editor <FiArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
