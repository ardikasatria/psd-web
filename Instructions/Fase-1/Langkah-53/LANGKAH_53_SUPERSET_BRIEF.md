# Brief Agen Cursor — Langkah 53: Superset Embed 🔴

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 53 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Bersandar pada OAuth Langkah 48 & skema gold Langkah 46.
> Scaffold referensi **lulus 5 uji** di `psd-superset/`.
>
> ⚠️ **Item 🔴 — embedding + provisioning + RLS itu PROYEK.** Pecah jadi sub-langkah; jangan sekali jadi.

---

## 1. Tujuan & batasan

Self-serve BI penuh (Superset) sebagai **peningkatan** Ruang Analitik (Langkah 46).
Dashboard native Langkah 46 **tetap jalan** untuk kebutuhan ringan; Superset untuk yang berat.

**Prasyarat:** Langkah 48 (OAuth; klien `superset` sudah di-seed) + Langkah 46 (skema gold stabil).

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Dua jalur identitas yang berbeda — JANGAN dicampur:**
   - **Analis/admin** memakai Superset UI → login via **OIDC PSD** (klien `superset`, Langkah 48).
   - **Penonton embed** TIDAK login ke Superset → backend PSD (akun layanan) mencetak **guest token**.
2. **Guest token + RLS per tim** = isolasi data. Klausa RLS (`team_id = N`) masuk ke token; **team_id
   wajib integer** (anti-injeksi).
3. **Provisioning otomatis saat "promote"**: buat dataset Superset terhadap tabel skema gold via REST.
4. **Embedding via Embedded SDK** (frontend) + `fetchGuestToken` → endpoint PSD.
5. **Dashboard di-embed pakai UUID embedded** (dari `enable_embedded`), bukan id numerik.
6. Akun layanan Superset (admin) menyimpan kredensial di pengelola rahasia.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] Langkah 48: klien `superset` ter-seed? `redirect_uri` = `<superset>/oauth-authorized/psd`? Secret ada?
- [ ] Skema gold Langkah 46: nama database/koneksi, schema, dan tabel yang akan dipromosikan.
- [ ] Model **tim** PSD: dari mana `team_id` (integer) pengguna? Kolom `team_id` ada di tabel gold?
- [ ] Kontrol akses dashboard PSD: bagaimana menentukan pengguna boleh melihat dashboard tertentu?
- [ ] Di mana "promote dashboard" dipicu di UI/alur Ruang Analitik.
- [ ] Sesi pengguna (Langkah 14/48) untuk endpoint guest-token (`get_current_user`).
- [ ] Infra: cara deploy Superset (metadata DB + cache Redis) di compose/K8s.

**Pertanyaan untuk manusia:**
1. RLS: klausa global `team_id = N` atau **di-scope per dataset**? Apakah semua tabel gold punya `team_id`?
2. Login Superset UI untuk analis: hanya OIDC PSD, atau juga admin lokal?
3. Domain yang diizinkan meng-embed (CORS/`allowed_domains`).

---

## 4. Sub-langkah (kerangka — akan pecah)

### 53.1 — Deploy Superset
- Superset + **metadata DB** (Postgres) + **cache** (Redis) di compose/K8s.
- Aktifkan fitur **EMBEDDED_SUPERSET** & **guest token** di `superset_config.py`
  (`FEATURE_FLAGS={"EMBEDDED_SUPERSET":True}`, `GUEST_ROLE_NAME`, `GUEST_TOKEN_JWT_SECRET`).
- Buat akun layanan (admin) → kredensial `PSD_SUPERSET_SERVICE_*`.
- Daftarkan koneksi database **skema gold** sekali; catat `GOLD_DATABASE_ID`.

### 53.2 — Provisioning dataset saat "promote" (sub-langkah 2)
- Cermin `client.create_dataset` + `provisioning.promote_dashboard`: buat dataset terhadap
  tabel gold saat pengguna promote tampilan Ruang Analitik.
- Simpan `dataset_id` di sisi PSD.

### 53.3 — Embedding + guest token + RLS (sub-langkah 3)
- `enable_embedded(dashboard_id, allowed_domains)` → simpan UUID di PSD (seam).
- Endpoint `POST /api/bi/guest-token` (cermin `embed_endpoint.py`): cek akses → ambil UUID + team_id
  → `rls.team_rls(team_id)` → `mint_guest_token`. **Tolak 403** bila tak berhak.
- Frontend: komponen `EmbeddedDashboard.tsx` (Embedded SDK) dgn `fetchGuestToken` → endpoint di atas.

---

## 5. Seam integrasi

| Seam | Fungsi | Tugas agen |
|---|---|---|
| Identitas | `superset_identity(user) -> {username, first_name, last_name}` | Untuk payload guest token. |
| Tim | `user_team_id(user) -> int` | Sumber klausa RLS (WAJIB integer). |
| Akses | `user_can_view_dashboard(user, key) -> bool` | Kontrol akses sisi-PSD (gating 403). |
| UUID | `embeddable_dashboard_uuid(key) -> str` | UUID embedded dari `enable_embedded`. |
| Klien | `get_superset_client()` | SupersetClient akun layanan. |
| Sesi | `get_current_user()` | Pengguna PSD (Langkah 14/48). |

---

## 6. Definition of Done

- [ ] Superset jalan (metadata DB + cache); fitur embedded + guest token aktif.
- [ ] Analis login Superset UI via OIDC PSD; penonton embed TIDAK login Superset.
- [ ] "Promote" membuat dataset Superset terhadap tabel gold.
- [ ] Dashboard ter-embed di PSD via Embedded SDK + guest token.
- [ ] **RLS per tim berfungsi**: pengguna hanya melihat data timnya; team_id non-integer ditolak.
- [ ] Endpoint guest-token menolak akses tak sah (403).
- [ ] Dashboard native Langkah 46 tetap berjalan.
- [ ] Uji (cermin `psd-superset/app/superset/tests/test_superset.py`) hijau.

---

## 7. Non-goals

- Sinkronisasi dua arah dashboard PSD↔Superset (Superset jadi sumber untuk yang dipromosikan).
- Alerting/report scheduling Superset (menyusul bila perlu).
- Editor chart kustom di dalam PSD (gunakan UI Superset untuk analis).

---

## 8. Gotcha (dari verifikasi scaffold)

- **Guest token vs OIDC login**: jangan campur. Penonton embed pakai guest token (dicetak akun
  layanan); analis pakai OIDC. Mencampur = kebocoran akses atau login ganda.
- **RLS anti-injeksi**: `team_id` divalidasi integer; klausa dibentuk dari int, bukan string mentah.
- **UUID embedded ≠ id dashboard**: embed pakai UUID dari `enable_embedded`, bukan id numerik.
- **CSRF**: request mutasi (create_dataset, enable_embedded) butuh `X-CSRFToken`; guest_token via Bearer.
- **GUEST_TOKEN_JWT_SECRET** harus konsisten & rahasia; `allowed_domains` membatasi yang boleh embed.
- **Akses dicek di PSD sebelum mint token** — guest token sendiri tak menanyai izin PSD.

---

## 9. Referensi terverifikasi

`psd-superset/` **lulus 5 uji** (login+create_dataset payload, enable_embedded UUID, guest_token
payload+RLS, RLS tolak non-integer, endpoint 403/akses+RLS) via httpx.MockTransport & FastAPI
TestClient. Isi seam dengan model tim/akses/identitas PSD asli; deploy Superset adalah ops (53.1).
