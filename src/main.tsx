import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { loadGameFont } from './styles/font'

// Se espera a la fuente (máx. 2 s) para no mostrar un texto provisional.
void loadGameFont().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
