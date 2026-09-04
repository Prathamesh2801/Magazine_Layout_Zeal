// App configuration — single outward source of truth for external endpoints.
// export const BASE_URL = "http://192.168.1.3";
export const BASE_URL = "http://127.0.0.1";

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

/*
  Where the photo comes from. Two independent switches — the upload page shows
  whichever sources are on, so either alone gives a single-purpose screen and
  both together give the guest a choice.

  CAMERA_ENABLED opens a live webcam preview in the page via getUserMedia and
  grabs the frame to a canvas. This is the kiosk path: an external USB webcam on
  a laptop driving the portrait TV. Note it is deliberately NOT the old
  <input capture> approach — `capture` is only a hint to mobile OSes to launch
  their built-in camera app, and on a desktop browser it does nothing at all, so
  a USB webcam can only be reached through getUserMedia.

  FILE_UPLOAD_ENABLED is the ordinary "choose a file" picker. Turn it off on the
  kiosk, where there is no keyboard, no file system worth browsing, and the
  webcam is the only sensible source.

  Turning both off would leave no way to add a photo, so the upload page falls
  back to the file picker and says so rather than showing a dead end.
*/
export const CAMERA_ENABLED = true;
export const FILE_UPLOAD_ENABLED = false;

/*
  Requested webcam resolution. The browser treats these as an ideal, not a
  guarantee: it picks the closest mode the device actually supports, so an
  unusual camera simply returns something near this rather than failing.

  1080p to match the external webcam being used. The capture is taken at the
  stream's real resolution (whatever that turns out to be), so the subject keeps
  its full detail into the export scaler in utils/compose.js.
*/
export const CAMERA_WIDTH = 1920;
export const CAMERA_HEIGHT = 1080;

/*
  Which camera to prefer when several are attached. A USB webcam on a laptop
  usually enumerates alongside the built-in one, so "environment" asks for the
  rear/external device where the browser can tell them apart. Set to "user" for
  a selfie-style front camera. The picker in the UI can override this at runtime
  when more than one camera is present.
*/
export const CAMERA_FACING = "environment";

/*
  Countdown before the shutter fires, in seconds. Gives the guest time to pose
  after tapping — set to 0 to capture the instant the button is pressed.
*/
export const CAMERA_COUNTDOWN_S = 3;

/*
  Mirror the on-screen preview horizontally.

  A mirrored preview feels natural when you are looking at yourself, but it does
  NOT match the photo that gets taken: the capture is always the camera's real
  view, because mirroring the saved image would reverse any text in the scene
  (signage, lettering on clothing) in the exported cover.

  That gap is why this defaults to false — with it off, what the guest lines up
  in the preview is exactly what lands on the cover. Set it true only if you
  would rather have the mirror and accept that the photo comes out flipped
  relative to what was on screen.
*/
export const CAMERA_MIRROR_PREVIEW = false;

/*
  Skip the separate result page and finish inside the editor.

  A kiosk session is one cover per guest, so the extra screen is a step nobody
  needs: "Generate cover" composes, downloads the PNG, holds the finished cover
  up as a full-screen celebration for INSTANT_FINISH_HOLD_MS, then returns to the
  attract screen ready for the next person.

  Set to false to restore the old flow, where /result offers download, keep
  editing and start over — the page and its route stay wired up either way.
*/
export const INSTANT_FINISH = true;

/*
  How long the finished cover stays on screen before the kiosk resets, in ms.
  Long enough to admire it and see the download land; short enough that the next
  guest is not left waiting. Tune to taste.
*/
export const INSTANT_FINISH_HOLD_MS = 5000;

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
