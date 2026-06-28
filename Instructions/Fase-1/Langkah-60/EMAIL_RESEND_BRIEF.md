# Brief Agen Cursor — Backend Email (Resend) sebagai Channel Notifikasi

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan backend email sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Email = **channel dari notifikasi Langkah 29**, dikirim via
> **Resend** (SMTP atau HTTP API), async lewat **Celery (Langkah 49)**.
> Scaffold referensi **lulus 8 uji** di `psd-email/`.

---

## 1. Tujuan & prinsip

Kirim email ke pengguna untuk berbagai aktivitas di **Fase 0 & Fase 1** (course publish, kuis dinilai,
kompetisi, marketplace, PR, drift, dll.).

**Prinsip kunci:** email adalah **channel tambahan** dari sistem notifikasi yang sudah ada (Langkah 29),
**bukan** sistem paralel. Satu peristiwa → notifikasi in-app **dan** email (bila pengguna opt-in).

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Resend** sebagai pengirim. Dua opsi di balik satu antarmuka:
   - **SMTP** (`smtp.resend.com`, user `resend`, password = API key) — sesuai setup Anda.
   - **HTTP API** (`api.resend.com/emails`, Bearer key) — alternatif.
2. **Async via Celery (Langkah 49)** — pengiriman TIDAK di jalur request (antrian sendiri, mis. `email`).
3. **Preferensi per pengguna**: `immediate` / `digest` (ringkasan harian) / `off`, + **unsubscribe global**.
4. **Idempoten**: dedup per `notification_id` (Redis) agar tak kirim ganda.
5. **Unsubscribe bertanda tangan** (HMAC) di setiap email (kepatuhan).
6. **Template Bahasa Indonesia** per peristiwa; fallback generik.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telусуri & laporkan; ambigu → berhenti & tanya.

- [ ] **Sistem notifikasi Langkah 29**: titik di mana notifikasi dibuat (untuk menyisipkan dispatch email).
- [ ] Model pengguna: field **email** & status verifikasi; di mana menyimpan **preferensi email**.
- [ ] Celery Langkah 49: cara menambah antrian/worker `email`.
- [ ] Redis (dedup) tersedia.
- [ ] Kredensial **Resend** (API key) + domain pengirim terverifikasi (SPF/DKIM di Resend).
- [ ] Peristiwa mana saja yang sudah memanggil notifikasi (untuk dipetakan ke email — lihat katalog).

**Pertanyaan untuk manусia:**
1. SMTP atau HTTP API Resend? (Scaffold mendukung keduanya.)
2. Alamat pengirim & domain (mis. `no-reply@psd.example`) — sudah diverifikasi di Resend?
3. Mode default per peristiwa (immediate/digest/off) & jadwal digest harian?
4. Peristiwa mana yang **wajib** email vs cukup in-app?

---

## 4. Sub-langkah

### E.1 — Provider & template
- Cermin `provider.py` (SMTP + Resend HTTP) & `templates.py` (BI per peristiwa).
- Konfigurasi kredensial Resend via env (jangan di repo).

### E.2 — Preferensi & unsubscribe
- Cermin `preferences.py` (immediate/digest/off + global) & `unsubscribe.py` (token HMAC).
- Tambah halaman/endpoint `GET /email/unsubscribe?token=` → set `email_enabled=False` (atau per-scope).
- UI pengaturan preferensi email pengguna.

### E.3 — Dispatch + Celery + dedup
- Cermin `dispatch.py` (gating → dedup → render → footer → kirim) + `build_digest`.
- **Sisipkan hook di notifikasi Langkah 29**: saat notifikasi dibuat → enqueue task email
  (`send_event_email`) bila `should_send_now`; bila `should_digest` → simpan untuk ringkasan harian.
- Task Celery di antrian `email`; **job digest harian** via Celery beat memanggil `build_digest`.

### E.4 — Pemetaan peristiwa (Fase 0 & 1)
- Cermin `events.py`: hubungkan tiap peristiwa nyata ke `type` email + mode default.

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| Hook notifikasi (Langkah 29) | Saat notifikasi dibuat → dispatch/enqueue email. |
| `user_email(user_id)` | Alamat email pengguna (atau None → lewati). |
| `user_email_prefs(user_id)` | Preferensi email. |
| `get_provider()` | SMTP/Resend terkonfigurasi (kredensial). |
| `get_dedup()` | Store dedup (Redis). |
| `pending_digest_items(user_id)` | Peristiwa digest tertunda (job harian). |

---

## 6. Katalog peristiwa (dari `events.py`)

**Fase 0:** welcome, course_published, course_enrolled, quiz_graded, competition_result,
dataset_published, marketplace_match, notification_generic.
**Fase 1:** pr_opened, pr_reviewed, pr_merged, pr_commented, drift_alert, model_promoted, quota_warning.

Default `pr_commented` & `notification_generic` = **digest** (kurangi spam); sisanya immediate.

