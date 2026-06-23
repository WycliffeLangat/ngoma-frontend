/**
 * Build-time script: fetches the live chart data from the Railway API and
 * writes src/data/chartData.js so the Netlify build always has fresh fallback
 * data without requiring a manual export step.
 *
 * Runs automatically as the `prebuild` npm script.
 * Requires VITE_API_BASE_URL to be set in Netlify environment variables.
 * If the API is unreachable, the existing committed chartData.js is used instead.
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = join(__dirname, '../src/data/chartData.js')

const API_BASE = (process.env.VITE_API_BASE_URL || process.env.VITE_API_BASE || '').replace(/\/$/, '')

if (!API_BASE) {
  console.log('[generate-chart-data] VITE_API_BASE_URL not set — skipping, using committed chartData.js')
  process.exit(0)
}

const url = `${API_BASE}/app-data/`
console.log(`[generate-chart-data] Fetching ${url} …`)

try {
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const payload = await res.json()

  const { months, full } = payload
  if (!Array.isArray(months) || !months.length) throw new Error('payload.months is empty or missing')
  if (!full?.singles || !full?.albums)           throw new Error('payload.full is missing singles/albums')

  writeFileSync(
    OUTPUT,
    [
      '// Generated at build time from live API. Do not edit chart rows by hand.',
      `export const MONTHS = ${JSON.stringify(months)};`,
      `export const FULL = ${JSON.stringify(full, null, 0)};`,
      '',
    ].join('\n'),
    'utf8'
  )
  console.log(`[generate-chart-data] ✓ Wrote ${OUTPUT} (${months.length} months)`)
} catch (err) {
  console.warn(`[generate-chart-data] API fetch failed: ${err.message}`)
  console.warn('[generate-chart-data] Keeping committed chartData.js as fallback — build continues.')
  // Exit 0: a build should not fail just because the API was momentarily unreachable.
}
