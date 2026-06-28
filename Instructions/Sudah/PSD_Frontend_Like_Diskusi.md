# PSD — Instruksi Cursor: Tombol Like & Tab Diskusi pada Halaman Aset

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menambah tombol suka dan tab diskusi di halaman detail aset (`/[kind]/[owner]/[name]`). **Kerjakan hanya langkah ini.** Prasyarat: backend Langkah 11 + kontrak diperbarui.

## 1. Skema Zod — `types/api.ts`

- Tambah `liked: z.boolean().default(false)` ke `RepoDetailSchema`.
- Tambah:

```ts
export const LikeResultSchema = z.object({ liked: z.boolean(), likes: z.number() });
// ThreadSummary/ThreadDetail sudah ada → pakai ulang untuk diskusi
```

## 2. Fungsi API — `lib/api/repos.ts` & `lib/api/community.ts`

```ts
// repos.ts
import { LikeResultSchema } from "@/types/api";
export const likeRepo = (repoId: string) =>
  apiFetch(`/repos/${repoId}/like`, LikeResultSchema, { method: "POST" });
export const unlikeRepo = (repoId: string) =>
  apiFetch(`/repos/${repoId}/like`, LikeResultSchema, { method: "DELETE" });

// community.ts
import { PaginatedThread, ThreadDetailSchema } from "@/types/api";
export const getRepoDiscussions = (repoId: string, q: { page?: number } = {}) =>
  apiFetch(`/repos/${repoId}/discussions?${new URLSearchParams(q as Record<string, string>)}`, PaginatedThread);
export const createRepoDiscussion = (repoId: string, body: { title: string; body_md: string; tags?: string[] }) =>
  apiFetch(`/repos/${repoId}/discussions`, ThreadDetailSchema, { method: "POST", body: JSON.stringify(body) });
```

## 3. Handler MSW — `lib/mocks/handlers.ts`

```ts
let likeState = { liked: false, likes: 42 };
http.post(`${API}/repos/:id/like`, () => { likeState = { liked: true, likes: 43 }; return HttpResponse.json(likeState); }),
http.delete(`${API}/repos/:id/like`, () => { likeState = { liked: false, likes: 42 }; return HttpResponse.json(likeState); }),
http.get(`${API}/repos/:id/discussions`, () => HttpResponse.json({ items: [], total: 0, page: 1, page_size: 20 })),
http.post(`${API}/repos/:id/discussions`, () => HttpResponse.json({ id: "thr_new", title: "Diskusi baru", /* ...ThreadDetail */ }, { status: 201 })),
```

## 4. Tombol Like (optimistik) — `components/repos/LikeButton.tsx`

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { likeRepo, unlikeRepo } from "@/lib/api/repos";

export function LikeButton({ repoId, initialLiked, initialLikes }:
  { repoId: string; initialLiked: boolean; initialLikes: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (typeof window !== "undefined" && !localStorage.getItem("psd_token")) {
      router.push(`/login?next=${location.pathname}`);
      return;
    }
    setBusy(true);
    // optimistik
    setLiked(!liked); setLikes(likes + (liked ? -1 : 1));
    try {
      const res = liked ? await unlikeRepo(repoId) : await likeRepo(repoId);
      setLiked(res.liked); setLikes(res.likes);
    } catch {
      setLiked(liked); setLikes(likes); // rollback
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeButton onClick={toggle} disabled={busy} aria-pressed={liked}>
      {liked ? "Disukai" : "Suka"} · {likes}
    </ThemeButton>
  );
}
```

Pasang di header halaman detail aset, ambil `liked`/`likes` dari `RepoDetail`.

## 5. Tab Diskusi pada halaman aset

Pada `/[kind]/[owner]/[name]`, tambahkan tab **Diskusi** (di samping README/File):

- Daftar utas via `getRepoDiscussions(repo.id)` (TanStack Query) — state loading/kosong/error.
- Kosong → ajakan: "Belum ada diskusi. Mulai yang pertama."
- Form "Mulai diskusi" (judul + isi) memanggil `createRepoDiscussion`; setelah sukses, `invalidateQueries` daftar diskusi. Hanya untuk pengguna login (jika belum, arahkan ke login).
- Klik utas → buka `/community/[id]` (halaman utas yang sudah ada).

Gunakan kembali komponen daftar utas & form yang sudah dibuat di halaman forum agar konsisten.

## 6. Definition of Done

- [ ] Tombol like di halaman aset: optimistik, anti-dobel, sinkron dengan server; jika belum login → arahkan ke login.
- [ ] `liked`/`likes` awal berasal dari `RepoDetail`.
- [ ] Tab Diskusi: list + buat utas (auth), dengan loading/kosong/error.
- [ ] Mode mock (`NEXT_PUBLIC_USE_MOCKS=true`) tetap berfungsi via handler MSW.
- [ ] Tanpa perubahan kode lain, flip ke backend nyata bekerja.
