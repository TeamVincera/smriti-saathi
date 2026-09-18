import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(projectRoot, 'dist')
const swPath = path.join(distDir, 'sw.js')
const CACHE_VERSION_MARKER = '__SMRITI_CACHE_VERSION__'
const ASSETS_MARKER = '__SMRITI_PRECACHE_ASSETS__'

async function walkFiles(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(absolute, relative))
    else files.push({ absolute, relative: relative.split(path.sep).join('/') })
  }
  return files
}

export async function collectPrecacheAssets() {
  const files = await walkFiles(distDir)
  return files
    .filter(({ relative }) => relative !== 'sw.js')
    .map(({ relative }) => `./${relative}`)
}

async function contentVersion(assets) {
  const hash = createHash('sha256')
  for (const asset of assets) {
    hash.update(asset)
    hash.update(await fs.readFile(path.join(distDir, asset.slice(2))))
  }
  return hash.digest('hex').slice(0, 16)
}

export async function injectServiceWorker() {
  const [source, assets] = await Promise.all([
    fs.readFile(swPath, 'utf8'),
    collectPrecacheAssets(),
  ])

  const required = ['./index.html', './manifest.webmanifest', './alarm.wav', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/maskable-512.png']
  const missing = required.filter((asset) => !assets.includes(asset))
  if (missing.length > 0) {
    throw new Error(`Service-worker precache injection incomplete; missing dist assets: ${missing.join(', ')}`)
  }
  if (assets.length === 0) throw new Error('Service-worker precache injection found no dist assets')
  if (!source.includes(CACHE_VERSION_MARKER) || !source.includes(ASSETS_MARKER)) {
    throw new Error('dist/sw.js is missing the precache injection markers')
  }

  const version = await contentVersion(assets)
  const injected = source
    .replace(CACHE_VERSION_MARKER, version)
    .replace(ASSETS_MARKER, JSON.stringify(assets, null, 2))
  await fs.writeFile(swPath, injected)
  if (injected.includes(CACHE_VERSION_MARKER) || injected.includes(ASSETS_MARKER)) {
    throw new Error('Service-worker precache injection left unresolved markers')
  }
  return { version, assets }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await injectServiceWorker()
    console.log(`Injected ${result.assets.length} offline assets into dist/sw.js (cache smriti-sathi-offline-${result.version})`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
