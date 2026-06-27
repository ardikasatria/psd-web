import { aboutTeam } from '@/data/about'
import Image from 'next/image'

export default function SectionFounder() {
  return (
    <section aria-labelledby="tim-heading">
      <div className="mx-auto max-w-2xl lg:mx-0">
        <h2 id="tim-heading" className="text-3xl font-semibold tracking-tight text-pretty sm:text-4xl lg:text-5xl">
          Tim & ekosistem
        </h2>
        <p className="mt-6 text-lg/8 text-neutral-600 dark:text-neutral-400">
          PSD dibangun bersama pengelola platform, komunitas kampus, mitra UMKM, dan kontributor data yang berkomitmen
          membuat sains data dapat diakses di Indonesia.
        </p>
      </div>
      <ul
        role="list"
        className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-12 text-center sm:grid-cols-3 lg:mx-0 lg:max-w-none lg:grid-cols-6"
      >
        {aboutTeam.map((person) => (
          <li key={person.id}>
            <div className="relative mx-auto size-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Image src={person.avatar} alt={person.name} fill className="object-cover" sizes="96px" />
            </div>
            <h3 className="mt-6 text-base/7 font-semibold tracking-tight">{person.name}</h3>
            <p className="text-sm/6 text-neutral-600 dark:text-neutral-400">{person.role}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
