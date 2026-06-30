'use client'

import { OpenNotebookButton } from '@/components/features/notebooks/OpenNotebookButton'
import {
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  CodeBracketSquareIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { conceptGradientBr, conceptGradientRow } from '@/components/common/featureGradients'
import clsx from 'clsx'
import Link from 'next/link'

const POINTS = [
  {
    icon: GlobeAltIcon,
    title: 'Terintegrasi di PSD',
    body: (
      <>
        Buat &amp; jalankan notebook <strong className="font-semibold text-neutral-900 dark:text-neutral-100">langsung di platform</strong>{' '}
        — gaya Kaggle, tanpa membuka UI JupyterHub.
      </>
    ),
  },
  {
    icon: BeakerIcon,
    title: 'Runtime hybrid',
    body: (
      <>
        Tier <strong>pemula</strong> → JupyterLite di browser (gratis). Tier lebih tinggi → kernel server terisolasi
        dengan kuota CPU/RAM.
      </>
    ),
  },
  {
    icon: ShareIcon,
    title: 'Katalog + Git',
    body: (
      <>
        Katalog PSD = kurasi metadata; berkas <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">.ipynb</code>{' '}
        disimpan di Git milik Anda. SDK <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">psd://</code>{' '}
        / <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">psd-lite</code>.
      </>
    ),
  },
] as const

const STEPS = [
  { icon: DocumentDuplicateIcon, title: 'Temukan', desc: 'Katalog referensi', accent: 'from-primary-400 to-primary-500' },
  { icon: CodeBracketSquareIcon, title: 'Mulai', desc: 'Workspace notebook PSD', accent: 'from-violet-400 to-indigo-500' },
  { icon: ArrowTopRightOnSquareIcon, title: 'Eksperimen', desc: 'psd:// & analisis', accent: 'from-indigo-400 to-violet-500' },
  { icon: ShareIcon, title: 'Bagikan', desc: 'Push Git & katalog', accent: 'from-amber-400 to-primary-500' },
] as const

export function NotebookConceptSection() {
  return (
    <section className="space-y-8">
      <div className={conceptGradientBr.notebook}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
              <CodeBracketSquareIcon className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Apa peran notebook di PSD?</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Praktik kode terintegrasi — bukan Colab, bukan upload file datar.
              </p>
            </div>
          </div>
          <OpenNotebookButton compact />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {POINTS.map((point) => {
            const Icon = point.icon
            return (
              <div
                key={point.title}
                className="rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-neutral-700/80 dark:bg-neutral-900/50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{point.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{point.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/help/notebook-membuka"
            className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            Panduan notebook →
          </Link>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <Link
            href="/help/notebook-simpan-push"
            className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            Simpan & push Git →
          </Link>
        </div>
      </div>

      <div className={conceptGradientRow.notebook}>
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Alur belajar praktik</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Dari katalog hingga berbagi workflow — notebook hidup di dalam PSD.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+1.75rem)] top-6 hidden h-0.5 w-[calc(100%-3.5rem)] bg-gradient-to-r from-primary-200 to-violet-200 dark:from-primary-800 dark:to-indigo-800 sm:block"
                    aria-hidden
                  />
                )}
                <div
                  className={clsx(
                    'flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                    step.accent,
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </div>
                <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{step.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Kernel server (tier Ahli+)</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Analisis berat dengan library Python penuh:
          </p>
          <code className="mt-3 block overflow-x-auto rounded-xl bg-neutral-100 px-4 py-3 font-mono text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            import psd{'\n'}
            df = psd.load(&quot;psd://pemilik/dataset/berkas.csv&quot;)
          </code>
        </div>
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-5 dark:border-sky-900/40 dark:bg-sky-950/20">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Browser (tier pemula)</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">JupyterLite + psd-lite di browser:</p>
          <code className="mt-3 block overflow-x-auto rounded-xl bg-white/80 px-4 py-3 font-mono text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            import psd_lite{'\n'}
            df = await psd_lite.load(&quot;psd://pemilik/dataset/berkas.csv&quot;)
          </code>
        </div>
      </div>
    </section>
  )
}
