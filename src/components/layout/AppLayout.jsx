import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { TbBook2 } from 'react-icons/tb'
import { ROUTES } from '../../utils/constants'
import Stepper from './Stepper'

const STEP_BY_PATH = {
  [ROUTES.upload]: 0,
  [ROUTES.editor]: 1,
  [ROUTES.result]: 2,
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const step = STEP_BY_PATH[pathname] ?? 0

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

      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
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
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line py-4 text-center text-xs text-ink-muted">
        Design your cover · Beige Editorial Studio
      </footer>
    </div>
  )
}
