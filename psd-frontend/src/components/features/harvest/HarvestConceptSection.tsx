'use client'

import { harvestGradient } from '@/components/common/featureGradients'
import { CloudArrowDownIcon, CpuChipIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export function HarvestConceptSection() {
  const steps = [
    {
      icon: CloudArrowDownIcon,
      title: 'Sumber API',
      desc: 'Tentukan endpoint https, metode, parameter, dan autentikasi — rahasia disimpan aman di vault.',
    },
    {
      icon: CpuChipIcon,
      title: 'Paginasi & pemetaan',
      desc: 'Atur strategi halaman, batas record, rate limit, lalu petakan field keluaran dari pratinjau.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Tujuan dataset',
      desc: 'Hasil panen langsung menjadi aset dataset Anda — siap dibagikan, dianalisis, atau diproses di Pabrik Data.',
    },
  ]

  return (
    <section className={harvestGradient.conceptBr}>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Alur Ruang Panen Data
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Panen data dari API eksternal secara sopan dan terkontrol, lalu salurkan ke dataset PSD — bukan
        disimpan terpisah seperti Data Sintesis.
      </p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="rounded-2xl border border-emerald-200/60 bg-white/80 p-4 dark:border-emerald-900/40 dark:bg-neutral-800/80"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <s.icon className="size-4" aria-hidden />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Langkah {i + 1}
            </p>
            <h3 className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">{s.title}</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
