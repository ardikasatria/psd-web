# PSD — Instruksi Cursor: Membangun Dashboard (Fase 0)

> **Cara pakai:** Lampirkan ke Cursor bersama *PSD_Frontend_Fase0_Instruksi_Cursor.md* (kontrak API ada di sana, Bagian 8). File ini khusus membangun halaman **`/dashboard`** — beranda setelah login. **Kerjakan hanya langkah ini.**

## 1. Tujuan & Lingkup

Membangun dashboard yang **menyusun ulang (compose)** fitur Fase 0 yang sudah ada menjadi satu beranda berguna untuk pengguna yang login: ringkasan, kompetisi & event aktif, aset milik sendiri, aktivitas komunitas, dan jalan masuk ke belajar.

**Aturan kunci:** dashboard **tidak boleh menambah endpoint baru** — semuanya dirangkai dari endpoint kontrak yang sudah diimplementasikan backend (Langkah 4–8). Jika sebuah widget butuh data yang belum ada endpoint-nya, **jangan dibuat** — lihat Bagian 7 (peningkatan opsional).

## 2. Guardrails (ulang dari dokumen utama)

- **Tema yang dibeli = sumber kebenaran visual.** Susun dashboard dari komponen tema (kartu, statistik, daftar, skeleton, tombol). Jangan membuat gaya baru. Di bawah, komponen tema ditulis sebagai `<ThemeCard>`, `<ThemeStat>`, `<ThemeSkeleton>`, `<ThemeButton>` — **ganti dengan komponen asli tema Anda**.
- **Semua data lewat `lib/api/*` + TanStack Query.** Tidak ada `fetch` langsung, tidak ada data hardcoded.
- **Setiap widget punya state loading / kosong / error.**
- **Copy Indonesia, kalimat aktif.** Layar kosong = ajakan bertindak, bukan sekadar "tidak ada data".
- **Responsif** sampai mobile; **terlindungi auth** (redirect bila belum login).

## 3. Tata Letak (struktur, bukan gaya)

Tema menentukan tampilannya; ini hanya urutan & isi:

```
┌──────────────────────────────────────────────┐
│ Sapaan ("Selamat datang, {nama}") + aksi cepat │
├──────────────────────────────────────────────┤
│ [Aset saya] [Kompetisi aktif] [Event mendatang]│  ← kartu statistik
├───────────────────────────┬──────────────────┤
│ Kompetisi aktif (3)        │ Event mendatang (3)│
│ Aset terbaru saya (4)      │ Mulai belajar (3) │
│ Aktivitas komunitas (5)    │ Jelajahi data (4) │
└───────────────────────────┴──────────────────┘
```

Dua kolom di desktop, menumpuk (stack) di mobile. **Aksi cepat:** Buat proyek · Mulai notebook · Ikuti kompetisi · Tulis di forum.

## 4. Peta Data → Widget (hanya endpoint yang sudah ada)

| Widget | Endpoint | Catatan |
|---|---|---|
| Sapaan + identitas | `GET /auth/me` | nama & avatar; sumber `username` |
| Kartu "Aset saya" | `GET /users/{username}` → `stats.repos` | username dari `/auth/me` |
| Kartu "Kompetisi aktif" | `GET /competitions?status=active` → `total` | angka |
| Kartu "Event mendatang" | `GET /events?status=upcoming` → `total` | angka |
| Kompetisi aktif (daftar) | `GET /competitions?status=active&page_size=3` | sorot fitur jembatan |
| Event mendatang (daftar) | `GET /events?status=upcoming&page_size=3` | tombol "Lihat detail" |
| Aset terbaru saya | `GET /users/{username}/portfolio?page_size=4` | kosong → CTA buat proyek |
| Aktivitas komunitas | `GET /forum/threads?page_size=5` | utas terbaru |
| Mulai belajar | `GET /courses?page_size=3` | rekomendasi (lihat catatan) |
| Jelajahi data & model | `GET /datasets?page_size=4` | penemuan |

> **Catatan jujur (batas Fase 0):**
> - "**Lanjutkan belajar**" belum bisa — belum ada endpoint progres. Gunakan "**Mulai belajar**" (rekomendasi) sebagai gantinya.
> - "**Submission saya**" lintas kompetisi & "**Event saya**" (registrasi saya) **butuh endpoint baru** dan **tidak** dibuat sekarang (lihat Bagian 7).

