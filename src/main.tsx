import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { loadPixelFont } from './styles/font'

// Se espera a la fuente pixel (máx. 2 s) para no mostrar un texto provisional.
void loadPixelFont().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
