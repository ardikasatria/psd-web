'use client'

import { darkPanelClass, factoryGradient } from '@/components/common/featureGradients'
import {
  ArrowDownTrayIcon,
  BoltIcon,
  CheckCircleIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const SECTIONS = [
  {
    id: 'apa',
    title: 'Apa itu Pabrik Data?',
    body: 'Kanvas visual untuk merangkai pipeline: sumber (dataset PSD) → transform → sink gold. Hasil akhir menjadi aset dataset yang bisa dibagikan, dianalisis di Ruang Analitik, atau diproses di Ruang Panen Data.',
  },
  {
    id: 'engine',
    title: 'Dua pilihan engine',
    body: null,
    table: [
      ['Ukuran data kecil–menengah, butuh cepat', 'DuckDB (SQL)', 'Spark (PySpark)'],
      ['Data besar / terdistribusi', '—', 'Spark'],
      ['Node SQL SELECT-only', 'Tier menengah+', 'Spark SQL'],
      ['Node kode .py kustom', '—', 'Tier lanjut + akses kernel'],
    ],
  },
  {
    id: 'nodes',
    title: 'Jenis node',
    items: [
      'Source — dari aset dataset (termasuk output notebook & Ruang Panen Data)',
      'Filter, Select, Aggregate, Join — transform visual',
      'SQL — SELECT-only, merujuk node upstream sebagai tabel',
      'PySpark — kode .py kustom (tier lanjut)',
      'Sink — tepat satu keluaran gold',
    ],
  },
  {
    id: 'alur',
    title: 'Langkah menjalankan',
    steps: [
      'Susun node di kanvas & sambungkan alur',
      'Pilih engine (Auto / DuckDB / Spark)',
      'Validasi — lihat SQL/PySpark yang dihasilkan',
      'Pratinjau — sampel baris tanpa menyimpan',
      'Jalankan — hasil jadi dataset + tautan lihat dataset',
    ],
  },
  {
    id: 'tier',
    title: 'Batas tier',
    tiers: [
      { name: 'Pemula', duck: '≤200 MB, 5 run/hari', spark: 'Terkunci' },
      { name: 'Menengah', duck: '≤1 GB, 30 run/hari, node SQL', spark: '≤20 GB, 10 run/hari' },
      { name: 'Lanjut', duck: '≤5 GB, 100 run/hari', spark: '≤200 GB, node .py + kernel' },
    ],
  },
]

export function FactoryGuideContent() {
  return (
    <div className="space-y-8">
      <div className={factoryGradient.hero}>
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Cog6ToothIcon className="size-3.5" aria-hidden />
            Panduan lengkap
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
            Panduan Pabrik Data
          </h1>
          <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            Pelajari kapan memakai DuckDB vs Spark, cara menyusun pipeline di kanvas, dan integrasi dengan
            dataset, panen data, serta analitik.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/factory/pipelines"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Buka kanvas pipeline
            </Link>
            <Link
              href="/factory/sources"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
            >
              Kelola sumber data
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${darkPanelClass} p-6`}>
          <div className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            <BoltIcon className="size-5 text-amber-600 dark:text-amber-400" />
            Opsi A — DuckDB (SQL)
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Cepat & interaktif untuk data kecil–menengah. Node visual dikompilasi ke SQL; Anda bisa menambah
            node SQL SELECT-only (tier menengah+).
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <li className="flex gap-2">
              <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
              Hemat sumber daya, hasil hampir instan
            </li>
            <li className="flex gap-2">
              <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
              Cocok untuk eksplorasi & pipeline harian
            </li>
          </ul>
        </section>

        <section className={`${darkPanelClass} p-6`}>
          <div className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            <CpuChipIcon className="size-5 text-violet-600 dark:text-violet-400" />
            Opsi B — Spark (PySpark)
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Untuk data besar & terdistribusi. Node visual jadi PySpark; tier lanjut membuka node kode .py
            (butuh akses kernel).
          </p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <li className="flex gap-2">
              <CheckCircleIcon className="size-4 shrink-0 text-violet-500" />
              Komputasi paralel untuk volume besar
            </li>
            <li className="flex gap-2">
              <CheckCircleIcon className="size-4 shrink-0 text-violet-500" />
              Pilih <strong>Auto</strong> bila ragu — sistem memilih dari ukuran data
            </li>
          </ul>
        </section>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.id} className={`${factoryGradient.conceptBr}`}>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{s.title}</h2>
          {s.body && <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{s.body}</p>}
          {s.items && (
            <ul className="mt-4 list-disc space-y-1 ps-5 text-sm text-neutral-700 dark:text-neutral-300">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {s.steps && (
            <ol className="mt-4 space-y-2">
              {s.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          {s.tiers && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="px-3 py-2 font-semibold">Tier</th>
                    <th className="px-3 py-2 font-semibold">DuckDB</th>
                    <th className="px-3 py-2 font-semibold">Spark</th>
                  </tr>
                </thead>
                <tbody>
                  {s.tiers.map((t) => (
                    <tr key={t.name} className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{t.duck}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{t.spark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section className={`${darkPanelClass} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          <CircleStackIcon className="size-5 text-sky-600" />
          Integrasi ekosistem
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { href: '/factory/sources', label: 'Sumber data', desc: 'Daftarkan dataset sebagai source' },
            { href: '/harvest', label: 'Ruang Panen Data', desc: 'Panen API → dataset → pipeline' },
            { href: '/datasets', label: 'Dataset', desc: 'Hasil gold jadi aset dataset' },
            { href: '/analytics', label: 'Ruang Analitik', desc: 'Dashboard dari lapisan gold' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-4 transition hover:border-amber-200 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-amber-900"
            >
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{l.label}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <ShieldCheckIcon className="size-5 shrink-0 text-amber-700 dark:text-amber-400" />
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Hormati ToS sumber data, gunakan <strong>Pratinjau</strong> sebelum run penuh, dan baca SQL/PySpark
            yang ditampilkan saat validasi — cara terbaik belajar sambil berkarya.
          </p>
        </div>
      </section>

      <section className={`${darkPanelClass} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          <SparklesIcon className="size-5 text-primary-600" />
          Poin & Quest
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Aktivitas pipeline memberi poin reputasi. Quest khusus Pabrik Data tampil di sidebar editor — klaim
          reward saat selesai.
        </p>
        <Link href="/quests" className="mt-3 inline-flex text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
          Lihat semua quest →
        </Link>
      </section>
    </div>
  )
}
