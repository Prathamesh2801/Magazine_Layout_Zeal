import { useSyncExternalStore } from 'react'
import { KIOSK_HINTS_VISIBLE } from '../config'

/*
  Is the on-screen key legend showing?

  One boolean, read by every KioskStage on screen and written by the single
  `toggleHints` binding in AppLayout. It is a module-level store rather than a
  context or a piece of MagazineContext for two reasons:

  · It must NOT be cleared by `reset()`. A colleague turns the legend on to walk
    someone through the keys; ending that guest's session must not switch it back
    off underneath them, which is exactly what living in the session state would
    do.
  · It is read in one place and written in one place, on opposite sides of the
    router. Threading a provider through AppLayout to reach it would be more
    plumbing than the value is worth, and useSyncExternalStore is what React
    offers for precisely this shape.

  Not persisted on purpose — see KIOSK_HINTS_VISIBLE in src/config.js. An
  unattended display comes back from a reload in its configured state, so the
  legend cannot be left switched on by accident.
*/

let visible = KIOSK_HINTS_VISIBLE
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return visible
}

export function toggleHints() {
  visible = !visible
  for (const listener of listeners) listener()
}

export function useHintsVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
