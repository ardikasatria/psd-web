import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'

export const metadata = { title: 'Akses ditolak' }

export default function ForbiddenPage() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-bold text-primary-600">403</p>
      <h1 className="mt-4 text-2xl font-semibold">Anda tidak punya akses</h1>
      <p className="mt-2 max-w-md text-neutral-600 dark:text-neutral-400">
        Halaman ini hanya dapat diakses oleh administrator. Hubungi tim PSD jika Anda memerlukan akses.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonPrimary href="/">Kembali ke beranda</ButtonPrimary>
        <Link href="/dashboard" className="inline-flex items-center rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          Ke dasbor
        </Link>
      </div>
    </div>
  )
}
