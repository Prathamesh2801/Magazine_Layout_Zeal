import { useEffect, useRef } from 'react'
import { KEYS } from '../config'

/*
  Keyboard control, as a hook.

  The immersive kiosk (IMMERSIVE_KIOSK, src/config.js) has no buttons: the panel
  is a display rather than a touchscreen, so every action a guest can take comes
  from a keyboard or a presenter remote. This is the one place that turns a
  keypress into an action, and it reads its table from config so an operator can
  remap the kiosk without touching a component.

  Callers pass a map of action name -> handler. Only the actions a screen
  actually registers can fire there, which is what lets Enter mean "start",
  "take the photo" and "finish" on three different screens without ambiguity —
  one screen is mounted at a time. Two actions sharing a key on the SAME screen
  would resolve by insertion order; don't write that.

  The listener is on `window` rather than on a focused element on purpose. A
  kiosk guest never clicks anything, so nothing ever holds focus, and a binding
  that depended on focus would silently do nothing.
*/

// A keypress that is going into a text field belongs to the text field. This is
// what lets the (TEXT_ENABLED) name input keep working inside the kiosk shell.
function isTypingTarget(el) {
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable === true
  )
}

/*
  Single-character keys are compared case-insensitively, so 'a' also answers to
  Shift+A — Shift is a step modifier in the editor, not a different action.
  Named keys ('Enter', 'ArrowLeft', …) are compared as-is.
*/
function normalise(key) {
  return key.length === 1 ? key.toLowerCase() : key
}

function matches(bindings, key) {
  if (!bindings || !key) return false
  const pressed = normalise(key)
  return bindings.some((binding) => normalise(binding) === pressed)
}

export function useKeyBindings(handlers, enabled = true) {
  /*
    Handlers close over render-fresh state (the current layout, the current
    busy flag), so they change every render. Holding them in a ref keeps the
    window listener attached once instead of being torn down and rebuilt on
    every keystroke-driven state change — which would drop key repeat.
  */
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) return undefined

    const onKeyDown = (event) => {
      // Leave browser and OS shortcuts alone — Ctrl+R, Alt+Tab, Cmd+Q.
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      for (const [action, handler] of Object.entries(handlersRef.current)) {
        if (typeof handler !== 'function') continue
        if (!matches(KEYS[action], event.key)) continue
        // Space scrolls, Backspace navigates back, PageDown scrolls: a bound
        // key is ours, so the browser must not also act on it.
        event.preventDefault()
        handler(event)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
