# PSD — Instruksi Cursor: Panel Asisten Baru (Kuota Jam Gaya Claude + Histori Chat)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Mengubah panel asisten: **hapus rekomendasi**,
> tambah **histori chat**, kuota **jendela jam** dengan tombol kirim disable + banner saat habis, dan
> CTA upgrade. **Revisi UI Langkah 57.** Prasyarat: backend Langkah 57 (revisi).

## 1. Skema & API

```ts
export const AssistantPanelSchema = z.object({
  quota: z.object({
    can_send: z.boolean(), used: z.number(), remaining: z.number(), limit: z.number(),
    window_hours: z.number(), reset_at: z.string().nullable(),
  }),
  memory: z.object({ max_context_messages: z.number(), max_history_conversations: z.number() }),
  send_disabled: z.boolean(),
  warning: z.string().nullable(),
});
export const ConversationSchema = z.object({ id: z.string(), title: z.string(), updated_at: z.string() });
export const MessageSchema = z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() });

// lib/api/assistant.ts
export const getAssistantPanel = () => apiFetch(`/assistant/panel`, AssistantPanelSchema);
export const listConversations = () => apiFetch(`/assistant/conversations`, z.array(ConversationSchema));
export const newConversation = () => apiFetch(`/assistant/conversations`, ConversationSchema, { method: "POST" });
export const getConversation = (id: string) =>
  apiFetch(`/assistant/conversations/${id}`, z.object({ id: z.string(), messages: z.array(MessageSchema) }));
export const sendMessage = (id: string, content: string) =>
  apiFetch(`/assistant/conversations/${id}/messages`, z.object({ reply: z.string() }),
    { method: "POST", body: JSON.stringify({ content }) }); // 429 → tangani kuota habis
export const deleteConversation = (id: string) =>
  apiFetch(`/assistant/conversations/${id}`, z.any(), { method: "DELETE" });
```

## 2. Tata letak panel asisten

- **HAPUS bagian rekomendasi** dari panel asisten (jangan tampilkan sama sekali di sini).
- **Sidebar histori chat**: daftar percakapan (`listConversations`) — sudah dibatasi backend. Tombol
  **+ Chat baru** (`newConversation`). Klik percakapan → buka pesannya. Tombol hapus per item.
- **Area chat**: pesan + komposer.

## 3. Kuota gaya Claude (banner + disable)

Dari `getAssistantPanel()`:
- Tampilkan **sisa kuota** kecil (mis. "8/10 pesan • reset dalam 3 jam 12 menit") dari `quota.remaining`,
  `quota.limit`, dan hitung mundur dari `reset_at`.
- Bila `send_disabled` (kuota habis):
  - **Nonaktifkan** input & tombol kirim.
  - **Banner peringatan di atas chat** memakai `warning` (mis. "Kuota chat Anda habis. Kuota pulih dalam
    2 jam 5 menit. Tingkatkan tier untuk kuota lebih besar.") + tombol **Upgrade**.
- Setelah `reset_at` lewat, panel otomatis mengaktifkan kembali (poll ringan atau refresh saat fokus).

**Saat kirim:** panggil `sendMessage`. Jika respons **429** (`quota_exhausted`): set state habis, tampilkan
banner + disable (jangan kirim ke model). Refresh `getAssistantPanel` untuk `reset_at` terbaru.

## 4. Refresh & chat baru

- **Refresh halaman** → mulai tampilan chat baru (boleh otomatis buat percakapan baru atau biarkan kosong
  sampai pesan pertama). Histori lama tetap di sidebar (sampai batas).
- **Mulai chat baru saat kuota habis** → tetap boleh membuka tampilan chat baru, tetapi **kirim disable**
  + banner (kuota berlaku lintas percakapan, bukan per percakapan).

## 5. Memori terbatas

- Backend memangkas konteks ke model (`max_context_messages`); klien tak perlu mengirim seluruh riwayat.
- Boleh tampilkan catatan halus: "Asisten mengingat ~N pesan terakhir" dari `memory.max_context_messages`.

## 6. Handler MSW

Tambah handler: `getAssistantPanel` (skenario kuota tersisa & habis dengan `reset_at`), `listConversations`,
`newConversation`, `getConversation`, `sendMessage` (sukses & **429 quota_exhausted**), `deleteConversation`.

## 7. Definition of Done

- [ ] Panel asisten **tanpa rekomendasi**; ada **histori chat** (+ chat baru, hapus).
- [ ] Sisa kuota & hitung mundur reset tampil; gaya jendela jam (bukan harian).
- [ ] Kuota habis → input & tombol kirim **disable** + **banner peringatan** + tombol Upgrade.
- [ ] 429 dari `sendMessage` ditangani sebagai kuota habis (tanpa memanggil model).
- [ ] Refresh memulai chat baru; histori lama tetap (sampai batas).
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
