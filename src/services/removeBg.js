import axios from 'axios'
import { BG_REMOVER_URL } from '../config'
import { blobToDataURL } from '../utils/image'

/*
  Background-removal service.

  Talks to the self-hosted remover at BG_REMOVER_URL (see src/config.js).
  Request shape matches the provided API: multipart form, field name `image`,
  binary image blob back. `validateStatus: () => true` lets us read error
  bodies ourselves instead of throwing on non-2xx.
*/

/** Raw API call — returns the response Blob. */
export async function bgRemover(image) {
  const formData = new FormData()
  formData.append('image', image)

  const response = await axios.post(BG_REMOVER_URL, formData, {
    responseType: 'blob',
    validateStatus: () => true,
  })

  if (response.status < 200 || response.status >= 300) {
    // Error bodies come back as a blob too — surface any text message.
    let message = `Background removal failed (HTTP ${response.status}).`
    try {
      const text = await response.data.text()
      if (text) message = text.slice(0, 200)
    } catch {
      /* non-text error body */
    }
    throw new Error(message)
  }

  return response.data
}

/**
 * Remove the background from an uploaded image.
 *
 * @param {File} file – the original image File
 * @returns {Promise<{ dataUrl: string, processed: boolean }>}
 */
export async function removeBackground(file) {
  const blob = await bgRemover(file)
  const dataUrl = await blobToDataURL(blob)
  return { dataUrl, processed: true }
}
