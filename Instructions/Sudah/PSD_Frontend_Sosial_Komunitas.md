# PSD — Instruksi Cursor: Sosial Komunitas (Feed, Postingan, Follow)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun feed sosial, komposer postingan (teks/foto/aset), follow, dan bagian sosial di profil. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 24.

## 1. Skema & API

```ts
export const PostSchema = z.object({
  id: z.string(), author: OwnerRefSchema, body_md: z.string(),
  images: z.array(z.string()), asset: z.object({ kind: z.string(), slug: z.string() }).nullable(),
  like_count: z.number(), comment_count: z.number(), liked: z.boolean(), created_at: z.string(),
});
export const CommentSchema = z.object({ id: z.string(), author: OwnerRefSchema, body_md: z.string(), created_at: z.string() });

// lib/api/social.ts
export const followUser = (u: string) => apiFetch(`/users/${u}/follow`, z.any(), { method: "POST" });
export const unfollowUser = (u: string) => apiFetch(`/users/${u}/follow`, z.any(), { method: "DELETE" });
export const getFollowers = (u: string, page = 1) => apiFetch(`/users/${u}/followers?page=${page}`, PaginatedOwner);
export const getFollowing = (u: string, page = 1) => apiFetch(`/users/${u}/following?page=${page}`, PaginatedOwner);
export const getFeed = (scope: "following" | "all" = "following", page = 1) => apiFetch(`/feed?scope=${scope}&page=${page}`, PaginatedPost);
export const getUserPosts = (u: string, page = 1) => apiFetch(`/users/${u}/posts?page=${page}`, PaginatedPost);
export const createPost = (b: { body_md: string; images: string[]; asset?: { kind: string; slug: string } }) =>
  apiFetch(`/posts`, PostSchema, { method: "POST", body: JSON.stringify(b) });
export const deletePost = (id: string) => apiFetch(`/posts/${id}`, z.any(), { method: "DELETE" });
export const likePost = (id: string) => apiFetch(`/posts/${id}/like`, z.object({ liked: z.boolean(), like_count: z.number() }), { method: "POST" });
export const unlikePost = (id: string) => apiFetch(`/posts/${id}/like`, z.object({ liked: z.boolean(), like_count: z.number() }), { method: "DELETE" });
export const getComments = (id: string, page = 1) => apiFetch(`/posts/${id}/comments?page=${page}`, PaginatedComment);
export const addComment = (id: string, body_md: string) => apiFetch(`/posts/${id}/comments`, CommentSchema, { method: "POST", body: JSON.stringify({ body_md }) });

export const uploadPostImage = (file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${BASE}/api/v1/posts/images`, { method: "POST", body: fd, credentials: "include" })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); }); // { url }
};
```

## 2. Halaman Feed — `/community` (atau `/feed`)

- Tab **Mengikuti** / **Semua** → `getFeed(scope)`.
- **Komposer** di atas: textarea (markdown ringan), tombol tambah **foto** (unggah via `uploadPostImage`, tampilkan thumbnail, bisa beberapa), dan **lampirkan aset** (pencari aset PSD → pilih → simpan `{kind, slug}`). Kirim → `createPost` → prepend ke feed.
- **Kartu postingan** (`PostCard`): avatar + nama (badge resmi), waktu relatif, isi (render markdown), galeri gambar, **kartu aset** bila ada (judul/jenis, tautan ke aset), baris aksi: Suka (optimistik, `like_count`), Komentar (buka daftar/komposer komentar), dan menu Hapus (penulis/admin).
- Komentar: muat via `getComments`, tambah via `addComment`, perbarui `comment_count`.

State loading/kosong/error; feed kosong (belum mengikuti siapa pun) → ajakan jelajahi orang/aset.

## 3. Profil: sosial

Pada `/u/[username]`:
- **Tombol Ikuti/Mengikuti** (toggle, `follow`/`unfollow`) — sembunyikan untuk diri sendiri; bila belum login → arahkan login.
- Tampilkan **jumlah pengikut & mengikuti** (klik → daftar via `getFollowers`/`getFollowing`).
- **Tab Postingan**: `getUserPosts(username)` memakai `PostCard` yang sama.

## 4. Berbagi aset → otomatis ke feed

Di halaman detail aset, tombol **"Bagikan ke feed"** membuka komposer dengan aset sudah terlampir (`{kind, slug}`). Mendorong interaksi dari registry ke sosial.

## 5. Saran "Orang/Organisasi untuk diikuti" (opsional, ringan)

Widget kecil di feed/dashboard berisi akun resmi & kontributor teratas (pakai `/leaderboard/contributors`) dengan tombol Ikuti. Membantu cold-start jejaring.

## 6. Handler MSW

Tambah handler untuk semua endpoint: feed (beberapa post dengan/ tanpa gambar & aset), follow/unfollow, followers/following, like/comment, unggah gambar (kembalikan URL dummy).

## 7. Definition of Done

- [ ] Feed "Mengikuti"/"Semua" tampil; komposer mengirim teks + foto + lampiran aset.
- [ ] Suka & komentar bekerja (optimistik untuk suka); hitungan akurat.
- [ ] Follow/unfollow di profil; jumlah pengikut/mengikuti & daftarnya tampil.
- [ ] Tab Postingan di profil; "Bagikan ke feed" dari halaman aset berfungsi.
- [ ] Empty state mengundang saat belum mengikuti siapa pun.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
