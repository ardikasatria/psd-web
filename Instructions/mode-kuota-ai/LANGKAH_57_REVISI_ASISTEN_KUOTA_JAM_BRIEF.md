# Langkah 57 (Revisi) — Kuota Asisten Berbasis Jendela Jam (Gaya Claude) + Histori Chat Berbatas

> **Tujuan:** Ganti kuota chat asisten dari "per hari" menjadi **jendela jam yang reset** (gaya Claude:
> mis. X pesan / 5 jam). **Hapus rekomendasi dari panel asisten.** Tambah **histori chat** dengan
> **memori (konteks) & histori terbatas**. Saat kuota habis → tombol kirim **disable** + **banner
> peringatan** dengan waktu reset; sediakan jalur **upgrade**. **Revisi Langkah 57.** Prasyarat: 25, 57.
>
> Logika inti **lulus 10 uji** di `psd-assistant-chat/app/assistant/`.

---

## 1. Perubahan utama vs Langkah 57

1. **Kuota = jendela jam** (bukan hitungan harian). Per tier: `(pesan_per_jendela, jendela_jam)`,
   reset otomatis saat jendela berakhir; kembalikan `reset_at` agar UI tampilkan "pulih dalam Xj".
2. **Hapus rekomendasi/feed dari panel asisten** (boleh tetap ada di Penemuan Komunitas Langkah 28,
   tapi BUKAN di panel asisten).
3. **Histori chat**: simpan percakapan, tetapi **batasi memori konteks** (N pesan terakhir dikirim ke
   model) & **batasi jumlah percakapan** tersimpan per tier.
4. **Refresh** → boleh mulai chat baru. **Kuota habis** → kirim ditolak (429) + peringatan + reset_at.

## 2. Model

```python
class AssistantWindow(Base):                 # state kuota jendela per pengguna
    __tablename__ = "assistant_windows"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    count: Mapped[int] = mapped_column(Integer, default=0)

class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ac_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String, default="Chat baru")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AssistantMessage(Base):
    __tablename__ = "assistant_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("assistant_conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String)        # system|user|assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

> Redis cocok untuk `AssistantWindow` (TTL alami) bila ingin tanpa migrasi DB; DB juga oke.

```bash
docker compose exec backend alembic revision --autogenerate -m "assistant_chat"
docker compose exec backend alembic upgrade head
```

## 3. Service (cermin scaffold teruji)

- `window_quota.view/consume` + `limits_for(tier)` → kuota jendela jam (reset otomatis, `reset_at`).
- `history.trim_context(messages, max_messages)` → konteks dikirim ke model (system prompt + N terakhir).
- `history.prune_history(conversations, max_conversations)` → simpan M percakapan terbaru.
- `panel.panel_state(window_state, now, tier)` → ringkasan panel **tanpa rekomendasi**.

**Batas per tier (sesuaikan):** kuota pemula 10/5j, menengah 50/5j, lanjut 200/5j; memori
pemula (10 pesan, 5 chat), menengah (20, 20), lanjut (40, 100).

## 4. Endpoint — `app/modules/assistant/router.py`

| Method | Path | Aksi |
|---|---|---|
| GET | `/assistant/panel` | `panel_state`: kuota (used/remaining/limit/window_hours/reset_at), batas memori, `send_disabled`, `warning`. **Tanpa rekomendasi.** |
| GET | `/assistant/conversations` | Histori (sudah dipangkas `max_history`). |
| POST | `/assistant/conversations` | Mulai chat baru. |
| GET | `/assistant/conversations/{id}` | Pesan satu percakapan. |
| POST | `/assistant/conversations/{id}/messages` | Kirim pesan. **`consume` kuota dulu**; bila habis → `429 quota_exhausted` + `reset_at`. Kirim ke model hanya `trim_context(...)`. |
| DELETE | `/assistant/conversations/{id}` | Hapus percakapan. |

- Saat kuota habis: jangan panggil model; balas 429 dengan `{slug:"quota_exhausted", reset_at, limit, window_hours}`.
- Setelah membuat percakapan baru → jalankan `prune_history` (pangkas yang melebihi batas tier).

## 5. Upgrade

- "Upgrade" = naik tier (gamifikasi Langkah 25) atau paket berbayar bila ada. Panel/`warning`
  mengarahkan ke halaman upgrade. Batas baru langsung berlaku pada jendela berikutnya.

## 6. Definition of Done

- [ ] Kuota reset per jendela jam (gaya Claude); `reset_at` benar; tidak lagi per-hari.
- [ ] Kuota habis → `POST messages` ditolak 429 + `reset_at`; model tidak dipanggil.
- [ ] Panel asisten **tanpa rekomendasi**; berisi kuota + batas memori + peringatan.
- [ ] Konteks ke model dipangkas (`trim_context`); histori percakapan dibatasi (`prune_history`).
- [ ] Refresh memulai chat baru; histori lama tetap (sampai batas).
- [ ] Logika (cermin `psd-assistant-chat/app/assistant/tests/`) hijau.

## Gotcha

- **Konsumsi kuota hanya saat pesan user terkirim** (bukan saat buka panel/`view`).
- **`reset_at` = window_start + window_hours**; jendela mulai pada pesan pertama, stabil sampai kedaluwarsa.
- **trim_context untuk model**, tapi simpan pesan penuh di DB (histori) — pemangkasan hanya untuk konteks model.
- **prune_history** jangan menghapus percakapan yang sedang dibuka; pangkas yang terlama.
- **Jangan tampilkan rekomendasi di panel asisten** (keputusan desain).
