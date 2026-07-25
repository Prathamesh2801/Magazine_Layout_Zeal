/** Shared file name for the exported cover — used by the download and the upload. */
export function coverFilename(name) {
  const slug =
    (name || 'maxter-today')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'maxter-today'
  return `${slug}-cover.png`
}
