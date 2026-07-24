import { createHashRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import UploadPage from './pages/UploadPage'
import EditorPage from './pages/EditorPage'
import ResultPage from './pages/ResultPage'
import { ROUTES } from './utils/constants'

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
])
