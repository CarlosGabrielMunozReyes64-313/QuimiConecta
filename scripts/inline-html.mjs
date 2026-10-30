// Une el build de `vite build --mode single` en un solo archivo: quimiconecta.html
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist-single'
let html = readFileSync(join(dir, 'index.html'), 'utf8')

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const css = readFileSync(join(dir, href), 'utf8')
  return `<style>${css}</style>`
})
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(join(dir, src), 'utf8').replaceAll('</script', '<\\/script')
  return `<script type="module">${js}</script>`
})
const favicon = readFileSync('public/favicon.svg', 'utf8')
html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />`)

if (/src="\/assets|href="\/assets/.test(html)) throw new Error('Quedan referencias a archivos externos')
writeFileSync('quimiconecta.html', html)
console.log(`quimiconecta.html: ${(html.length / 1024).toFixed(0)} KB`)
