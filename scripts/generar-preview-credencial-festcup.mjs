#!/usr/bin/env node
/**
 * Renderiza PNG de vista previa FestCup 2026 (mismo HTML/CSS que CredencialCard).
 * Uso: node scripts/generar-preview-credencial-festcup.mjs
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')

const W_MM = 54
const H_MM = 86
const DPI = 200
const W_PX = Math.round((W_MM / 25.4) * DPI)
const H_PX = Math.round((H_MM / 25.4) * DPI)

const samples = [
  {
    slug: 'deportista',
    modalidad: 'kyorugi_individual',
    nombres: 'CHRISTOPHER CABRERA NOLE',
    categoria: 'JUNIOR M -68 KG',
    foto: join(publicDir, 'credenciales/sample-foto-preview.jpg'),
    academiaLogo: join(publicDir, 'credenciales/sample-logo-zarumilla.jpg'),
  },
  {
    slug: 'entrenador',
    modalidad: 'oficial',
    nombres: 'CHRISTOPHER CABRERA NOLE',
    categoria: '',
    foto: join(publicDir, 'credenciales/sample-foto-preview.jpg'),
    academiaLogo: join(publicDir, 'credenciales/sample-logo-zarumilla.jpg'),
  },
]

const layout = {
  foto: { left: 50, top: 50.5, width: 36.4, height: 22.6 },
  nombre: { left: 50, top: 79.6, width: 88 },
  categoria: { left: 50, top: 82.8, width: 88 },
  academiaLogo: { left: 77, top: 35.5, width: 10.5, opacity: 0.28, borderRadius: '22%' },
}

function plantillaPath(sample) {
  const m = `${sample.modalidad}`.toLowerCase()
  const coach = m === 'oficial' || m.includes('entrenador') || m.includes('coach')
  const name = coach ? 'festcup-2026-plantilla-entrenador.jpg' : 'festcup-2026-plantilla-deportista.jpg'
  return join(publicDir, 'credenciales', name)
}

function fileUrl(absPath) {
  return `file://${absPath.replace(/\\/g, '/')}`
}

function buildHtml(sample) {
  const base = fileUrl(plantillaPath(sample))
  const foto = fileUrl(sample.foto)
  const logo = fileUrl(sample.academiaLogo)
  const cat = sample.categoria
    ? `<p class="cred-festcup-categoria">${sample.categoria}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #eee; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .credencial-frente {
    position: relative;
    width: ${W_MM}mm;
    height: ${H_MM}mm;
    overflow: hidden;
    background: #fff;
  }
  .cred-plantilla-bg {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0;
  }
  .cred-academia-logo {
    position: absolute; z-index: 1; height: auto; object-fit: cover;
    filter: grayscale(15%); pointer-events: none; overflow: hidden;
    border-radius: ${layout.academiaLogo.borderRadius};
    left: ${layout.academiaLogo.left}%; top: ${layout.academiaLogo.top}%;
    width: ${layout.academiaLogo.width}%; opacity: ${layout.academiaLogo.opacity};
    transform: translate(-50%, -50%);
  }
  .cred-foto-slot {
    position: absolute; z-index: 2;
    left: ${layout.foto.left}%; top: ${layout.foto.top}%;
    width: ${layout.foto.width}%; height: ${layout.foto.height}%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    background: #fff;
  }
  .cred-foto-img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
  .cred-festcup-nombre, .cred-festcup-categoria {
    position: absolute; z-index: 4; margin: 0; pointer-events: none;
    text-align: center; transform: translateX(-50%);
  }
  .cred-festcup-nombre {
    left: ${layout.nombre.left}%; top: ${layout.nombre.top}%; width: ${layout.nombre.width}%;
    font-family: 'Arial Black', 'Helvetica Neue', Arial, sans-serif;
    font-size: 2.35mm; font-weight: 900; letter-spacing: 0.02em;
    line-height: 1.1; color: #0d0d0d; text-transform: uppercase;
    word-break: break-word;
  }
  .cred-festcup-categoria {
    left: ${layout.categoria.left}%; top: ${layout.categoria.top}%; width: ${layout.categoria.width}%;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 1.85mm; font-weight: 700; letter-spacing: 0.03em;
    line-height: 1.2; color: #3d3d3d; text-transform: uppercase;
    word-break: break-word;
  }
</style>
</head>
<body>
  <div class="credencial-frente">
    <img class="cred-plantilla-bg" src="${base}" alt=""/>
    <img class="cred-academia-logo" src="${logo}" alt=""/>
    <div class="cred-foto-slot">
      <img class="cred-foto-img" src="${foto}" alt=""/>
    </div>
    <p class="cred-festcup-nombre">${sample.nombres}</p>
    ${cat}
  </div>
</body>
</html>`
}

async function renderOne(browser, sample) {
  const htmlPath = join(root, `.tmp-cred-preview-${sample.slug}.html`)
  writeFileSync(htmlPath, buildHtml(sample), 'utf8')
  const outDir = join(publicDir, 'credenciales')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, `preview-festcup-2026-${sample.slug}.png`)

  const page = await browser.newPage({
    viewport: { width: W_PX + 40, height: H_PX + 40 },
    deviceScaleFactor: 2,
  })
  await page.goto(fileUrl(htmlPath), { waitUntil: 'load' })
  await page.waitForFunction(() => {
    const imgs = [...document.images]
    return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0)
  })
  await page.waitForTimeout(150)
  const el = page.locator('.credencial-frente')
  await el.screenshot({ path: outPath, type: 'png' })
  await page.close()
  console.log('✓', outPath)
  return outPath
}

async function main() {
  mkdirSync(publicDir, { recursive: true })
  let browser
  try {
    browser = await chromium.launch()
  } catch (e) {
    console.error('Playwright no está instalado. Ejecuta: npm i -D playwright && npx playwright install chromium')
    throw e
  }
  try {
    for (const s of samples) await renderOne(browser, s)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
