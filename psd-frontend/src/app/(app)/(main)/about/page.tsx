import SectionHero from '@/components/SectionHero'
import rightImg from '@/images/about-hero-right.png'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Divider } from '@/shared/divider'
import { Metadata } from 'next'
import Link from 'next/link'
import SectionDocumentation from './SectionDocumentation'
import SectionFounder from './SectionFounder'
import SectionStatistic from './SectionStatistic'

export const metadata: Metadata = {
  title: 'Tentang kami',
  description: 'Tentang Projek Sains Data — platform sains data kolaboratif lokal Indonesia.',
}

export default function PageAbout() {
  return (
    <div className="nc-PageAbout relative">
      <div className="relative container space-y-16 py-16 lg:space-y-28 lg:py-28">
        <SectionHero
          rightImg={rightImg}
          heading="Tentang Projek Sains Data"
          btnText="Jelajahi platform"
          btnHref="/explore"
          subHeading="PSD adalah platform sains data kolaboratif lokal Indonesia — persilangan ide Hugging Face dan Kaggle dengan jembatan ke UMKM, kampus, dan organisasi. Kami menyediakan dataset, model, kompetisi, dan ruang belajar berbahasa Indonesia."
        />
        <Divider />
        <SectionDocumentation />
        <Divider />
        <SectionFounder />
        <Divider />
        <SectionStatistic />

        <div className="rounded-3xl bg-primary-50 p-8 text-center lg:p-12 dark:bg-neutral-800">
          <h2 className="text-2xl font-semibold lg:text-3xl">Siap berkolaborasi?</h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-600 dark:text-neutral-400">
            Unggah aset, ikuti kompetisi, atau bergabung dengan komunitas untuk memajukan sains data di Indonesia.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonPrimary href="/explore">Jelajahi aset</ButtonPrimary>
            <Button href="/contact" outline>
              Hubungi kami
            </Button>
          </div>
          <p className="mt-6 text-sm text-neutral-500">
            Atau kunjungi{' '}
            <Link href="/forum" className="font-medium text-primary-600 hover:underline">
              halaman forum
            </Link>{' '}
            untuk diskusi dengan kontributor lain.
          </p>
        </div>
      </div>
    </div>
  )
}
