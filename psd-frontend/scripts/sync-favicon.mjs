import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'public/apple-icon.png')

function pngToIcoEntry(size, png, offset) {
  const entry = Buffer.alloc(16)
  entry[0] = size >= 256 ? 0 : size
  entry[1] = size >= 256 ? 0 : size
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(offset, 12)
  return entry
}

async function buildFavicon(outPath) {
  const sizes = [16, 32, 48]
  const pngs = await Promise.all(
    sizes.map((size) => sharp(src).resize(size, size).png().toBuffer()),
  )

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)

  let offset = 6 + sizes.length * 16
  const entries = pngs.map((png, i) => {
    const entry = pngToIcoEntry(sizes[i], png, offset)
    offset += png.length
    return entry
  })

  writeFileSync(outPath, Buffer.concat([header, ...entries, ...pngs]))
}

if (!existsSync(src)) {
  console.error('public/apple-icon.png tidak ditemukan — lewati sync favicon')
  process.exit(0)
}

await buildFavicon(join(root, 'src/app/favicon.ico'))
await buildFavicon(join(root, 'public/favicon.ico'))
console.log('favicon.ico disinkronkan dari apple-icon.png')
