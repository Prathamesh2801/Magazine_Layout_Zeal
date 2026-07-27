import { IMAGE_API_URL } from "../config";

/*
  Every MiniStack endpoint lives under one origin, and every one of them echoes
  links back on its own internal host. Both facts are shared by the upload API
  and the SSE feed, so the fix-up lives here rather than in either client.
*/

export const API_ORIGIN = new URL(IMAGE_API_URL).origin;

/*
  The API answers with links on its own internal host (http://localhost:80/...),
  which nothing outside that machine can resolve. Re-point them at the origin we
  actually reached so the links work from wherever this app is served.
*/
export function toReachableUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return `${API_ORIGIN}${u.pathname}${u.search}`;
  } catch {
    return raw;
  }
}