## 5. Pola Implementasi

### 5.1 Penjaga auth — `lib/auth/useAuthGuard.ts`

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("psd_token")) {
      router.replace("/login?next=/dashboard");
    }
  }, [router]);
}
```

### 5.2 Hook data (TanStack Query) — `lib/api/dashboard.ts`

Gunakan fungsi API yang **sudah ada** dari Fase 0; tambahkan hanya jika belum ada: `getMe` (di `auth.ts`), `getUserProfile` & `getPortfolio` (di `users.ts`).

```ts
import { useQuery } from "@tanstack/react-query";
import { getMe } from "./auth";
import { getUserProfile, getPortfolio } from "./users";
import { getCompetitions } from "./competitions";
import { getEvents } from "./events";
import { getThreads } from "./community";
import { getCourses } from "./learn";
import { listRepos } from "./repos"; // datasets/models/projects

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: getMe });

export const useActiveCompetitions = () =>
  useQuery({ queryKey: ["dash", "comp"], queryFn: () => getCompetitions({ status: "active", page_size: 3 }) });

export const useUpcomingEvents = () =>
  useQuery({ queryKey: ["dash", "events"], queryFn: () => getEvents({ status: "upcoming", page_size: 3 }) });

export const useMyPortfolio = (username?: string) =>
  useQuery({ enabled: !!username, queryKey: ["dash", "portfolio", username],
            queryFn: () => getPortfolio(username!, { page_size: 4 }) });

export const useRecentThreads = () =>
  useQuery({ queryKey: ["dash", "threads"], queryFn: () => getThreads({ page_size: 5 }) });

export const useRecommendedCourses = () =>
  useQuery({ queryKey: ["dash", "courses"], queryFn: () => getCourses({ page_size: 3 }) });

export const useExploreDatasets = () =>
  useQuery({ queryKey: ["dash", "datasets"], queryFn: () => listRepos("datasets", { page_size: 4 }) });
```

> Pastikan fungsi API mendukung param `page_size` (teruskan ke query string lewat `apiFetch`).

### 5.3 Pembungkus section dengan 3 state — `components/dashboard/Section.tsx`

```tsx
"use client";
import type { UseQueryResult } from "@tanstack/react-query";

export function Section<T>({ title, href, query, children, empty }: {
  title: string;
  href?: string;
  query: UseQueryResult<{ items: T[]; total: number }>;
  children: (items: T[]) => React.ReactNode;
  empty: React.ReactNode;
}) {
  const { data, isLoading, isError, refetch } = query;
  return (
    <ThemeCard>
      <header>
        <h3>{title}</h3>
        {href && <ThemeButton href={href} variant="ghost">Lihat semua</ThemeButton>}
      </header>

      {isLoading && <ThemeSkeleton rows={3} />}
      {isError && (
        <div>
          <p>Gagal memuat. Coba lagi.</p>
          <ThemeButton onClick={() => refetch()}>Muat ulang</ThemeButton>
        </div>
      )}
      {!isLoading && !isError && (data?.items.length ? children(data.items) : empty)}
    </ThemeCard>
  );
}
```

### 5.4 Halaman dashboard — `app/(app)/dashboard/page.tsx`

```tsx
"use client";
import { useAuthGuard } from "@/lib/auth/useAuthGuard";
import {
  useMe, useActiveCompetitions, useUpcomingEvents, useMyPortfolio,
  useRecentThreads, useRecommendedCourses, useExploreDatasets,
} from "@/lib/api/dashboard";
import { Section } from "@/components/dashboard/Section";

