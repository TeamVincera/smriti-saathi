import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectPrecacheAssets } from '../../scripts/inject-sw-precache.mjs'

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')) as {
  background_color: string
  theme_color: string
  shortcuts: { name: string; url: string }[]
}
const worker = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as { description: string; scripts: { build: string } }
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('production PWA assets', () => {
  it('uses the design-system colors and only real hash routes in shortcuts', () => {
    expect(manifest.background_color).toBe('#FBF8F2')
    expect(manifest.theme_color).toBe('#162436')
    expect(manifest.shortcuts.find((shortcut) => shortcut.name === 'Memory Garden')?.url).toBe('./#/game/garden')
    expect(manifest.shortcuts.every((shortcut) => shortcut.url.startsWith('./#/'))).toBe(true)
  })

  it('uses non-diagnostic product metadata', () => {
    const descriptions = [manifest.description, indexHtml, packageJson.description]
    for (const description of descriptions) {
      expect(description).not.toMatch(/cognitive therapeutics|treats dementia|medical treatment/i)
      expect(description).toMatch(/cognitive games|caregiver support/i)
    }
  })

  it('requires build-time precache injection and keeps base-relative placeholders', () => {
    expect(packageJson.scripts.build).toContain('node scripts/inject-sw-precache.mjs')
    expect(worker).toContain('__SMRITI_CACHE_VERSION__')
    expect(worker).toContain('__SMRITI_PRECACHE_ASSETS__')
    expect(worker).toContain("url.origin !== location.origin")
  })

  it('only removes stale Smriti offline caches during activation', () => {
    expect(worker).toContain("k.startsWith('smriti-sathi-offline-')")
    expect(worker).not.toContain("keys.filter((k) => k !== CACHE)")
  })

  it('never caches AI proxy traffic or no-store responses', () => {
    expect(worker).toContain("url.pathname.startsWith('/api/ai/')")
    expect(worker).toContain("res.headers.get('cache-control')")
    expect(worker).toContain("!/\\bno-store\\b/")
    expect(worker).toContain('if (res.ok) {')
  })

  it('collects all built same-origin assets except the worker itself', async () => {
    const assets = await collectPrecacheAssets()
    expect(assets).toContain('./index.html')
    expect(assets).toContain('./manifest.webmanifest')
    expect(assets).toContain('./alarm.wav')
    expect(assets).toContain('./icons/maskable-512.png')
    expect(assets.some((asset) => asset.endsWith('.js'))).toBe(true)
    expect(assets.some((asset) => asset.endsWith('.css'))).toBe(true)
    expect(assets).not.toContain('./sw.js')
  })
})
