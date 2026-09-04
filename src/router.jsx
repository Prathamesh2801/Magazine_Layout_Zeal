import { createHashRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import UploadPage from './pages/UploadPage'
import EditorPage from './pages/EditorPage'
import ResultPage from './pages/ResultPage'
import TvPage from './pages/TvPage'
import { ROUTES } from './utils/constants'
import { TV_ENABLED } from './config'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <UploadPage /> },
      { path: ROUTES.editor.slice(1), element: <EditorPage /> },
      { path: ROUTES.result.slice(1), element: <ResultPage /> },
    ],
  },
  /*
    Sits outside AppLayout on purpose: the display wall runs unattended on its
    own screen and must not carry the studio header, stepper or footer.

    Registered only when TV_ENABLED (src/config.js). Leaving the route out —
    rather than rendering a disabled page — is what guarantees nothing mounts
    TvPage and opens an EventSource against an sse.php that isn't there.
  */
  ...(TV_ENABLED ? [{ path: ROUTES.tv, element: <TvPage /> }] : []),
])
