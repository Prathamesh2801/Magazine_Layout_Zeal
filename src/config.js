// App configuration — single outward source of truth for external endpoints.
export const BASE_URL = "http://localhost";

/*
  Background-removal feature flag.

  The self-hosted remover (BASE_URL:8004) is not always running. While it is
  down, set this to `false`: the upload step keeps working and carries the
  original photo straight through to the editor, untouched. Flip it back to
  `true` once the service is available — the API client in
  src/services/removeBg.js stays wired up either way.
*/
export const BG_REMOVAL_ENABLED = false;

// Image gallery API (MiniStack). POST multipart/form-data, field: `Image_File`.
export const IMAGE_API_URL = `${BASE_URL}/Ministack/Scenesnap_UK/API/api.php`;

// Generated covers can be several MB at high export scales — give the upload room.
export const UPLOAD_TIMEOUT_MS = 120000;

/*
  Live cover feed for the /tv wall (Server-Sent Events).

  The server pushes whichever cover is currently "playing" — in practice the
  most recent successful upload from api.php above.
*/
export const SSE_URL = `${BASE_URL}/Ministack/Scenesnap_UK/API/sse.php`;

// TV wall: how many covers the reel remembers, and how long each one holds the
// screen before the carousel advances.
export const TV_REEL_LIMIT = 20;
export const TV_SLIDE_MS = 7000;

// Duration of the slide between two covers. Must match the CSS animations
// (.tv-slide-in / .tv-slide-out in index.css) so the outgoing frame is unmounted
// exactly when it finishes leaving.
export const TV_TRANSITION_MS = 900;
