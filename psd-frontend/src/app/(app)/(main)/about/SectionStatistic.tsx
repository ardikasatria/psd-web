export default function SectionStatistic() {
  return (
    <section aria-labelledby="dampak-heading">
      <div className="mx-auto max-w-4xl lg:mx-0">
        <h2 id="dampak-heading" className="text-3xl font-semibold tracking-tight text-pretty sm:text-4xl lg:text-5xl">
          PSD untuk ekosistem sains data lokal
        </h2>
        <p className="mt-6 text-base/7 text-neutral-600 dark:text-neutral-400">
          Kami menghubungkan riset, praktik, dan kebutuhan UMKM melalui dataset terbuka, kompetisi berkonteks lokal, dan
          ruang belajar berbahasa Indonesia.
        </p>
      </div>
      <div className="mx-auto mt-16 flex max-w-2xl flex-col gap-8 lg:mx-0 lg:mt-20 lg:max-w-none lg:flex-row lg:items-end">
        <div className="flex flex-col-reverse justify-between gap-x-16 gap-y-8 rounded-2xl bg-neutral-50 p-8 sm:w-3/4 sm:max-w-md sm:flex-row-reverse sm:items-end lg:w-72 lg:max-w-none lg:flex-none lg:flex-col lg:items-start dark:bg-neutral-800">
          <p className="flex-none text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">10+</p>
          <div className="sm:w-80 sm:shrink lg:w-auto lg:flex-none">
            <p className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Aset publik</p>
            <p className="mt-2 text-base/7 text-neutral-600 dark:text-neutral-400">
              Dataset, model, dan proyek dengan konteks Indonesia.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse justify-between gap-x-16 gap-y-8 rounded-2xl bg-neutral-900 p-8 sm:flex-row-reverse sm:items-end lg:w-full lg:max-w-sm lg:flex-auto lg:flex-col lg:items-start lg:gap-y-44 dark:bg-neutral-800">
          <p className="flex-none text-3xl font-bold tracking-tight text-white">200+</p>
          <div className="sm:w-80 sm:shrink lg:w-auto lg:flex-none">
            <p className="text-lg font-semibold tracking-tight text-white">UMKM terhubung</p>
            <p className="mt-2 text-base/7 text-neutral-400">
              Data dan kompetisi yang menjembatkan riset ke bisnis lokal.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse justify-between gap-x-16 gap-y-8 rounded-2xl bg-primary-600 p-8 sm:w-11/12 sm:max-w-xl sm:flex-row-reverse sm:items-end lg:w-full lg:max-w-none lg:flex-auto lg:flex-col lg:items-start lg:gap-y-28">
          <p className="flex-none text-3xl font-bold tracking-tight text-white">8</p>
          <div className="sm:w-80 sm:shrink lg:w-auto lg:flex-none">
            <p className="text-lg font-semibold tracking-tight text-white">Kursus & jalur belajar</p>
            <p className="mt-2 text-base/7 text-primary-100">
              Materi pembelajaran sains data dari tingkat pemula hingga mahir.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
