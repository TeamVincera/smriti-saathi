import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = path.resolve('dist')
const forbidden = [
  /api\.groq\.com/i,
  /api\.sarvam\.ai/i,
  /Authorization\s*:/i,
  /VITE_(?:GROQ|SARVAM|AZURE_SPEECH)_/i,
  /ss_groq_api_key/i,
  /gsk_[A-Za-z0-9_-]{12,}/i,
]

async function files(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const output = []
  for (const entry of entries) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await files(file))
    else if (/\.(?:js|css|html|webmanifest)$/.test(entry.name)) output.push(file)
  }
  return output
}

const matches = []
for (const file of await files(root)) {
  const source = await fs.readFile(file, 'utf8')
  if (forbidden.some((pattern) => pattern.test(source))) matches.push(path.relative(process.cwd(), file))
}
if (matches.length) throw new Error(`Client build contains forbidden provider/key material: ${matches.join(', ')}`)
console.log(`AI client security scan passed (${(await files(root)).length} assets checked)`)
