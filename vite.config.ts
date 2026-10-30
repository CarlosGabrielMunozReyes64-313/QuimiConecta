import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // `npm run build:single` genera un único HTML autocontenido (imágenes y fuente incrustadas).
  build:
    mode === 'single'
      ? { outDir: 'dist-single', assetsInlineLimit: () => true, cssCodeSplit: false, modulePreload: false }
      : undefined,
}))
