# PSD — Instruksi Cursor: Pengaduan Platform & Laporkan Konten (Feed + Forum)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menambah: **(1) layanan pengaduan platform**
> (form + daftar tiket), **(2) tombol Laporkan** pada postingan feed, komentar, & forum + panel
> admin (moderasi & tiket). **Kerjakan setelah feed & forum.** Prasyarat: backend Langkah 33.

## 1. Skema & API

```ts
// Pengaduan platform
export const TicketSchema = z.object({
  id: z.string(), category: z.string(), priority: z.string(), subject: z.string(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]), created_at: z.string(),
});
export const createTicket = (b: { category: string; priority: string; subject: string; body: string }) =>
  apiFetch(`/support/tickets`, TicketSchema, { method: "POST", body: JSON.stringify(b) });
export const myTickets = () => apiFetch(`/support/tickets/me`, z.array(TicketSchema));
export const getTicket = (id: string) => apiFetch(`/support/tickets/${id}`, TicketDetailSchema);
export const replyTicket = (id: string, body: string) =>
  apiFetch(`/support/tickets/${id}/messages`, z.any(), { method: "POST", body: JSON.stringify({ body }) });

// Laporkan konten
export const REPORT_REASONS = ["spam", "pelecehan", "kebencian", "seksual", "kekerasan", "misinformasi", "menyesatkan", "ilegal", "lainnya"] as const;
export const reportContent = (b: { kind: "post" | "feed" | "comment" | "thread" | "reply"; target_id: string; reason: string; detail?: string }) =>
  apiFetch(`/reports`, z.object({ status: z.string() }), { method: "POST", body: JSON.stringify(b) });

// Admin
export const adminListReports = (q: { flagged?: boolean; status?: string; page?: number }) => apiFetch(`/admin/reports?...`, PaginatedReport);
export const adminResolveReport = (id: string, decision: string) =>
  apiFetch(`/admin/reports/${id}/resolve`, z.any(), { method: "POST", body: JSON.stringify({ decision }) });
export const adminListTickets = (q: { status?: string; priority?: string; page?: number }) => apiFetch(`/admin/support/tickets?...`, PaginatedTicket);
export const adminTicketAction = (id: string, action: "assign" | "resolve" | "close" | "reopen") =>
  apiFetch(`/admin/support/tickets/${id}/${action}`, z.any(), { method: "POST" });
```

## 2. Pengaduan platform (pengguna)

- Halaman **Bantuan / Pengaduan** (`/support`): tombol **Buat pengaduan** → form (kategori:
  bug/error/akun/data/fitur/lainnya, prioritas, subjek, deskripsi). Boleh tombol cepat "Laporkan error"
  dari banner error global (prefilled kategori `error`).
- **Tiket saya**: daftar + status (badge open/in_progress/resolved/closed). Klik → detail + balasan
  (`replyTicket`). Tampilkan balasan staff.

## 3. Tombol "Laporkan" pada konten

- Tambah menu **⋯ → Laporkan** pada: kartu **post feed**, **komentar**, **thread forum**, dan **reply forum**.
- Modal laporkan: pilih **alasan** (`REPORT_REASONS`) + detail opsional → `reportContent({ kind, target_id, reason, detail })`.
- Setelah lapor: tampilkan konfirmasi singkat ("Laporan terkirim, terima kasih"). **Lapor ulang konten
  sama** → tetap sukses tanpa duplikat (idempoten); boleh tampilkan "Anda sudah melaporkan ini".
- Jangan tampilkan identitas pelapor lain. Jangan tampilkan jumlah laporan ke pengguna biasa.

## 4. Panel admin

**Moderasi laporan** (`/admin/reports`):
- Tab **Flagged** (auto-flag) & **Semua**; urut dari backend (flagged → jumlah pelapor → terlama).
- Tiap item: cuplikan konten, jenis (feed/forum), jumlah pelapor, alasan teratas. Aksi: **Mulai review**,
  lalu **Selesaikan** dengan keputusan: **Abaikan (dismiss)**, **Hapus konten (remove)**, **Kunci thread
  (lock)**, **Peringatkan (warn)**, **Blokir penulis (ban)** → `adminResolveReport(id, decision)`.

**Tiket pengaduan** (`/admin/support`):
- Antrian terurut (prioritas → umur). Filter status/prioritas. Aksi: **Ambil (assign)**, **Selesaikan
  (resolve)**, **Tutup (close)**, **Buka kembali (reopen)** + balasan ke pengguna.

## 5. Handler MSW

Tambah handler: createTicket/myTickets/getTicket/replyTicket; reportContent (sukses & "sudah melaporkan");
adminListReports (flagged & semua), adminResolveReport (ubah status+decision); adminListTickets,
adminTicketAction (transisi status). Sertakan kasus 422 (alasan/kategori tak valid) & 409 (transisi salah).

## 6. Definition of Done

- [ ] Pengguna membuat pengaduan platform & melihat status; bisa membalas.
- [ ] Tombol **Laporkan** ada di post feed, komentar, thread & reply forum; modal alasan berfungsi.
- [ ] Lapor ganda konten sama tidak membuat duplikat (idempoten) di UI.
- [ ] Panel admin: moderasi laporan (mulai review → keputusan) & tiket (assign/resolve/close/reopen).
- [ ] Identitas/jumlah pelapor tidak bocor ke pengguna biasa.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
