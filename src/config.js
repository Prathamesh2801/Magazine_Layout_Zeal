// App configuration — single outward source of truth for external endpoints.
export const BASE_URL = "http://192.168.0.88";

/*
  Background-removal feature flag.

  The self-hosted remover (BASE_URL:8004) is not always running. While it is
  down, set this to `false`: the upload step keeps working and carries the
  original photo straight through to the editor, untouched. Flip it back to
  `true` once the service is available — the API client in
  src/services/removeBg.js stays wired up either way.
*/
export const BG_REMOVAL_ENABLED = true;

// Image gallery API (MiniStack). POST multipart/form-data, field: `Image_File`.
export const IMAGE_API_URL = `${BASE_URL}/Ministack/Birthday/API/image.php`;

// Generated covers can be several MB at high export scales — give the upload room.
export const UPLOAD_TIMEOUT_MS = 120000;
