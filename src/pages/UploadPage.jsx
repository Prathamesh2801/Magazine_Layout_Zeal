import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiCamera,
  FiRefreshCw,
  FiScissors,
} from "react-icons/fi";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import ImageUploader from "../components/ImageUploader";
import CameraCapture from "../components/CameraCapture";
import KioskStage from "../components/kiosk/KioskStage";
import { useMagazine } from "../context/MagazineContext";
import { useKeyBindings } from "../hooks/useKeyBindings";
import { removeBackground } from "../services/removeBg";
import { fileToDataURL, getAspectRatio } from "../utils/image";
import { COVER_RATIO, ROUTES } from "../utils/constants";
import {
  BG_REMOVAL_ENABLED,
  CAMERA_ENABLED,
  FILE_UPLOAD_ENABLED,
  IMMERSIVE_KIOSK,
  TEXT_ENABLED,
} from "../config";

export default function UploadPage() {
  const navigate = useNavigate();
  const { name, setName, setUpload, setPerson, original, file } = useMagazine();
  const [busy, setBusy] = useState(false);
  /*
    The kiosk sits idle between guests, and a camera that is streaming to an
    empty room is both a privacy problem and a way to keep the webcam hot all
    day. So nothing opens the camera until someone actually starts a session:
    `started` gates the whole flow behind the welcome screen, and the browser's
    permission prompt lands on that first tap — a user gesture — which is also
    where browsers most reliably allow it.
  */
  const [started, setStarted] = useState(false);
  const [showCamera, setShowCamera] = useState(
    CAMERA_ENABLED && !FILE_UPLOAD_ENABLED,
  );

  const hasImage = Boolean(original?.dataUrl);
  const onAttract = CAMERA_ENABLED && !started;

  /*
    Back to the attract screen, releasing the camera with it. CameraCapture
    unmounts here, and its useCamera cleanup is what actually stops the stream.
  */
  const endSession = () => {
    setUpload(null, null);
    setStarted(false);
    setShowCamera(CAMERA_ENABLED && !FILE_UPLOAD_ENABLED);
  };

  const onSelect = async (picked) => {
    try {
      const dataUrl = await fileToDataURL(picked);
      setUpload(picked, dataUrl);
    } catch (err) {
      toast.error(err.message);
    }
  };

  /*
    CameraCapture reports failures through this same callback (file === null)
    rather than raising its own toast — feedback stays on the page that owns it.
  */
  const onCaptured = async (file, err) => {
    if (!file) {
      toast.error(err?.message || "Could not take the photo.");
      return;
    }
    setShowCamera(false);
    await onSelect(file);
  };

  // Throw the shot away and go back to the live preview (or to the file
  // chooser, when that is the only source this event has switched on).
  const retake = () => {
    setUpload(null, null);
    if (CAMERA_ENABLED && !FILE_UPLOAD_ENABLED) setShowCamera(true);
  };

  const onSubmit = async (e) => {
    e?.preventDefault();
    if (!file || !original) return toast.error("Please add a photo first.");
    // Only a required field while the cover actually carries a headline.
    if (TEXT_ENABLED && !name.trim())
      return toast.error("Please enter the cover name.");

    setBusy(true);
    const t = toast.loading(
      BG_REMOVAL_ENABLED ? "Removing background…" : "Preparing photo…",
    );
    try {
      const { dataUrl, processed } = await removeBackground(file);
      const aspect = await getAspectRatio(dataUrl);
      setPerson(dataUrl, aspect, processed);
      toast.dismiss(t);
      toast.success(processed ? "Background removed!" : "Photo ready!");
      navigate(ROUTES.editor);
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || "Could not prepare the photo.");
    } finally {
      setBusy(false);
    }
  };

  /*
    The kiosk's two keyboard screens on this page. The live preview owns its own
    keys inside CameraCapture, because the shutter and the camera switch belong
    with the camera; these are the screens on either side of it.

    Both hooks are called unconditionally and gated by their `enabled` flag, so
    the hook order stays fixed no matter which screen is currently showing.
  */
  useKeyBindings(
    { start: () => setStarted(true) },
    IMMERSIVE_KIOSK && onAttract,
  );

  useKeyBindings(
    { accept: () => onSubmit(), retake, quit: endSession },
    IMMERSIVE_KIOSK && !onAttract && hasImage && !busy,
  );

  /*
    The attract screen. Holds the kiosk between guests with the camera off, and
    turns the first tap — or, on the kiosk, the first keypress — into the user
    gesture that opens the camera, so the permission prompt appears when someone
    is standing there to answer it.
  */
  if (onAttract) {
    /*
      Sized in vmin, not px: this is read from across a room on a large portrait
      panel, but has to stay sane in a laptop tab while building. The palette is
      the only thing that changes between the two shells — the windowed studio
      is lit like paper, the kiosk like a dark room with a screen in it.
    */
    const tone = IMMERSIVE_KIOSK
      ? {
          badge: "bg-paper/10 text-paper",
          title: "text-paper",
          body: "text-paper/75",
          muted: "text-paper/45",
        }
      : {
          badge: "bg-clay/10 text-clay",
          title: "text-ink",
          body: "text-ink-soft",
          muted: "text-ink-muted",
        };

    const welcome = (
      /*
        Widths track the panel too, not just the type. A fixed `max-w-2xl` here
        was pinning the column at 672px, so on a large panel the heading wrapped
        to three lines inside a narrow strip while the screen sat empty either
        side of it.
      */
      <div className="reveal-head flex w-full max-w-[max(28rem,70vmin)] flex-col items-center px-[6vmin] text-center">
        <span
          className={`mb-[3vmin] flex aspect-square w-[max(5rem,14vmin)]
            items-center justify-center rounded-full ${tone.badge}`}
        >
          <FiCamera className="h-[45%] w-[45%]" />
        </span>

        <h2 className={`font-display text-kiosk-2xl font-bold ${tone.title}`}>
          Be on the cover
        </h2>
        {/* `ch` is relative to the font size, so this column re-proportions
            itself as the type grows — no second breakpoint to keep in step. */}
        <p className={`mt-[1.5vmin] max-w-[22ch] text-kiosk-base ${tone.body}`}>
          Step in front of the camera and we&rsquo;ll put you on the front page.
        </p>

        {/*
          The kiosk has no buttons at all — the legend at the foot of the stage
          is the interface. An oversized Start here would be a control nobody
          can reach on a panel that is a display rather than a touchscreen.
        */}
        {!IMMERSIVE_KIOSK && (
          /* Deliberately oversized: the one thing to touch, reachable standing. */
          <Button
            size="lg"
            className="mt-[5vmin] w-full max-w-sm py-[2.2vmin]
              text-[clamp(1.1rem,3vmin,2rem)] shadow-lift"
            onClick={() => setStarted(true)}
          >
            <FiCamera className="h-[1.2em] w-[1.2em]" /> Start
          </Button>
        )}

        <p className={`mt-[3vmin] text-kiosk-xs ${tone.muted}`}>
          The camera turns on only while you are using this screen.
        </p>
      </div>
    );

    if (!IMMERSIVE_KIOSK) {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
          {welcome}
        </div>
      );
    }

    /*
      No frame here: the attract screen is type, not artwork, so it takes the
      whole panel rather than sitting inside a cover-shaped box.
    */
    return (
      <KioskStage
        frame={false}
        hints={[
          { keys: ["Enter"], label: "Start" },
          { keys: ["F"], label: "Full screen" },
        ]}
      >
        {welcome}
      </KioskStage>
    );
  }

  // ---- The live camera ----------------------------------------------------
  if (!hasImage && showCamera) {
    /*
      With a file picker behind it, cancelling falls back to the chooser; on a
      camera-only kiosk it ends the session instead, which releases the camera
      and returns to the attract screen.
    */
    const onCancel = FILE_UPLOAD_ENABLED
      ? () => setShowCamera(false)
      : endSession;

    if (IMMERSIVE_KIOSK) {
      return (
        <KioskStage>
          <CameraCapture chromeless onCapture={onCaptured} onCancel={onCancel} />
        </KioskStage>
      );
    }

    return (
      <div className="mx-auto w-full max-w-xl">
        <PageHeading />
        <Card className="p-4 sm:p-6">
          <CameraCapture onCapture={onCaptured} onCancel={onCancel} />
        </Card>
      </div>
    );
  }

  // ---- The file chooser ---------------------------------------------------
  if (!hasImage) {
    const chooser = (
      <ImageUploader
        onSelect={onSelect}
        onUseCamera={() => setShowCamera(true)}
      />
    );

    /*
      Picking a file is inherently a pointer job — there is no keyboard gesture
      for "browse the disk" — so on the kiosk it keeps its card and simply sits
      on the stage. Only an event that switches FILE_UPLOAD_ENABLED back on ever
      reaches this; the kiosk default goes straight to the camera.
    */
    if (IMMERSIVE_KIOSK) {
      return (
        <KioskStage frame={false}>
          <Card className="mx-[6vmin] w-full max-w-xl p-[3vmin]">{chooser}</Card>
        </KioskStage>
      );
    }

    return (
      <div className="mx-auto w-full max-w-xl">
        <PageHeading />
        <Card className="p-4 sm:p-6">{chooser}</Card>
      </div>
    );
  }

  /*
    ---- Review the shot ----------------------------------------------------

    Same portrait frame as the live camera, at the same ratio: this is the shot
    the guest just took, so it must not suddenly letterbox into a short
    landscape box. object-cover keeps it filling the frame exactly as the
    preview did.
  */
  if (IMMERSIVE_KIOSK) {
    return (
      <KioskStage
        hints={[
          { keys: ["Enter"], label: busy ? "Working…" : "Use this photo" },
          { keys: ["R"], label: "Retake" },
          { keys: ["Esc"], label: "Cancel" },
        ]}
      >
        <img
          src={original.dataUrl}
          alt="The photo you just took"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/*
          The headline field, on artwork that carries one (TEXT_ENABLED). It is
          a real <form> so that Enter inside the input submits it natively: the
          keyboard hook deliberately ignores keys aimed at a text field, and
          without the form the guest could type but not continue.
        */}
        {TEXT_ENABLED && (
          <form
            onSubmit={onSubmit}
            className="absolute inset-x-0 bottom-[12vmin] z-10 px-[6vmin]"
          >
            <input
              id="cover-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name for the cover"
              maxLength={40}
              className="w-full rounded-[1.5vmin] border border-white/25 bg-black/50
                px-[3vmin] py-[2vmin] text-center text-kiosk-lg
                text-white backdrop-blur placeholder:text-white/45
                focus:border-white/60 focus:outline-none"
            />
          </form>
        )}

        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[2vmin] bg-stage/75">
            <Spinner size="max(2rem,6vmin)" thickness="max(2px,0.5vmin)" />
            <p className="text-kiosk-base font-medium text-paper">
              {BG_REMOVAL_ENABLED ? "Removing background…" : "Preparing photo…"}
            </p>
          </div>
        )}
      </KioskStage>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeading />

      <Card className="p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-2xl
              border border-line bg-ink shadow-lift"
            style={{ aspectRatio: COVER_RATIO }}
          >
            <img
              src={original.dataUrl}
              alt="Selected preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={retake}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-lg
                bg-ink/70 px-2.5 py-1.5 text-xs font-medium text-paper
                backdrop-blur hover:bg-ink"
            >
              <FiRefreshCw size={13} /> Replace
            </button>
          </div>

          {/* Headline field — only when the cover carries one (TEXT_ENABLED). */}
          {TEXT_ENABLED && (
            <div>
              <label
                htmlFor="cover-name"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Cover name
              </label>
              <input
                id="cover-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                maxLength={40}
                className="w-full rounded-xl border border-line bg-paper px-4 py-3
                  text-ink placeholder:text-ink-muted focus:border-clay
                  focus:outline-none focus:ring-2 focus:ring-clay/40"
              />
              <p className="mt-1 text-xs text-ink-muted">
                Shown as the headline over your photo.
              </p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Spinner size={18} /> Processing…
              </>
            ) : BG_REMOVAL_ENABLED ? (
              <>
                <FiScissors size={18} /> Continue
                <FiArrowRight size={18} />
              </>
            ) : (
              <>
                Continue to editor <FiArrowRight size={18} />
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

/*
  The windowed studio's page title. The kiosk drops it: there is no room for a
  heading over a full-bleed camera, and a guest looking at their own face does
  not need to be told what the screen is.
*/
function PageHeading() {
  return (
    <div className="mb-5 text-center">
      <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        Create your cover
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {BG_REMOVAL_ENABLED
          ? `Add a photo${TEXT_ENABLED ? " and a name" : ""} — we’ll cut out the subject and drop it onto the magazine.`
          : `Add a photo${TEXT_ENABLED ? " and a name" : ""} — we’ll drop it onto the magazine for you to position.`}
      </p>
    </div>
  );
}
