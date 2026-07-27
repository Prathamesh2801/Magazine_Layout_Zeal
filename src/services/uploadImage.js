import axios from "axios";
import { IMAGE_API_URL, UPLOAD_TIMEOUT_MS } from "../config";
import { toReachableUrl } from "./apiOrigin";

/*
  Cover upload service (MiniStack image API).

  Request : POST multipart/form-data, single field `Image_File`.
  Response: { Status: "True", Message, Image_Path, Download_Image }

  `validateStatus: () => true` lets us read the JSON body on non-2xx replies
  (the API answers 201 on success) instead of throwing a generic axios error.
*/

/**
 * Upload a generated cover.
 *
 * @param {Blob} blob – the exported PNG
 * @param {object} [opts]
 * @param {string} [opts.filename]   – name sent with the multipart part
 * @param {(pct:number)=>void} [opts.onProgress] – 0..100 upload progress
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ message: string, imagePath: string|null, downloadUrl: string|null }>}
 */
export async function uploadCoverImage(blob, opts = {}) {
  const { filename = "cover.png", onProgress, signal } = opts;

  if (!blob) throw new Error("Nothing to upload.");

  const formData = new FormData();
  formData.append("file", blob, filename);

  let response;
  try {
    response = await axios.post(IMAGE_API_URL, formData, {
      validateStatus: () => true,
      timeout: UPLOAD_TIMEOUT_MS,
      signal,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        }
      },
    });
  } catch (err) {
    // Network down, CORS blocked, timeout, aborted — no HTTP reply to inspect.
    if (err?.code === "ECONNABORTED") {
      throw new Error("Upload timed out.", { cause: err });
    }
    throw new Error(err?.message || "Could not reach the image server.", {
      cause: err,
    });
  }

  const data = response.data;
  const ok =
    response.status >= 200 &&
    response.status < 300 &&
    String(data?.Status).toLowerCase() === "true";

  if (!ok) {
    throw new Error(
      data?.Message || `Upload failed (HTTP ${response.status}).`
    );
  }

  return {
    message: data.Message || "File uploaded.",
    imagePath: toReachableUrl(data.Image_Path),
    downloadUrl: toReachableUrl(data.Download_Image),
  };
}
