'use client'

import { OpenHubButton } from '@/components/features/notebooks/OpenHubButton'
import {
  ArrowTopRightOnSquareIcon,
  CloudIcon,
  CodeBracketSquareIcon,
  DocumentDuplicateIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { conceptGradientBr, conceptGradientRow } from '@/components/common/featureGradients'
import clsx from 'clsx'
import Link from 'next/link'

const POINTS = [
  {
    icon: CloudIcon,
    title: 'JupyterHub PSD',
    body: (
      <>
        Server notebook pribadi di{' '}
        <strong className="font-semibold text-neutral-900 dark:text-neutral-100">hub.projeksainsdata.com</strong> —
        masuk otomatis dengan akun PSD (OAuth), tanpa instalasi lokal, batas sumber daya sesuai tier.
      </>
    ),
  },
  {
    icon: DocumentDuplicateIcon,
    title: 'Katalog = metadata',
    body: (
      <>
        PSD mengkurasi referensi &amp; workflow — bukan hosting file seperti Kaggle. Berkas{' '}
        <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">.ipynb</code> disimpan di Git
        (Gitea) milik Anda.
      </>
    ),
  },
  {
    icon: ShareIcon,
    title: 'Ekosistem terhubung',
    body: (
      <>
        Melengkapi kursus, data sintesis, kompetisi, dan Ruang Ide — dokumentasi eksperimen nyata dengan SDK{' '}
        <code className="rounded bg-neutral-100 px-1 text-xs dark:bg-neutral-800">psd://</code>.
      </>
    ),
  },
] as const

const STEPS = [
  { icon: DocumentDuplicateIcon, title: 'Temukan', desc: 'Jelajahi katalog referensi', accent: 'from-primary-400 to-primary-500' },
  { icon: CodeBracketSquareIcon, title: 'Buka Notebook', desc: 'Login PSD → JupyterHub', accent: 'from-violet-400 to-indigo-500' },
  { icon: ArrowTopRightOnSquareIcon, title: 'Eksperimen', desc: 'Dataset psd:// & analisis', accent: 'from-indigo-400 to-violet-500' },
  { icon: ShareIcon, title: 'Bagikan', desc: 'Push Git & daftar katalog', accent: 'from-amber-400 to-primary-500' },
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
                Praktik kode terintegrasi platform — bukan Colab atau upload file datar.
              </p>
            </div>
          </div>
          <OpenHubButton compact showLoginHint />
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

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/help/notebook-membuka"
            className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            Panduan JupyterHub →
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
            Dari katalog hingga berbagi workflow — lewat JupyterHub terintegrasi login PSD.
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

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Akses dataset di notebook</h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Di JupyterHub, muat dataset PSD langsung tanpa unduh manual:
        </p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-neutral-100 px-4 py-3 font-mono text-xs text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          import psd{'\n'}
          df = psd.load(&quot;psd://pemilik/dataset/berkas.csv&quot;)
        </code>
      </div>
    </section>
  )
}
