import { aboutGallery } from '@/data/about'
import Image from 'next/image'

export default function SectionDocumentation() {
  return (
    <section aria-labelledby="dokumentasi-heading">
      <div className="mx-auto max-w-2xl lg:mx-0">
        <h2 id="dokumentasi-heading" className="text-3xl font-semibold tracking-tight text-pretty sm:text-4xl lg:text-5xl">
          Dokumentasi aset & platform
        </h2>
        <p className="mt-6 text-lg/8 text-neutral-600 dark:text-neutral-400">
          Kumpulan visual identitas PSD dan cuplikan antarmuka platform — dataset, model, kompetisi, dan komunitas
          sains data berkonteks Indonesia.
        </p>
      </div>
      <ul className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {aboutGallery.map((item) => (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-900">
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
