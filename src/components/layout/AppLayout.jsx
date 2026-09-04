import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useKeyBindings } from '../../hooks/useKeyBindings'
import { toggleHints } from '../../hooks/useHintsVisible'
import { IMMERSIVE_KIOSK } from '../../config'

/*
  The studio shell.

  Built for a vertical portrait kiosk TV: the app owns the whole screen, so the
  content is centred on BOTH axes and the page never scrolls. `min-h-full` +
  `flex-1` on the main region is what stops the layout collecting dead space at
  the bottom — the content sits in the middle of whatever height the panel has,
  rather than stacking from the top.

  The header is intentionally absent on the kiosk: a guest walking up needs the
  one thing they are here to do, not app chrome and a progress stepper.

  With IMMERSIVE_KIOSK (src/config.js) even this much is too much: the studio
  pages render into KioskStage, which is fixed to the viewport and covers the
  shell entirely, so the only thing left to do here is drop the footer — a
  credit line peeking out from under a full-bleed camera would be the one piece
  of chrome the immersive mode was supposed to remove. The shell itself stays,
  because /result (INSTANT_FINISH === false) is an ordinary page and still wants
  its centred, paper-lit layout.
*/
export default function AppLayout() {
  /*
    Real full screen, on a keypress.

    A kiosk browser is usually launched in kiosk mode already, but the laptop
    driving the panel for the first time is not — and the browser's own toolbar
    and tab strip eat exactly the vertical space the cover needs. requestFullscreen
    demands a user gesture, which a keypress is, so this is bound rather than
    called on mount. Bound here rather than per page so it works on every screen
    of the session, including the finale.
  */
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.()
      else document.documentElement.requestFullscreen?.().catch(() => {})
    } catch {
      // Blocked by policy or unsupported — the app is perfectly usable windowed.
    }
  }

  /*
    Both of these are bound at the shell rather than per page so they work on
    every screen of a session — the attract screen, mid-countdown, the editor,
    and the finale, which registers no keys of its own.
  */
  useKeyBindings(
    { fullscreen: toggleFullscreen, toggleHints },
    IMMERSIVE_KIOSK,
  )

  return (
    <div className="flex min-h-full flex-col">
      {/*
        One toast look for the whole app: espresso ink surface on paper text,
        with the icon carrying the state colour — clay while pending, sage on
        success, danger on failure. toast.promise() inherits these variants.
      */}
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={{
          duration: 3200,
          style: {
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            padding: '10px 14px',
            maxWidth: '420px',
            boxShadow: 'var(--shadow-lift)',
          },
          loading: {
            iconTheme: {
              primary: 'var(--color-clay)',
              secondary: 'var(--color-paper-200)',
            },
          },
          success: {
            iconTheme: {
              primary: 'var(--color-sage)',
              secondary: 'var(--color-paper)',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'var(--color-paper)',
            },
          },
        }}
      />

      {/* <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay text-white">
            <TbBook2 size={20} />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-lg font-bold text-ink">Maxter Today</h1>
            <p className="text-xs text-ink-muted">Cover Studio</p>
          </div>
          <div className="ml-auto hidden sm:block">
            <Stepper current={step} />
          </div>
        </div>
        <div className="border-t border-line px-4 py-3 sm:hidden">
          <Stepper current={step} />
        </div>
      </header> */}

      {/*
        Centred on both axes. `min-h-0` lets the flex child actually shrink, so
        a tall composition scrolls inside the region instead of pushing the
        footer off a 1920px-high panel.
      */}
      <main
        className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col
          justify-center px-5 py-6 sm:py-8"
      >
        <Outlet />
      </main>

      {!IMMERSIVE_KIOSK && (
        <footer className="shrink-0 border-t border-line py-3 text-center text-xs text-ink-muted">
          Design your cover · Beige Editorial Studio
        </footer>
      )}
    </div>
  )
}