export default function DashboardPage() {
  useAuthGuard();
  const me = useMe();
  const username = me.data?.username;

  const comps = useActiveCompetitions();
  const events = useUpcomingEvents();
  const portfolio = useMyPortfolio(username);
  const threads = useRecentThreads();
  const courses = useRecommendedCourses();
  const datasets = useExploreDatasets();

  return (
    <div className="dashboard">
      {/* Sapaan + aksi cepat */}
      <section>
        <h1>Selamat datang{me.data ? `, ${me.data.name}` : ""}</h1>
        <div>
          <ThemeButton href="/projects/new">Buat proyek</ThemeButton>
          <ThemeButton href="/notebooks">Mulai notebook</ThemeButton>
          <ThemeButton href="/competitions">Ikuti kompetisi</ThemeButton>
          <ThemeButton href="/community">Tulis di forum</ThemeButton>
        </div>
      </section>

      {/* Kartu statistik */}
      <section className="stats">
        <ThemeStat label="Aset saya" value={portfolio.data?.total ?? "—"} />
        <ThemeStat label="Kompetisi aktif" value={comps.data?.total ?? "—"} />
        <ThemeStat label="Event mendatang" value={events.data?.total ?? "—"} />
      </section>

      {/* Grid dua kolom */}
      <div className="grid">
        <Section title="Kompetisi aktif" href="/competitions" query={comps}
          empty={<EmptyCTA text="Belum ada kompetisi aktif." href="/competitions" cta="Jelajahi kompetisi" />}>
          {(items) => items.map((c: any) => <CompetitionRow key={c.slug} c={c} />)}
        </Section>

        <Section title="Event mendatang" href="/events" query={events}
          empty={<EmptyCTA text="Belum ada event terjadwal." href="/events" cta="Lihat semua event" />}>
          {(items) => items.map((e: any) => <EventRow key={e.slug} e={e} />)}
        </Section>

        <Section title="Aset terbaru saya" href={username ? `/u/${username}` : "/projects"} query={portfolio}
          empty={<EmptyCTA text="Anda belum punya aset. Mulai dari proyek pertama." href="/projects/new" cta="Buat proyek" />}>
          {(items) => items.map((r: any) => <RepoRow key={r.id} r={r} />)}
        </Section>

        <Section title="Mulai belajar" href="/learn" query={courses}
          empty={<EmptyCTA text="Belum ada course." href="/learn" cta="Telusuri course" />}>
          {(items) => items.map((c: any) => <CourseRow key={c.slug} c={c} />)}
        </Section>

        <Section title="Aktivitas komunitas" href="/community" query={threads}
          empty={<EmptyCTA text="Belum ada diskusi. Mulai utas pertama." href="/community" cta="Tulis di forum" />}>
          {(items) => items.map((t: any) => <ThreadRow key={t.id} t={t} />)}
        </Section>

        <Section title="Jelajahi dataset" href="/datasets" query={datasets}
          empty={<EmptyCTA text="Belum ada dataset." href="/datasets" cta="Jelajahi dataset" />}>
          {(items) => items.map((d: any) => <RepoRow key={d.id} r={d} />)}
        </Section>
      </div>
    </div>
  );
}
```

> `CompetitionRow`, `EventRow`, `RepoRow`, `CourseRow`, `ThreadRow`, `EmptyCTA`, dan `ThemeStat` dibangun dari komponen tema. Gunakan kembali baris/kartu daftar yang sudah dipakai di halaman list Fase 0 agar konsisten.

## 6. Navigasi & Rute

- "/" tetap **landing publik**; "/dashboard" untuk pengguna login.
- Setelah login berhasil, arahkan ke `/dashboard` (hormati `?next=` bila ada).
- Tambahkan "Dashboard" ke menu utama (header/sidebar tema) yang tampil saat login.

## 7. Peningkatan Opsional (perlu endpoint baru — JANGAN dibuat sekarang)

Jika nanti ingin widget berikut, **tambahkan dulu ke kontrak** lalu backend implementasikan:
- "Submission saya" lintas kompetisi → `GET /me/submissions`.
- "Event saya" (registrasi saya) → `GET /me/events`.
- "Lanjutkan belajar" (progres) → `GET /me/learning-progress`.
- Umpan aktivitas tergabung → `GET /me/activity`.

## 8. Definition of Done

- [ ] `/dashboard` ada di grup `(app)`, terlindungi auth (redirect ke `/login?next=/dashboard` bila belum login).
- [ ] Semua widget mengambil data dari `lib/api/*` + TanStack Query; **tidak ada** endpoint baru atau data hardcoded.
- [ ] Setiap section punya state **loading (skeleton tema)**, **error (dengan muat ulang)**, dan **kosong (dengan CTA)**.
- [ ] Pengguna baru tanpa aset melihat ajakan membuat proyek, bukan kartu kosong.
- [ ] Kartu statistik menampilkan `total` dari endpoint terkait.
- [ ] Responsif (dua kolom → menumpuk di mobile); seluruh tampilan memakai komponen tema; copy Indonesia, kalimat aktif.
- [ ] "Dashboard" muncul di navigasi setelah login; login mengarahkan ke `/dashboard`.
