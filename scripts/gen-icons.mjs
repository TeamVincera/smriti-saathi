import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size)
      const o = rowStart + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BLUE_TOP = [0, 102, 204]
const BLUE_BOT = [0, 82, 168]

function roundedRectDist(x, y, size, radius, pad) {
  const cx = Math.min(Math.max(x, pad + radius), pad + size - radius)
  const cy = Math.min(Math.max(y, pad + radius), pad + size - radius)
  return Math.hypot(x - cx, y - cy) - radius
}

function drawLogo(x, y, size, pad) {
  const s = size - pad * 2
  const u = s / 48
  const lx = (x - pad) / u
  const ly = (y - pad) / u

  const petals = [
    { cx: 24, cy: 15, rx: 4.2, ry: 4.2 },
    { cx: 24, cy: 31.5, rx: 4.6, ry: 6.5, rot: 0 },
    { cx: 16.5, cy: 23, rx: 3.6, ry: 6, rot: -60 },
    { cx: 31.5, cy: 23, rx: 3.6, ry: 6, rot: 60 },
  ]
  for (const p of petals) {
    let px = lx - p.cx
    let py = ly - p.cy
    if (p.rot) {
      const rad = (p.rot * Math.PI) / 180
      const cosr = Math.cos(-rad)
      const sinr = Math.sin(-rad)
      const nx = px * cosr - py * sinr
      const ny = px * sinr + py * cosr
      px = nx
      py = ny
    }
    const d = Math.hypot(px / p.rx, py / p.ry) - 1
    if (d <= 0 && !(lx >= 22.2 && lx <= 25.8 && ly >= 22.2 && ly <= 25.8)) return true
  }
  return false
}

function render(size, maskable) {
  const pad = maskable ? Math.round(size * 0.14) : 0
  const radius = Math.round(maskable ? size : size * (size >= 192 ? 0.225 : 0.21))
  return encodePng(size, (x, y) => {
    const d = roundedRectDist(x + 0.5, y + 0.5, size, radius, 0)
    if (d > 0) return [0, 0, 0, 0]
    const t = y / size
    const base = [
      Math.round(BLUE_TOP[0] + (BLUE_BOT[0] - BLUE_TOP[0]) * t),
      Math.round(BLUE_TOP[1] + (BLUE_BOT[1] - BLUE_TOP[1]) * t),
      Math.round(BLUE_TOP[2] + (BLUE_BOT[2] - BLUE_TOP[2]) * t),
      255,
    ]
    if (drawLogo(x + 0.5, y + 0.5, size, pad)) return [255, 255, 255, 255]
    return base
  })
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url)

writeFileSync(out('icon-192.png'), render(192, false))
writeFileSync(out('icon-512.png'), render(512, false))
writeFileSync(out('maskable-512.png'), render(512, true))
writeFileSync(out('apple-touch-icon.png'), render(180, false))
console.log('icons generated')
