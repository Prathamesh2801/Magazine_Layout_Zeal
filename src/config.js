// App configuration — single outward source of truth for external endpoints.
export const BASE_URL = "http://192.168.1.3";

/*
  Background-removal feature flag.

  The self-hosted remover (BASE_URL:8004) is not always running. While it is
  down, set this to `false`: the upload step keeps working and carries the
  original photo straight through to the editor, untouched. Flip it back to
  `true` once the service is available — the API client in
  src/services/removeBg.js stays wired up either way.
*/
export const BG_REMOVAL_ENABLED = true;

/*
  Name / headline text feature flag.

  Some cover artwork has no room for a headline — the design already carries its
  own typography, and a name laid over it only fights the art. While this is
  `false` the text layer is gone end to end: the upload form asks for a photo
  only, the editor drops the Name controls, and the export composites three
  layers instead of four.

  Flip it back to `true` for artwork that does want a name and everything
  returns — the whole text pipeline (utils/coverFont.js, the layout state, both
  renderers) stays wired up either way, so nothing needs rebuilding.
*/
export const TEXT_ENABLED = false;

/*
  Live cover feed / display-wall feature flag.

  The /tv wall depends on sse.php being available (see SSE_URL below). While this
  is `false` the route is not registered at all — /#/tv does not resolve — and
  nothing in the app ever opens an EventSource. The studio flow (upload → editor
  → result) is untouched and works exactly the same.

  Flip it to `true` on an event where the display wall is actually set up.
*/
export const TV_ENABLED = false;

/*
  Cover upload feature flag.

  This app also runs as a self-contained kiosk: a vertical portrait touch TV on
  an offline localhost setup, with no MiniStack server behind it. There is no
  api.php to POST to there, so while this is `false` nothing is uploaded — the
  finished cover is simply handed to the user as a download, which is the whole
  point of the kiosk anyway.

  Flip it to `true` for an networked event where the gallery API is up; the
  client in src/services/uploadImage.js stays wired up either way, and the
  result page picks its "saved online" panel back up automatically.

  Note TV_ENABLED depends on this in practice: the display wall shows whatever
  the server is serving, so a wall with nothing being uploaded stays empty.
*/
export const UPLOAD_ENABLED = false;

// Image gallery API (MiniStack). POST multipart/form-data, field: `Image_File`.
export const IMAGE_API_URL = `${BASE_URL}/Ministack/Birthday/API/api.php`;

// Generated covers can be several MB at high export scales — give the upload room.
export const UPLOAD_TIMEOUT_MS = 120000;

/*
  Live cover feed for the /tv wall (Server-Sent Events).

  The server pushes whichever cover is currently "playing" — in practice the
  most recent successful upload from api.php above.
*/
export const SSE_URL = `${BASE_URL}/Ministack/Birthday/API/sse.php`;

// TV wall: how many covers the reel remembers, and how long each one holds the
// screen before the carousel advances.
export const TV_REEL_LIMIT = 20;
export const TV_SLIDE_MS = 7000;

// Duration of the slide between two covers. Must match the CSS animations
// (.tv-slide-in / .tv-slide-out in index.css) so the outgoing frame is unmounted
// exactly when it finishes leaving.
export const TV_TRANSITION_MS = 900;
