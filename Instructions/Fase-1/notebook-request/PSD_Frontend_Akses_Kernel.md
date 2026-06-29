# PSD — Instruksi Cursor: Akses Kernel Server (Form Request + Manajemen Admin)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun form **permintaan akses kernel**
> oleh pengguna, halaman **status**, dan **manajemen admin** (setujui/tolak/cabut). Terintegrasi
> dengan editor notebook (runtime server). **Kerjakan setelah auth cookie & editor notebook.**
> Prasyarat: backend Langkah 26.

## 1. Skema & API

```ts
export const KernelGrantSchema = z.object({
  active: z.boolean(),
  expires_at: z.string().nullable(),
  max_concurrent_kernels: z.number(),
  cpu: z.number(),
  mem_gb: z.number(),
}).nullable();

export const KernelAccessMeSchema = z.object({
  status: z.enum(["none", "pending", "approved", "denied", "revoked", "expired", "canceled"]),
  grant: KernelGrantSchema,
  latest_request: z.object({
    id: z.string(), reason: z.string(), status: z.string(),
    created_at: z.string(), decision_note: z.string().nullable(),
  }).nullable(),
});

export const KernelRequestRowSchema = z.object({
  id: z.string(),
  user: OwnerRefSchema.extend({ tier: z.string().optional() }),
  reason: z.string(), status: z.string(), created_at: z.string(),
});

// lib/api/kernel-access.ts
export const getKernelAccessMe = () => apiFetch(`/kernel-access/me`, KernelAccessMeSchema);
export const requestKernelAccess = (reason: string) =>
  apiFetch(`/kernel-access/requests`, z.object({ id: z.string(), status: z.string() }),
    { method: "POST", body: JSON.stringify({ reason }) });
export const cancelKernelRequest = (id: string) =>
  apiFetch(`/kernel-access/requests/${id}`, z.any(), { method: "DELETE" });

// admin
export const adminListKernelRequests = (status = "pending", page = 1) =>
  apiFetch(`/admin/kernel-access/requests?status=${status}&page=${page}`, PaginatedKernelRequest);
export const adminApproveKernel = (id: string, body: {
  expires_at?: string | null; max_concurrent_kernels?: number; cpu?: number; mem_gb?: number; note?: string;
}) => apiFetch(`/admin/kernel-access/requests/${id}/approve`, z.any(), { method: "POST", body: JSON.stringify(body) });
export const adminDenyKernel = (id: string, note?: string) =>
  apiFetch(`/admin/kernel-access/requests/${id}/deny`, z.any(), { method: "POST", body: JSON.stringify({ note }) });
export const adminRevokeKernel = (id: string, note?: string) =>
  apiFetch(`/admin/kernel-access/requests/${id}/revoke`, z.any(), { method: "POST", body: JSON.stringify({ note }) });
export const adminListGrants = (page = 1) =>
  apiFetch(`/admin/kernel-access/grants?active=true&page=${page}`, PaginatedKernelRequest);
```

## 2. Halaman pengguna — `/notebook/akses-kernel`

Tampilkan **status akses kernel** dari `getKernelAccessMe()`:

- **`none`/`denied`/`revoked`/`expired`/`canceled`** → tampilkan penjelasan singkat ("Kernel server
  membutуhkan persetujuan admin; notebook browser tetap bisa dipakai kapan saja") + **form**:
  textarea **alasan** (wajib) → `requestKernelAccess(reason)`. Setelah kirim → status jadi `pending`.
- **`pending`** → tampil "Menunggu persetujuan admin" + tombol **Batalkan** (`cancelKernelRequest`).
- **`approved`** (grant aktif) → tampil ringkasan: maks kernel konkuren, CPU/RAM, **masa berlaku**
  (`expires_at` atau "tanpa batas waktu"). Tautan **Buka notebook**.

State loading/kosong/error. Bila `denied`/`revoked`, tampilkan `decision_note` bila ada.

## 3. Manajemen admin — `/admin/akses-kernel`

Guard rute admin. Dua bagian:

- **Permintaan** (tab status: Menunggu/Disetujui/Ditolak) → `adminListKernelRequests(status)`.
  Setiap baris: pengguna (avatar, nama, **tier**), alasan, waktu. Aksi pada baris **pending**:
  - **Setujui** → buka dialog: maks kernel konkuren, CPU, RAM (GB), **masa berlaku** (tanggal/“tanpa
    batas”), catatan opsional → `adminApproveKernel(id, {...})`.
  - **Tolak** → catatan opsional → `adminDenyKernel(id, note)`.
- **Grant aktif** → `adminListGrants()`: daftar pengguna berakses + sumber daya + masa berlaku, dengan
  tombol **Cabut** (`adminRevokeKernel`, konfirmasi: "Kernel berjalan akan dihentikan").

Optimistik pada keputusan; perbarui daftar setelah aksi. Empty state tiap tab.

## 4. Integrasi editor notebook (runtime server)

Di editor/peluncur notebook (lihat NOTEBOOK_EDITOR_BRIEF):

- Pilihan runtime **Server** dinonaktifkan bila tak ada grant aktif (cek `getKernelAccessMe`), dengan
  tautan **"Minta akses kernel"** → `/notebook/akses-kernel`.
- Bila peluncuran server ditolak backend (`403 kernel_access_required`), tampilkan ajakan yang sama.
- Tampilkan sisa kuota kernel konkuren bila relevan.

## 5. Handler MSW

Tambah handler: `kernel-access/me` (skenario none/pending/approved), `requestKernelAccess`,
`cancelKernelRequest`, daftar permintaan admin (beberapa pending dengan tier berbeda), approve/deny/
revoke (ubah status), daftar grant aktif.

## 6. Definition of Done

- [ ] Pengguna melihat status akses kernel; mengirim permintaan dengan alasan; membatalkan saat pending.
- [ ] Status `approved` menampilkan sumber daya & masa berlaku; tautan ke notebook.
- [ ] Admin melihat daftar permintaan (dengan tier), menyetujui (atur sumber daya & masa berlaku),
      menolak, dan mencabut grant aktif.
- [ ] Editor menonaktifkan runtime server tanpa grant + ajakan minta akses; menangani `403`.
- [ ] **Notebook browser tetap dapat dipakai tanpa akses kernel.**
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
