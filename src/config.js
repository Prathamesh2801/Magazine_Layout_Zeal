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
export const BG_REMOVAL_ENABLED = false;

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

/*
  How long the finished cover takes to dissolve into the stage at the end of the
  hold, in ms. Counted INSIDE INSTANT_FINISH_HOLD_MS, not added to it, so the
  total a guest waits is still the number above.

  The fade is not decoration: on the immersive kiosk the finale carries no
  progress bar and no caption — the cover simply fills the panel — so this is
  what tells the guest the session is ending, a beat before the attract screen
  arrives. Cutting straight from a full-bleed cover to the welcome screen reads
  as the app crashing and restarting; dissolving reads as an ending.
*/
export const INSTANT_FINISH_FADE_MS = 800;

/*
  Immersive kiosk shell.

  The studio normally renders as a page: a centred card on paper, a footer under
  it, and a column of buttons and sliders beside the artwork. On the big portrait
  panel this app is actually installed on, that framing wastes the screen — the
  guest is looking at their own face from a few metres away, and every pixel
  spent on chrome is a pixel not spent on the camera.

  With this on, the studio goes edge to edge. The live preview, the review shot
  and the editor canvas each fill the whole display on a dark stage: no card, no
  footer, no buttons, no sliders. The session is driven from the keyboard
  instead (see KEYS below) — a wireless keyboard or a presenter clicker sitting
  by the panel — and the mouse still drags and resizes the subject exactly as
  before, so nothing about the editor is lost, only its furniture.

  The frame is FITTED, not stretched: the visible area stays at COVER_RATIO, so
  what the guest lines up in the preview is still precisely what gets captured
  and composed. On a panel whose own ratio is near the cover's (900x1400 is
  0.643 against the cover's 0.661, so within three percent) that is effectively
  edge to edge; whatever is left over is painted in the stage colour and reads
  as bezel rather than as layout.

  Set to false for the ordinary windowed studio — every control is still there
  and still works. Both branches are live.
*/
export const IMMERSIVE_KIOSK = true;

/*
  Keyboard bindings for the immersive kiosk.

  The panel is a display, not a touchscreen, so the guest cannot reach into it —
  the session is driven from a keyboard or a presenter remote instead. Remote
  keys are bound alongside the obvious ones because that is what those clickers
  actually send: PageDown for "next", PageUp for "back", Escape for "stop".

  Each entry is a list of KeyboardEvent.key values, matched case-insensitively
  so 'a' also catches Shift+A. Bindings are resolved per screen against the
  handlers that screen registers, which is why Enter can mean "start", "take the
  photo" and "finish" without ever being ambiguous: only one of those screens is
  mounted at a time. Keep that property in mind when adding an action — two
  actions sharing a key on the SAME screen would resolve by registration order,
  which is not something a reader should have to reason about.

  Remapping is a config edit and a reload; the on-screen hints are generated
  from these same lists, so they cannot drift out of step with the bindings.
*/
export const KEYS = {
  // Attract screen — begin a session. This keypress is also the user gesture
  // the browser wants before it will open the camera.
  start: ["Enter", " ", "PageDown"],

  // Live preview — fire the countdown / shutter. On the error card it retries.
  shutter: ["Enter", " ", "PageDown"],
  // Cycle to the next attached webcam, when there is more than one.
  switchCamera: ["c"],

  // Review — keep the shot and go on to the editor, or throw it away.
  accept: ["Enter", "PageDown"],
  retake: ["r", "Backspace", "PageUp"],

  // Editor — nudge the subject. WASD sits under the left hand; the arrows are
  // what anyone walking up will try first, so both are bound.
  moveLeft: ["ArrowLeft", "a"],
  moveRight: ["ArrowRight", "d"],
  moveUp: ["ArrowUp", "w"],
  moveDown: ["ArrowDown", "s"],
  // Editor — resize the subject. '=' is bound with '+' because reaching the
  // plus sign means holding Shift, which would otherwise switch to fine steps.
  grow: ["+", "=", "]"],
  shrink: ["-", "_", "["],
  // Editor — restore the default layout.
  resetLayout: ["r"],
  // Editor — compose, download, and finish the session.
  finish: ["Enter", "PageDown"],

  // Anywhere — abandon this session and return to the attract screen.
  quit: ["Escape"],
  // Anywhere — show or hide the on-screen key legend. See KIOSK_HINTS_VISIBLE.
  toggleHints: ["h", "?"],
  // Anywhere — toggle the browser into real full screen. Kiosk browsers are
  // usually launched that way already, but a laptop driving the panel for the
  // first time is not, and this saves hunting for F11 behind the app.
  fullscreen: ["f"],
};

/*
  How far one keypress moves or resizes the subject, as a fraction of the cover
  (the same 0..1 space the layout itself is stored in — see utils/constants.js).

  Sized so a guest can cross the cover in a couple of seconds of held key: the
  browser's own key repeat does the rest, no timers here. Holding Shift scales
  both steps down by KEY_FINE_MULTIPLIER for the last bit of placement, which is
  the opposite of the usual "Shift = faster" — on a kiosk the coarse move is the
  common case and the precise one is the exception.
*/
export const KEY_MOVE_STEP = 0.012;
export const KEY_SIZE_STEP = 0.02;
export const KEY_FINE_MULTIPLIER = 0.25;

/*
  Whether the on-screen key legend starts visible.

  Two audiences, one screen. To a guest standing in front of the panel this is a
  display — a legend of keyboard shortcuts along the bottom is clutter over their
  own face, and they cannot reach the keyboard anyway. To the colleague actually
  running the session it is the manual. So it defaults to hidden and `toggleHints`
  (H) brings it back at any point, on any screen.

  Deliberately NOT persisted. An unattended display must come up clean after a
  power cut or a reload, so a reload always returns to whatever is set here — an
  operator cannot accidentally leave the legend switched on for a whole evening.
  Set this true for a run where staff are still learning the keys.
*/
export const KIOSK_HINTS_VISIBLE = false;

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
