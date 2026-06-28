# PSD — Instruksi Cursor: Pelacakan Kebiasaan (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Pelacak aktivitas sisi klien (batch), toggle privasi, dan ringkasan minat. **Kerjakan setelah backend Langkah 35 & Pengaturan (Langkah 23).**

## 1. Pelacak — `lib/analytics/track.ts`

Antrean + flush berkala (ringan, non-blocking):

```ts
type Ev = { action: string; entity_type?: string; entity_id?: string; category_id?: string; meta?: any };
let queue: Ev[] = [];
let enabled = true;                 // diisi dari setelan privacy.activity_tracking
const sessionId = (() => {          // anonim
  let s = sessionStorage.getItem("psd_sid");
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem("psd_sid", s); }
  return s;
})();

export function setTrackingEnabled(v: boolean) { enabled = v; }
export function track(ev: Ev) { if (enabled) queue.push(ev); }

async function flush() {
  if (!enabled || queue.length === 0) return;
  const events = queue.splice(0, 50);
  try {
    await fetch(`${BASE}/api/v1/track`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, events }),
      keepalive: true,
    });
  } catch { /* abaikan; jangan ganggu UX */ }
}
setInterval(flush, 10000);
if (typeof window !== "undefined") window.addEventListener("beforeunload", flush);
```

> Jangan sertakan data pribadi di `meta`. Hormati `prefers-reduced-data` bila ingin.

## 2. Inisialisasi & setelan privasi

- Saat app dimuat (login), baca `getSettings().privacy.activity_tracking` → `setTrackingEnabled(...)`.
- Di **`/settings` (Privasi)** tambah toggle **"Pelacakan aktivitas untuk rekomendasi"** → simpan via `updateSettings({ privacy: { activity_tracking } })` + `setTrackingEnabled`.

## 3. Titik pelacakan (sinyal kaya)

- **Tampilan halaman** (route change): `track({ action: "view", entity_type: "page", meta: { path } })`.
- **Lihat detail aset** (repo/notebook/course/competition/event): `track({ action: "view", entity_type, entity_id, category_id, meta: { tags } })`.
- **Pencarian**: `track({ action: "search", entity_type: "search", meta: { query } })`.
- **Klik rekomendasi/discover/kategori**: `track({ action: "click", entity_type, entity_id, category_id })`.

Fokus pada view/search/click (aksi seperti like/enrol sudah tercatat di backend).

## 4. Ringkasan minat (transparansi) — `/me/interests` atau bagian di profil/pengaturan

Dari `getActivitySummary()` (`GET /me/activity-summary`): tampilkan kategori & tag yang paling diminati ("Berdasarkan aktivitasmu") + hitungan aksi. Beri tautan ke setelan privasi. Ini membangun kepercayaan dan jadi cikal-bakal rekomendasi.

```ts
export const getActivitySummary = () => apiFetch(`/me/activity-summary`, ActivitySummarySchema);
```

## 5. Handler MSW

Tambah handler `/track` (kembalikan `{ ok: true, stored }`) & `/me/activity-summary` (kategori/tag/aksi contoh).

## 6. Definition of Done

- [ ] Pelacak membatch & mengirim event tanpa mengganggu UX; flush berkala & saat keluar.
- [ ] Toggle privasi mematikan pelacakan seketika & tersimpan; saat off, tidak ada event terkirim.
- [ ] View/search/click terlacak dengan kategori/entitas yang relevan.
- [ ] Halaman ringkasan minat menampilkan afinitas dari aktivitas.
- [ ] Tidak ada PII dikirim; mode mock berfungsi.
