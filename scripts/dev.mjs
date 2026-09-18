import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const envFile = resolve(root, '.env')

function loadDotEnv(target) {
  if (!existsSync(envFile)) return target
  const parsed = readFileSync(envFile, 'utf8')
  for (const rawLine of parsed.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const name = line.slice(0, separator).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || name in target) continue
    const rawValue = line.slice(separator + 1).trim()
    target[name] = rawValue.replace(/^("|')|("|')$/g, '')
  }
  return target
}

function supportsNodeEnvFile() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  return major > 20 || (major === 20 && minor >= 6) || major >= 21
}

const useNodeEnvFile = supportsNodeEnvFile() && existsSync(envFile)
const proxyEnv = useNodeEnvFile ? { ...process.env } : loadDotEnv({ ...process.env })
const viteEnv = { ...process.env }
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const proxyArgs = useNodeEnvFile ? ['--env-file=.env', 'server/ai-proxy.mjs'] : ['server/ai-proxy.mjs']
const children = []
let shuttingDown = false

function start(command, args, env) {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' })
  children.push(child)
  child.once('exit', (code, signal) => {
    if (shuttingDown) return
    shuttingDown = true
    for (const other of children) if (other !== child && !other.killed) other.kill('SIGTERM')
    process.exit(code ?? (signal ? 1 : 0))
  })
  return child
}

start(process.execPath, proxyArgs, proxyEnv)
start(npmCommand, ['run', 'dev:vite'], viteEnv)

function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) if (!child.killed) child.kill(signal)
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
