# PSD — Instruksi Cursor: Notifikasi / Inbox (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Lonceng notifikasi, inbox, dan penanda belum dibaca. **Kerjakan setelah backend Langkah 29 & Item 1 (auth).**

## 1. Skema & API

```ts
export const NotificationSchema = z.object({
  id: z.string(), type: z.string(), title: z.string(), body: z.string(),
  link: z.string().nullable(),
  actor: z.object({ username: z.string(), avatar_url: z.string().nullable(), type: z.string() }).nullable(),
  read: z.boolean(), created_at: z.string(),
});

// lib/api/notifications.ts
export const getNotifications = (unread = false, page = 1) =>
  apiFetch(`/me/notifications?unread=${unread}&page=${page}`, PaginatedNotification);
export const getUnreadCount = () => apiFetch(`/me/notifications/unread-count`, z.object({ count: z.number() }));
export const markRead = (id: string) => apiFetch(`/me/notifications/${id}/read`, z.any(), { method: "POST" });
export const markAllRead = () => apiFetch(`/me/notifications/read-all`, z.any(), { method: "POST" });
```

## 2. Lonceng di header

- Ikon lonceng dengan **badge jumlah belum dibaca** dari `getUnreadCount()`.
- **Polling** ringan: `useQuery` dengan `refetchInterval: 45000` dan `refetchOnWindowFocus: true` (hanya bila login). (Websocket = peningkatan Fase 1.)
- Klik lonceng → **dropdown** berisi notifikasi terbaru (`getNotifications()`), tombol "Tandai semua dibaca" (`markAllRead` → invalidate count & list).

## 3. Item notifikasi

- Tampilkan ikon menurut `type`, avatar `actor` bila ada, `title` + `body` ringkas, waktu relatif.
- Belum dibaca → penanda visual (titik/latar).
- Klik item → `markRead(id)` lalu navigasi ke `link` (bila ada). Invalidate count.

## 4. Halaman penuh — `/notifications`

Daftar lengkap (paginated) dengan filter Semua / Belum dibaca. `QueryView` + `EmptyState` ("Belum ada notifikasi").

## 5. Aksesibilitas

Lonceng: `aria-label` dengan jumlah ("Notifikasi, 3 belum dibaca"); dropdown dapat ditutup Esc & navigasi keyboard; wadah daftar `aria-live="polite"` untuk item baru.

## 6. Handler MSW

Tambah handler list/unread-count/read/read-all; sediakan beberapa notifikasi contoh (follow, suka, course) termasuk yang belum dibaca.

## 7. Definition of Done

- [ ] Lonceng menampilkan jumlah belum dibaca; polling memperbaruinya.
- [ ] Dropdown & halaman `/notifications` menampilkan daftar; klik menandai dibaca & menavigasi.
- [ ] "Tandai semua dibaca" berfungsi; badge ter-update.
- [ ] Aksesibilitas lonceng/dropdown terpenuhi.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
