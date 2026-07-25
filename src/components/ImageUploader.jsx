import { useRef } from 'react'
import toast from 'react-hot-toast'
import { FiCamera, FiUploadCloud } from 'react-icons/fi'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

/*
  Dual-input picker: native camera capture (tablet/phone) and file upload.
  Both use a hidden <input type="file"> — `capture` hints the camera on
  mobile/tablet without blocking desktop file selection.
*/
export default function ImageUploader({ onSelect }) {
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return

    if (!ACCEPTED.includes(file.type)) {
      toast.error('Please choose a PNG, JPG or WebP image.')
      return
    }
    // No client-side size cap — DSLR originals are wanted at full resolution.
    // Any limit is the server's to enforce and report.
    onSelect(file)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={uploadRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={handleFile}
      />

      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="group flex flex-col items-center gap-2 rounded-2xl border-2
          border-dashed border-line bg-paper-100 px-4 py-8 text-ink-soft
          transition-colors hover:border-clay hover:bg-paper-200"
      >
        <FiCamera size={30} className="text-clay" />
        <span className="font-semibold text-ink">Take a photo</span>
        <span className="text-xs text-ink-muted">Use your camera</span>
      </button>

      <button
        type="button"
        onClick={() => uploadRef.current?.click()}
        className="group flex flex-col items-center gap-2 rounded-2xl border-2
          border-dashed border-line bg-paper-100 px-4 py-8 text-ink-soft
          transition-colors hover:border-clay hover:bg-paper-200"
      >
        <FiUploadCloud size={30} className="text-clay" />
        <span className="font-semibold text-ink">Upload image</span>
        <span className="text-xs text-ink-muted">PNG, JPG or WebP · full resolution</span>
      </button>
    </div>
  )
}
