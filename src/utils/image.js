// Small, dependency-free image helpers shared across the app.

/** Read a File/Blob into a data URL string. */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

/** Convert a Blob to a data URL string. */
export function blobToDataURL(blob) {
  return fileToDataURL(blob)
}

/** Load an HTMLImageElement from a src (data URL / object URL). Resolves with the element. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load.'))
    img.src = src
  })
}

/** Natural aspect ratio (w/h) of an image src. */
export async function getAspectRatio(src) {
  const img = await loadImage(src)
  return img.naturalWidth / img.naturalHeight
}
