import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { MagazineProvider } from './context/MagazineContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MagazineProvider>
      <RouterProvider router={router} />
    </MagazineProvider>
  </StrictMode>,
)
