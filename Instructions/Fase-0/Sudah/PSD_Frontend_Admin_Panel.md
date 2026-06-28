# PSD — Instruksi Cursor: Admin Panel (Fase 0)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun panel admin di `/admin` untuk mengelola pengguna dan seluruh fitur. **Kerjakan hanya langkah ini.** Prasyarat: backend Langkah 12 + kontrak diperbarui.
>
> **Pola:** bangun **shell + guard + Ringkasan + Pengguna + Kompetisi** secara penuh sebagai template; resource lain (Event, Course, Learning Path, Aset, Forum) mengikuti pola tabel/form yang sama.

## 1. Guardrails

- **Tema = sumber kebenaran visual.** Pakai komponen tema untuk tabel, form, modal, konfirmasi, badge. Banyak tema premium punya layout "admin/dashboard" — gunakan itu.
- Semua data via `lib/api/admin.ts` + TanStack Query; mutasi pakai `useMutation` + `invalidateQueries`.
- **Akses ganda:** harus login **dan** `role === "admin"`. Selain itu → halaman 403.
- Aksi merusak (hapus, ubah role) wajib **dialog konfirmasi**. Copy Indonesia, kalimat aktif.

## 2. Guard admin — `lib/auth/useAdminGuard.ts`

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/api/dashboard";

export function useAdminGuard() {
  const router = useRouter();
  const me = useMe();
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("psd_token")) {
      router.replace("/login?next=/admin");
    } else if (me.data && me.data.role !== "admin") {
      router.replace("/403");
    }
  }, [me.data, router]);
  return me;
}
```

## 3. Skema & API — `types/api.ts` + `lib/api/admin.ts`

```ts
// types/api.ts
export const AdminUserSchema = z.object({
  id: z.string(), username: z.string(), email: z.string(), name: z.string(),
  role: z.enum(["user", "org_admin", "admin"]), is_active: z.boolean(), created_at: z.string(),
});
export const PaginatedAdminUser = Paginated(AdminUserSchema);
export const AdminStatsSchema = z.object({
  users: z.number(), repos: z.number(), competitions: z.number(),
  events: z.number(), courses: z.number(), threads: z.number(),
});
```

```ts
// lib/api/admin.ts
import { apiFetch } from "./client";
import { AdminStatsSchema, PaginatedAdminUser, AdminUserSchema } from "@/types/api";
import { z } from "zod";

export const getStats = () => apiFetch(`/admin/stats`, AdminStatsSchema);

export const listUsers = (q: { q?: string; page?: number } = {}) =>
  apiFetch(`/admin/users?${new URLSearchParams(q as Record<string, string>)}`, PaginatedAdminUser);
export const updateUser = (id: string, body: { role?: string; is_active?: boolean }) =>
  apiFetch(`/admin/users/${id}`, AdminUserSchema, { method: "PATCH", body: JSON.stringify(body) });
export const deleteUser = (id: string) =>
  apiFetch(`/admin/users/${id}`, z.any(), { method: "DELETE" });

// Kompetisi (template CRUD konten)
export const createCompetition = (body: any) =>
  apiFetch(`/admin/competitions`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(body) });
export const updateCompetition = (slug: string, body: any) =>
  apiFetch(`/admin/competitions/${slug}`, z.object({ slug: z.string() }), { method: "PATCH", body: JSON.stringify(body) });
export const deleteCompetition = (slug: string) =>
  apiFetch(`/admin/competitions/${slug}`, z.any(), { method: "DELETE" });
```

Tambahkan handler MSW untuk endpoint admin (mode mock) dengan data ringkas.

## 4. Shell admin — `app/(admin)/admin/layout.tsx`

```tsx
"use client";
import { useAdminGuard } from "@/lib/auth/useAdminGuard";

