'use client'

import { darkPanelClass } from '@/components/common/featureGradients'
import { useState } from 'react'
import clsx from 'clsx'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

const DTYPES = [
  { id: 'int', desc: 'Bilangan bulat — params: min, max', example: '{"min": 0, "max": 1000}' },
  { id: 'float', desc: 'Desimal — params: min, max, decimals', example: '{"min": 0.0, "max": 1.0}' },
  { id: 'category', desc: 'Label diskret — params: categories[]', example: '{"categories": ["A","B"]}' },
  { id: 'bool', desc: 'True/false', example: '{}' },
  { id: 'datetime', desc: 'Tanggal — params: start, end (ISO)', example: '{"start":"2024-01-01","end":"2024-12-31"}' },
  { id: 'name', desc: 'Nama orang (locale ID)', example: '{}' },
  { id: 'city', desc: 'Kota Indonesia', example: '{}' },
  { id: 'company', desc: 'Nama perusahaan fiktif', example: '{}' },
  { id: 'phone', desc: 'Nomor telepon format lokal', example: '{}' },
  { id: 'text', desc: 'Teks bebas pendek', example: '{}' },
  { id: 'formula', desc: 'Kolom derived — params: formula', example: '{"formula": "omzet / qty"}' },
] as const

export function SynthesisDtypeGuide() {
  const [open, setOpen] = useState(false)

  return (
    <section className={darkPanelClass}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Referensi tipe kolom (dtype)</h3>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Pelajari parameter JSON — kunci naik skill desain skema.</p>
        </div>
        <ChevronDownIcon className={clsx('size-5 shrink-0 text-neutral-400 transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-neutral-100 px-5 pb-5 dark:border-neutral-700">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                  <th className="pb-2 pe-4">dtype</th>
                  <th className="pb-2 pe-4">Kegunaan</th>
                  <th className="pb-2">Contoh params</th>
                </tr>
              </thead>
              <tbody>
                {DTYPES.map((d) => (
                  <tr key={d.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2.5 pe-4 font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{d.id}</td>
                    <td className="py-2.5 pe-4 text-neutral-600 dark:text-neutral-400">{d.desc}</td>
                    <td className="py-2.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">{d.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
