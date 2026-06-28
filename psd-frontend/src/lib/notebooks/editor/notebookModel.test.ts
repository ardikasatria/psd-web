import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as m from './notebookModel.ts'

test('createNotebook punya satu sel code', () => {
  const nb = m.createNotebook()
  assert.equal(nb.cells.length, 1)
  assert.equal(nb.cells[0].type, 'code')
})

test('addCell menambah di akhir & di index', () => {
  let nb = m.createNotebook()
  nb = m.addCell(nb, { type: 'markdown', source: '# judul' })
  assert.equal(nb.cells.length, 2)
  assert.equal(nb.cells[1].type, 'markdown')
  nb = m.addCell(nb, { index: 0, source: 'awal' })
  assert.equal(nb.cells[0].source, 'awal')
})

test('deleteCell menghapus; tak pernah kosong', () => {
  let nb = m.createNotebook()
  const id = nb.cells[0].id
  nb = m.addCell(nb, { source: 'x' })
  nb = m.deleteCell(nb, id)
  assert.equal(nb.cells.length, 1)
  nb = m.deleteCell(nb, nb.cells[0].id)
  assert.equal(nb.cells.length, 1)
  assert.equal(nb.cells[0].source, '')
})

test('moveCell naik/turun & batas', () => {
  let nb = m.createNotebook()
  nb = m.addCell(nb, { source: 'kedua' })
  const first = nb.cells[0].id
  nb = m.moveCell(nb, first, 'down')
  assert.equal(nb.cells[1].id, first)
  nb = m.moveCell(nb, first, 'down')
  assert.equal(nb.cells[1].id, first)
})

test('changeCellType ke markdown mengosongkan output', () => {
  let nb = m.createNotebook()
  const id = nb.cells[0].id
  nb = m.setCellResult(nb, id, { outputs: [{ output_type: 'stream', text: 'hi' }], execution_count: 1 })
  nb = m.changeCellType(nb, id, 'markdown')
  assert.equal(nb.cells[0].type, 'markdown')
  assert.equal(nb.cells[0].outputs.length, 0)
})

test('setCellSource mengubah sumber', () => {
  let nb = m.createNotebook()
  const id = nb.cells[0].id
  nb = m.setCellSource(nb, id, 'print(1)')
  assert.equal(nb.cells[0].source, 'print(1)')
})

test('toSource/fromSource round-trip multiline', () => {
  for (const s of ['', 'a', 'a\nb', 'a\nb\n', 'satu\ndua\ntiga']) {
    assert.equal(m.fromSource(m.toSource(s)), s)
  }
})

test('ipynb round-trip mempertahankan sumber & tipe', () => {
  let nb = m.createNotebook()
  nb = m.setCellSource(nb, nb.cells[0].id, 'import psd\nx = 1')
  nb = m.addCell(nb, { type: 'markdown', source: '# Analisis\nteks' })
  const ip = m.toIpynb(nb)
  const md = ip.cells.find((c) => c.cell_type === 'markdown') as Record<string, unknown>
  assert.equal('execution_count' in md, false)
  assert.equal('outputs' in md, false)
  const back = m.fromIpynb(ip)
  assert.equal(back.cells[0].source, 'import psd\nx = 1')
  assert.equal(back.cells[1].source, '# Analisis\nteks')
  assert.equal(back.cells[1].type, 'markdown')
})

test('toIpynb valid bentuk dasar', () => {
  const ip = m.toIpynb(m.createNotebook())
  assert.equal(ip.nbformat, 4)
  assert.ok(Array.isArray(ip.cells))
  assert.ok(ip.cells.every((c) => 'id' in c && 'source' in c))
})