const NAV = [
  ["Ringkasan", "/admin"],
  ["Pengguna", "/admin/users"],
  ["Aset", "/admin/repos"],
  ["Kompetisi", "/admin/competitions"],
  ["Event", "/admin/events"],
  ["Course", "/admin/courses"],
  ["Learning Path", "/admin/learning-paths"],
  ["Forum", "/admin/forum"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = useAdminGuard();
  if (!me.data || me.data.role !== "admin") return <ThemeSkeleton />; // sembunyikan sampai terverifikasi
  return (
    <ThemeAdminShell sidebar={<ThemeNav items={NAV} />}>
      {children}
    </ThemeAdminShell>
  );
}
```

## 5. Ringkasan — `app/(admin)/admin/page.tsx`

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/lib/api/admin";

export default function AdminHome() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: getStats });
  if (isLoading) return <ThemeSkeleton />;
  return (
    <div className="stats-grid">
      <ThemeStat label="Pengguna" value={data?.users} />
      <ThemeStat label="Aset" value={data?.repos} />
      <ThemeStat label="Kompetisi" value={data?.competitions} />
      <ThemeStat label="Event" value={data?.events} />
      <ThemeStat label="Course" value={data?.courses} />
      <ThemeStat label="Utas forum" value={data?.threads} />
    </div>
  );
}
```

## 6. Manajemen Pengguna — `app/(admin)/admin/users/page.tsx` (template tabel + aksi)

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, updateUser, deleteUser } from "@/lib/api/admin";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users", q], queryFn: () => listUsers({ q }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const setRole = useMutation({ mutationFn: ({ id, role }: any) => updateUser(id, { role }), onSuccess: invalidate });
  const toggleActive = useMutation({ mutationFn: ({ id, is_active }: any) => updateUser(id, { is_active }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => deleteUser(id), onSuccess: invalidate });

  return (
    <div>
      <ThemeSearchInput value={q} onChange={setQ} placeholder="Cari nama atau email" />
      <ThemeTable
        columns={["Nama", "Username", "Email", "Role", "Aktif", "Aksi"]}
        rows={users.data?.items ?? []}
        loading={users.isLoading}
        empty="Tidak ada pengguna."
        renderRow={(u: any) => ({
          cells: [u.name, u.username, u.email,
            <ThemeRoleSelect value={u.role} onChange={(role) => setRole.mutate({ id: u.id, role })} />,
            <ThemeSwitch checked={u.is_active} onChange={(v) => toggleActive.mutate({ id: u.id, is_active: v })} />,
          ],
          actions: [
            <ThemeConfirmButton danger label="Hapus"
              confirm={`Hapus pengguna ${u.username}? Tindakan ini permanen.`}
              onConfirm={() => remove.mutate(u.id)} />,
          ],
        })}
      />
    </div>
  );
}
```

## 7. Manajemen Kompetisi — template CRUD konten

`app/(admin)/admin/competitions/page.tsx`: tabel kompetisi (judul, status, peserta, periode) dengan tombol **Buat baru**, **Edit**, **Hapus**.
- "Buat baru"/"Edit" membuka form (modal/halaman) berisi field `Competition` (title, slug, sponsor, status, metric, prize_pool, starts_at, ends_at, overview_md, rules_md, dataset_info_md, prizes, tags).
- Submit → `createCompetition` / `updateCompetition`; hapus → `deleteCompetition` (konfirmasi). `invalidateQueries` setelah sukses.

## 8. Resource lain — ikuti pola yang sama

| Halaman | Template diikuti | Catatan |
|---|---|---|
| `/admin/events` | Kompetisi (CRUD form) | field Event (type, mode, capacity, agenda, speakers) |
| `/admin/courses` | Kompetisi (CRUD form) | field Course (level, modules) |
| `/admin/learning-paths` | Kompetisi (CRUD form) | field `course_slugs` |
| `/admin/repos` | Pengguna (tabel + aksi) | tampilkan privat; aksi ubah visibility & hapus |
| `/admin/forum` | Pengguna (tabel + aksi) | aksi hapus utas (moderasi) |

## 9. Navigasi & Rute

- Tampilkan tautan "Admin" di menu utama **hanya** bila `me.role === "admin"`.
- Buat halaman `/403` sederhana ("Anda tidak punya akses").

## 10. Definition of Done

- [ ] `/admin/*` hanya bisa diakses admin; non-admin diarahkan ke `/403`, tamu ke `/login`.
- [ ] Ringkasan menampilkan statistik dari `/admin/stats`.
- [ ] Manajemen Pengguna: cari, ubah role, aktif/nonaktif, hapus (dengan konfirmasi).
- [ ] Manajemen Kompetisi: buat, edit, hapus lewat form.
- [ ] Event/Course/Learning Path/Aset/Forum diimplementasikan mengikuti pola.
- [ ] Semua mutasi memperbarui tabel via `invalidateQueries`; aksi merusak punya konfirmasi.
- [ ] Tautan "Admin" hanya tampil untuk admin; mode mock berfungsi via MSW.
