# PSD — Instruksi Cursor: Ruang Ide Inti & Framing (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Direktori ruang, halaman ruang, join, fase framing (komponen masalah), kontrol master. **Kerjakan setelah backend Langkah 39 & Tim (Langkah 37).**

## 1. Skema & API

```ts
export const RoomSchema = z.object({ slug: z.string(), title: z.string(), pitch_md: z.string().optional(),
  status: z.enum(["draft","open","framing","closed","generating","solving","submitted","finished","challenged"]),
  member_count: z.number(), max_members: z.number().nullable(), framing_deadline: z.string().nullable(),
  team_slug: z.string().optional(), my_role: z.string().nullable().optional(), components_count: z.number().optional(),
  members: z.array(z.object({ username: z.string(), name: z.string().nullable(), avatar_url: z.string().nullable(), role: z.string() })).optional() });
export const ComponentSchema = z.object({ id: z.string(), kind: z.enum(["context","constraint","goal","data_need","metric"]),
  content_md: z.string(), author: z.object({ username: z.string(), avatar_url: z.string().nullable() }) });

// lib/api/rooms.ts
export const createRoom = (b: any) => apiFetch(`/idea-rooms`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const listRooms = (q: any = {}) => apiFetch(`/idea-rooms?${new URLSearchParams(q)}`, PaginatedRoom);
export const getRoom = (slug: string) => apiFetch(`/idea-rooms/${slug}`, RoomSchema);
export const publishRoom = (slug: string) => apiFetch(`/idea-rooms/${slug}/publish`, z.any(), { method: "POST" });
export const startFraming = (slug: string, framing_hours: number) => apiFetch(`/idea-rooms/${slug}/start-framing`, z.any(), { method: "POST", body: JSON.stringify({ framing_hours }) });
export const closeRoom = (slug: string) => apiFetch(`/idea-rooms/${slug}/close`, z.any(), { method: "POST" });
export const joinRoom = (slug: string) => apiFetch(`/idea-rooms/${slug}/join`, z.any(), { method: "POST" });
export const getComponents = (slug: string) => apiFetch(`/idea-rooms/${slug}/components`, z.object({ items: z.array(ComponentSchema) }));
export const addComponent = (slug: string, kind: string, content_md: string) => apiFetch(`/idea-rooms/${slug}/components`, z.any(), { method: "POST", body: JSON.stringify({ kind, content_md }) });
export const deleteComponent = (slug: string, id: string) => apiFetch(`/idea-rooms/${slug}/components/${id}`, z.any(), { method: "DELETE" });
```

## 2. Direktori & buat ruang — `/idea-rooms`

- Grid ruang publik (judul, status badge, anggota/max, kategori). Filter status & kategori.
- Tombol **Ajukan ide** → form (judul, pitch markdown, kategori via `CategoryPicker`, batas anggota opsional, visibilitas) → `createRoom` → arahkan ke halaman ruang (status draft).

## 3. Halaman ruang — `/idea-rooms/[slug]`

- Header: judul, **badge status** (Draft/Terbuka/Framing/Tertutup…), pitch, anggota & batas, tenggang framing (countdown bila framing).
- **Anggota:** daftar dari `members` (peran). Kelola lanjutan (keluarkan/undang/peran) tautkan ke halaman tim `/teams/{team_slug}` (reuse Langkah 37).
- **Tombol join** untuk non-anggota saat status open/framing (`joinRoom`); hormati penuh/privat (tampilkan pesan dari error).

## 4. Kontrol master (owner/admin tim)

Tampilkan panel master bila `my_role` ∈ {owner, admin}, aksi sesuai status:
- `draft` → **Terbitkan** (`publishRoom`).
- `open` → **Mulai framing** (input jam tenggang → `startFraming`) atau **Tutup** (`closeRoom`).
- `framing` → **Tutup** (kunci anggota → `closeRoom`).
Sembunyikan aksi yang tak valid untuk status saat ini.

## 5. Fase framing — komponen masalah

Bila status `framing`:
- **Countdown** ke `framing_deadline`.
- Anggota menambah **komponen** via form: pilih **jenis** (Konteks/Batasan/Tujuan/Kebutuhan Data/Metrik) + editor markdown → `addComponent`. Nonaktif bila tenggang lewat.
- Daftar komponen (`getComponents`) dikelompokkan per jenis; penulis/master bisa hapus (`deleteComponent`).
- Ajakan kosong: "Belum ada komponen. Tambahkan potongan masalah pertama."

## 6. Handler MSW

Tambah handler semua endpoint ruang; sediakan ruang contoh di tiap status (open, framing dengan komponen) dan skenario penuh/privat.

## 7. Definition of Done

- [ ] Buat ruang (auto-tim) → halaman ruang; status & transisi master tampil benar.
- [ ] Join bekerja (open/framing) dengan penanganan penuh/privat.
- [ ] Framing: tambah/lihat/hapus komponen; countdown tenggang; nonaktif setelah tenggang.
- [ ] Kelola anggota lanjutan via halaman tim.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
