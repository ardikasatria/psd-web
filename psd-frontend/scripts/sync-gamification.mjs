import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, '../psd-gamification/psd_gamification/gamification.json')
const dst = join(root, 'src/lib/gamification/gamification.json')

if (existsSync(src)) {
  copyFileSync(src, dst)
  console.log('gamification.json disinkronkan dari psd-gamification')
} else if (!existsSync(dst)) {
  console.error(
    'gamification.json tidak ditemukan — jalankan dari monorepo atau salin manual ke src/lib/gamification/',
  )
  process.exit(1)
}