---

## 7. Definition of Done

- [ ] Email terkirim via Resend untuk peristiwa yang dikonfigurasi; async via Celery (antrian `email`).
- [ ] Preferensi dihormati (immediate/digest/off + unsubscribe global).
- [ ] Tiap email punya footer unsubscribe bertanda tangan; endpoint unsubscribe bekerja.
- [ ] Dedup mencegah email ganda (idempoten per notification_id).
- [ ] Digest harian merangkum peristiwa 'digest'.
- [ ] Hook tertanam di notifikasi Langkah 29 (bukan sistem paralel).
- [ ] **Verify email & lupa password** berfungsi: token sekali-pakai berumur pendek, bypass preferensi,
      forgot-password tak membocorkan keberadaan akun, sesi lama diinvalidasi setelah reset.
- [ ] Uji (cermin `psd-email/app/email/tests/`) hijau.

---

## 8. Non-goals

- Email marketing/kampanye massal (ini transaksional/notifikasi).
- Editor template WYSIWYG (template kode cukup).
- Pelacakan buka/klik lanjutan (bisa pakai fitur Resend bila perlu nanti).

---

## 9. Gotcha (dari verifikasi scaffold)

- **Async wajib**: kirim email di worker Celery, bukan jalur request (latensi/SMTP bisa lambat).
- **Idempoten**: dedup per `notification_id` (Redis SET + TTL) — retry Celery jangan kirim ganda.
- **Domain terverifikasi**: SPF/DKIM di Resend; jika tidak, email masuk spam/ditolak.
- **Unsubscribe wajib & dihormati**: cek preferensi SEBELUM render/kirim; sediakan endpoint token.
- **Digest vs immediate**: peristiwa ramai (pr_commented) → digest agar tak membanjiri inbox.
- **Email tak ada/tak terverifikasi** → lewati diam-diam (seam kembalikan None).
- **Rahasia**: API key Resend di pengelola rahasia, bukan di repo.

---

## 10. Email autentikasi — verify email & lupa password (WAJIB, terpisah)

Ini **transaksional & wajib**, BERBEDA dari notifikasi:
- **TIDAK** tunduk preferensi/unsubscribe (pengguna tak bisa opt-out dari reset yang ia minta).
- **TIDAK** di-digest; **TIDAK** lewat hook notifikasi Langkah 29.
- Dipicu langsung oleh **alur auth (Langkah 14/48)**, bukan oleh peristiwa Langkah 29.
- **Token khusus** (bukan token unsubscribe): berumur pendek, **sekali pakai**, terikat tujuan,
  tahan pemalsuan. Cermin `auth_tokens.py` (`TokenService`) + `auth_email.py`.

**Alur verify email:**
1. Saat daftar/ubah email → `TokenService.issue(user_id, 'email_verify', ttl=24h)` → kirim
   `auth_email.send_verification(...)`.
2. Pengguna klik `/auth/verify-email?token=` → `verify(token,'email_verify')` → tandai email
   terverifikasi → `consume(user_id,'email_verify')`.

**Alur lupa password:**
1. `POST /auth/forgot-password` (email) → bila user ada: `issue(user_id,'password_reset', ttl=30m)`
   → `send_password_reset(...)`. **Selalu balas sukses generik** (jangan bocorkan apakah email terdaftar).
2. `/auth/reset-password?token=` → `verify(token,'password_reset')` → form sandi baru →
   set sandi → **`consume(user_id,'password_reset')`** (token mati) + invalidasi sesi lama.

**Sifat keamanan (teruji):** `issue` baru mematikan token lama (hanya-terbaru-valid); `consume`
mematikan setelah dipakai (sekali-pakai); exp ditegakkan; tujuan & tanda tangan diverifikasi.

**Gotcha auth-email:**
- **Bypass preferensi** — jangan lewatkan email auth ke gating notifikasi; selalu kirim.
- **Jangan bocorkan keberadaan akun** di forgot-password (balasan generik).
- **TTL pendek + sekali-pakai** + **invalidasi sesi** setelah reset.
- Tetap **async via Celery** (antrian `email`).

---

## 11. Referensi terverifikasi

`psd-email/` **lulus 16 uji**:
- **Notifikasi (8):** SMTP build MIME, Resend HTTP request, render template + fallback,
  gating preferensi, token unsubscribe roundtrip+tamper, dispatch + footer, opt-out + dedup, digest.
- **Auth (8):** issue/verify, tujuan salah ditolak, tanda tangan dipalsukan ditolak, kedaluwarsa,
  hanya-terbaru-valid, sekali-pakai (consume), verify-email URL tanpa unsubscribe, reset-password URL.

Sambungkan: hook notifikasi (Langkah 29) untuk email aktivitas; alur auth (Langkah 14/48) untuk
verify & reset; isi seam (email/preferensi/provider/dedup/nonce-store); set kredensial Resend.
