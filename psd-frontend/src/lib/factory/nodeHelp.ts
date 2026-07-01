import type { PipelineNode } from '@/types/api'

export type NodeHelpKey =
  | 'source'
  | 'sink'
  | 'select'
  | 'filter'
  | 'join'
  | 'aggregate'
  | 'cast'
  | 'derive'
  | 'dedupe'
  | 'sql'
  | 'pyspark'

export type NodeHelp = {
  title: string
  summary: string
  steps: string[]
  dataHint?: string
  codeHint?: string
}

export function nodeHelpKey(kind: PipelineNode['type'], op?: PipelineNode['op']): NodeHelpKey {
  if (kind === 'source') return 'source'
  if (kind === 'sink') return 'sink'
  return (op ?? 'select') as NodeHelpKey
}

export const NODE_HELP: Record<NodeHelpKey, NodeHelp> = {
  source: {
    title: 'Source',
    summary: 'Titik awal — baca dataset yang sudah didaftarkan sebagai sumber.',
    steps: [
      'Daftarkan dataset di Sumber Data (termasuk hasil Ruang Panen Data).',
      'Pilih sumber di dropdown — kolom skema otomatis tersedia untuk node di bawahnya.',
      'Sambungkan keluaran (handle kanan) ke node transform.',
    ],
    dataHint: 'Kolom muncul setelah source_id dipilih dan skema dimuat.',
  },
  select: {
    title: 'Select',
    summary: 'Pilih subset kolom dari data hulu.',
    steps: [
      'Sambungkan node hulu ke handle kiri.',
      'Centang kolom yang ingin dipertahankan.',
      'Validasi untuk melihat SQL SELECT yang dihasilkan.',
    ],
    dataHint: 'Daftar kolom diambil dari node yang terhubung langsung di atasnya.',
    codeHint: 'SELECT col_a, col_b FROM upstream_node',
  },
  filter: {
    title: 'Filter',
    summary: 'Saring baris berdasarkan nilai kolom.',
    steps: [
      'Pilih kolom, operator (=, >, contains, …), dan nilai pembanding.',
      'Pastikan tipe nilai cocok dengan kolom (angka vs teks).',
    ],
    dataHint: 'Kolom harus ada di skema node hulu.',
    codeHint: "WHERE rating >= '4'",
  },
  join: {
    title: 'Join',
    summary: 'Gabungkan dua alur data (inner / left).',
    steps: [
      'Sambungkan dua node ke handle kiri (atas & bawah).',
      'Pilih left_on dan right_on — biasanya kunci yang sama di kedua sisi.',
      'Pilih tipe join: inner (irisan) atau left (pertahankan kiri).',
    ],
    dataHint: 'Kolom kiri dari cabang pertama, kanan dari cabang kedua.',
    codeHint: 'JOIN … ON left.col = right.col',
  },
  aggregate: {
    title: 'Aggregate',
    summary: 'Ringkas data per grup (GROUP BY + agregasi).',
    steps: [
      'Centang kolom group by.',
      'Pilih kolom yang diagregasi (mis. sum, count).',
    ],
    dataHint: 'Kolom group by harus dari node hulu.',
    codeHint: 'GROUP BY kategori · SUM(jumlah)',
  },
  cast: {
    title: 'Cast',
    summary: 'Ubah tipe data kolom (mis. teks → angka).',
    steps: ['Pilih kolom yang akan di-cast.', 'Engine menerapkan konversi ke tipe target.'],
    dataHint: 'Berguna sebelum filter numerik atau agregasi.',
  },
  derive: {
    title: 'Derive',
    summary: 'Buat kolom baru dari ekspresi sederhana.',
    steps: [
      'Isi nama kolom baru dan ekspresi (mis. price * qty).',
      'Hanya kolom hulu yang valid boleh dipakai dalam ekspresi.',
    ],
    dataHint: 'Peringatan validasi muncul jika ekspresi merujuk kolom tak dikenal.',
    codeHint: 'new_col = expr',
  },
  dedupe: {
    title: 'Dedupe',
    summary: 'Hapus baris duplikat dari data hulu.',
    steps: ['Sambungkan satu node hulu — tidak perlu parameter.', 'Semua kolom dipakai untuk mendeteksi duplikat.'],
    dataHint: 'Output baris unik penuh.',
  },
  sql: {
    title: 'SQL',
    summary: 'Tulis kueri SELECT-only — node hulu jadi tabel virtual.',
    steps: [
      'Sambungkan node hulu; catat id node tersebut (mis. t1).',
      'Tulis SELECT yang merujuk id sebagai nama tabel.',
      'Hanya SELECT diizinkan — tier Menengah+.',
      'Klik Validasi untuk melihat SQL lengkap pipeline.',
    ],
    dataHint: 'Nama tabel = id node upstream, bukan nama dataset.',
    codeHint: 'SELECT rating, text FROM t1 WHERE rating > 3',
  },
  pyspark: {
    title: 'PySpark',
    summary: 'Kode Python kustom untuk transformasi kompleks (Spark).',
    steps: [
      'Definisikan fungsi transform(inputs) — inputs adalah list DataFrame hulu.',
      'Kembalikan DataFrame hasil.',
      'Butuh engine Spark & tier Lanjut + akses kernel.',
    ],
    dataHint: 'inputs[0] = DataFrame dari cabang pertama.',
    codeHint: 'def transform(inputs):\n    return inputs[0].dropDuplicates()',
  },
  sink: {
    title: 'Sink',
    summary: 'Keluaran akhir pipeline — materialisasi ke layer gold (parquet).',
    steps: [
      'Pipeline harus punya tepat satu sink.',
      'Sambungkan transform terakhir ke sink.',
      'Setelah run, hasil jadi aset dataset untuk analitik.',
    ],
    dataHint: 'Format default: parquet.',
  },
}

export function getNodeHelp(kind: PipelineNode['type'], op?: PipelineNode['op']): NodeHelp {
  return NODE_HELP[nodeHelpKey(kind, op)]
}
