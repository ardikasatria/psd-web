import { heroGradient } from '@/components/common/featureGradients'
import { NotFoundIllustration } from '@/components/features/errors/NotFoundIllustration'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const QUICK_LINKS = [
  {
    href: '/explore',
    title: 'Jelajahi aset',
    description: 'Proyek, dataset, model, dan notebook komunitas.',
    icon: MagnifyingGlassIcon,
  },
  {
    href: '/help',
    title: 'Pusat bantuan',
    description: 'Panduan memulai, FAQ, dan dokumentasi PSD.',
    icon: QuestionMarkCircleIcon,
  },
  {
    href: '/forum',
    title: 'Forum',
    description: 'Diskusi dengan kontributor dan praktisi data.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    href: '/learn',
    title: 'Belajar',
    description: 'Kursus dan learning path berbahasa Indonesia.',
    icon: AcademicCapIcon,
  },
] as const

export function NotFoundPage() {
  return (
    <div className="container py-12 lg:py-20">
      <section
        className={`${heroGradient.notebook} grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-12`}
      >
        <div className="relative z-10 space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 ring-1 ring-primary-200/80 dark:bg-neutral-900/60 dark:text-primary-300 dark:ring-primary-800">
            Error 404
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
              Halaman tidak ditemukan
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-300">
              Alamat yang Anda buka tidak ada, sudah dipindahkan, atau tautannya salah. Coba kembali ke beranda atau
              jelajahi bagian lain dari Projek Sains Data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonPrimary href="/">
              <ArrowLeftIcon className="mr-2 inline size-4" aria-hidden />
              Kembali ke beranda
            </ButtonPrimary>
            <Button href="/explore" outline>
              Jelajahi aset
            </Button>
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <div className="w-full max-w-sm rounded-2xl bg-white/60 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur-sm dark:bg-neutral-900/50 dark:ring-neutral-700/80">
            <NotFoundIllustration className="h-auto w-full" />
          </div>
        </div>

        <div
          className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-primary-400/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -start-10 size-40 rounded-full bg-secondary-400/10 blur-3xl"
          aria-hidden
        />
      </section>

      <section className="mt-12 lg:mt-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Atau lanjut ke
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-700"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition group-hover:bg-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:group-hover:bg-primary-950">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">{title}</span>
                <span className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
