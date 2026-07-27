import { SSE_URL } from "../config";
import { toReachableUrl } from "./apiOrigin";

/*
  Live cover feed (sse.php) — the source the /tv wall listens to.

  Frame shape:
    data: {"Status":"Play",
           "Play":"http://localhost:80/.../uploads/file_69cf….png",
           "Download":"http://localhost:80/.../view.php?file=file_69cf….png",
           "Text":"Playing","Message":"Playing file_69cf….png"}

  Two things about this stream shape the client:

  1. It is a state feed, not an event log. The *same* frame is re-sent on every
     tick as a keep-alive, so a frame is not by itself news — callers de-dupe on
     `id`, which is the uploaded filename.
  2. `Play` points at the raw PNG under /uploads/ and is what we render.
     `Download` is view.php, which serves an HTML download page, so it is only
     ever useful as a link — never as an <img> source.
*/

/** Identity of a cover: the uploaded filename, stable across re-sent frames. */
function coverIdFrom(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("file") || u.pathname.split("/").pop() || url;
  } catch {
    return url;
  }
}

/**
 * Parse one `data:` payload into a cover, or null when the frame carries no
 * playable cover (idle status, malformed JSON, missing image).
 *
 * @returns {{ id: string, imageUrl: string, downloadUrl: string|null }|null}
 */
export function parseCoverFrame(raw) {
  let frame;
  try {
    frame = JSON.parse(raw);
  } catch {
    return null;
  }

  if (String(frame?.Status).toLowerCase() !== "play") return null;

  const imageUrl = toReachableUrl(frame.Play);
  if (!imageUrl) return null;

  return {
    id: coverIdFrom(frame.Play),
    imageUrl,
    downloadUrl: toReachableUrl(frame.Download),
  };
}

/**
 * Subscribe to the cover feed.
 *
 * EventSource reconnects on its own after a dropped connection, so `onStatus`
 * reports "reconnecting" rather than the caller having to retry. It only gives
 * up — "offline" — when the browser closes the stream for good.
 *
 * @param {object} handlers
 * @param {(cover:{id:string,imageUrl:string,downloadUrl:string|null})=>void} handlers.onCover
 * @param {(status:'connecting'|'live'|'reconnecting'|'offline')=>void} [handlers.onStatus]
 * @returns {() => void} unsubscribe
 */
export function subscribeToCovers({ onCover, onStatus }) {
  const source = new EventSource(SSE_URL);

  onStatus?.("connecting");

  source.onopen = () => onStatus?.("live");

  source.onmessage = (event) => {
    const cover = parseCoverFrame(event.data);
    if (cover) {
      onStatus?.("live");
      onCover(cover);
    }
  };

  source.onerror = () => {
    onStatus?.(
      source.readyState === EventSource.CLOSED ? "offline" : "reconnecting"
    );
  };

  return () => source.close();
}
