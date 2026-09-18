import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('local AI proxy development workflow', () => {
  it('declares a Vite /api/ai proxy and a two-process dev runner', () => {
    const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    const runner = readFileSync(resolve(root, 'scripts/dev.mjs'), 'utf8')
    const proxy = readFileSync(resolve(root, 'server/ai-proxy.mjs'), 'utf8')

    expect(viteConfig).toContain("'/api/ai'")
    expect(viteConfig).toContain("target: 'http://127.0.0.1:8787'")
    expect(packageJson.scripts.dev).toBe('node scripts/dev.mjs')
    expect(packageJson.scripts['dev:vite']).toBe('vite')
    expect(runner).toContain("'--env-file=.env'")
    expect(runner).toContain("['server/ai-proxy.mjs']")
    expect(runner).toContain("['run', 'dev:vite']")
    expect(runner).not.toMatch(/console\.log\([^\n]*(?:KEY|SECRET|TOKEN)/i)
    expect(proxy).toContain('pathToFileURL(resolve(process.argv[1]))')
    expect(proxy).toContain("const HOST = process.env.HOST || '127.0.0.1'")
  })

  it('documents same-origin web and absolute HTTPS Capacitor deployment', () => {
    const docs = readFileSync(resolve(root, 'docs/AI_PROXY.md'), 'utf8')
    expect(docs).toContain('npm run dev')
    expect(docs).toContain('Vite forwards `/api/ai/*`')
    expect(docs).toContain('VITE_AI_PROXY_URL=https://')
    expect(docs).toContain('AI_PROXY_ORIGINS')
  })
})
