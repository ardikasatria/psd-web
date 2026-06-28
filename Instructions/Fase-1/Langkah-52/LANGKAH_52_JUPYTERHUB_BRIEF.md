# Brief Agen Cursor — Langkah 52: JupyterHub 🔴

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 52 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Bersandar pada OAuth Langkah 48 & storage MinIO Langkah 15.
> Scaffold referensi **lulus 7 uji** di `psd-jupyterhub/`.
>
> ⚠️ **Item 🔴 (berat secara ops).** Pecah jadi sub-langkah nyata; jangan sekali jadi.
> 🚫 **CPU-ONLY, TANPA GPU** (strategi: jangan kejar paritas compute Kaggle).

---

## 1. Tujuan

Notebook mandiri di dalam PSD (ganti tautan Colab Langkah 22): login sekali via PSD,
spawn server Jupyter per pengguna dengan batas sesuai tier gamifikasi, akses dataset via SDK `psd://`.

**Prasyarat:** Langkah 48 (OIDC; klien `jupyterhub` sudah di-seed) + Langkah 15 (MinIO).

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Auth = OIDC PSD** via `GenericOAuthenticator` (authorize/token/userinfo dari Langkah 48),
   `username_claim="preferred_username"`, `enable_auth_state=True` (teruskan token ke notebook).
2. **Spawner = DockerSpawner** (DockerSpawner→KubeSpawner bila K8s; hook & SDK tetap sama).
3. **CPU-only, tanpa GPU.** `gpu=0` di semua tier. Permanen.
4. **Batas per tier gamifikasi** (cpu/mem/start_timeout/umur-maks) + **idle-culling** = rem biaya utama.
5. **Akses dataset via SDK `psd://`** (presigned MinIO dari API PSD pakai PSD_TOKEN), **bukan** menanam
   kredensial MinIO di image.
6. **Logika diuji terpisah dari config**: tier/hook/SDK di paket Python; `jupyterhub_config.py` tipis.
7. **Colab dipertahankan sebagai fallback** selama transisi.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] Langkah 48: klien `jupyterhub` ter-seed? `redirect_uri` = `<hub>/hub/oauth_callback`? Secret tersedia?
- [ ] Dari mana **tier gamifikasi** pengguna dibaca — klaim di `userinfo` (mis. `psd_tier`) atau API PSD?
      (Menentukan apakah perlu menambah klaim di provider Langkah 48 atau memanggil API di hook.)
- [ ] Endpoint API PSD untuk **resolve dataset** → presigned MinIO (atau perlu dibuat). Bentuk respons?
- [ ] Kredensial & bucket MinIO (Langkah 15) + cara membuat presigned URL.
- [ ] Infra: Docker host (DockerSpawner) atau Kubernetes (KubeSpawner/Helm)?
- [ ] Di mana UI saat ini menautkan ke Colab (Langkah 22) untuk diganti tombol "Buka Notebook".
- [ ] Ruang Ide (untuk sub-langkah 5: buka notebook tim).

**Pertanyaan untuk manusia:**
1. Angka batas tiap tier (cpu/mem/timeout/umur-maks) sesuai kapasitas infra?
2. Idle timeout global (default 1 jam) cocok? Perlu umur-maks server (hard cap) ditegakkan?
3. Tier ditaruh sebagai klaim OIDC (ubah Langkah 48) atau diambil via API di hook?

---

## 4. Sub-langkah (kerangka — akan pecah)

### 52.1 — Deploy Hub + Spawner
- Image hub (jupyterhub + dockerspawner + oauthenticator + jupyterhub-idle-culler + `app.hubtools`).
- `jupyterhub_config.py` (cermin scaffold): DockerSpawner, jaringan, volume persisten per user.
- Service di compose (cermin `docker-compose.hub.yml`) atau Helm (Z2JH) bila K8s.

### 52.2 — Auth OAuth PSD
- `GenericOAuthenticator` ke endpoint Langkah 48; `enable_auth_state=True`.
- Verifikasi login PSD→Hub berhasil; username dari `preferred_username`.

### 52.3 — Batas tier + idle-culling (rem biaya)
- Cermin `app/hubtools/tiers.py` (resolver) & `spawn.py` (`auth_state_hook`, `apply_tier_limits`).
- Set `cpu_limit`/`mem_limit`/`start_timeout` per tier; **tanpa GPU**.
- `jupyterhub-idle-culler` sebagai service + role; pertimbangkan penegakan umur-maks server.

### 52.4 — Image DS + PSD SDK (`psd://`)
- Cermin `docker/Dockerfile.singleuser`: pustaka DS umum + pasang `app/psd_sdk` (`import psd`).
- Spawner injeksikan `PSD_API_BASE` + `PSD_TOKEN` (dari auth_state) + `PSD_TIER` ke env notebook.
- API PSD sediakan endpoint resolve `psd://` → presigned MinIO.

### 52.5 — Integrasi UI
- Tombol "Buka Notebook" dari halaman repo/Ruang Ide → spawn/named-server pengguna.
- (Opsional) named servers per tim; mount/akses dataset tim via SDK.

---

## 5. Seam integrasi

| Seam | Lokasi | Tugas agen |
|---|---|---|
| Tier pengguna | klaim `psd_tier` (userinfo) atau API | Sediakan sumber tier; sesuaikan `auth_state_hook`. |
| Token PSD | `auth_state.access_token` | Sudah diteruskan ke `PSD_TOKEN` env notebook. |
| Resolve dataset | API PSD `/api/datasets/{owner}/{dataset}/resolve?path=` | Kembalikan `{presigned_url, content_type}` dari MinIO. |
| Angka tier | `app/hubtools/tiers.py:TIERS` | Setel cpu/mem/timeout/umur sesuai infra. |

---

## 6. Definition of Done

- [ ] Login PSD→Hub via OIDC; server per-user spawn.
- [ ] Batas cpu/mem/timeout diterapkan per tier; **tak ada permintaan GPU**.
- [ ] Idle-culling aktif; (opsional) umur-maks server ditegakkan.
- [ ] Image notebook punya `import psd`; `psd.load("psd://...")` mengakses dataset MinIO via presigned URL.
- [ ] `PSD_TOKEN`/`PSD_API_BASE`/`PSD_TIER` terinjeksi ke notebook.
- [ ] UI "Buka Notebook" menggantikan tautan Colab; Colab tetap sebagai fallback.
- [ ] Uji (cermin `psd-jupyterhub/app/tests/test_hub.py`) hijau.

---

## 7. Non-goals

- **GPU / akselerator** — tidak pernah (strategi).
- Multi-tenant lanjut, autoscaling node, image per-mata-kuliah kompleks — menyusul bila perlu.
- Kolaborasi real-time (RTC) di notebook.

---

## 8. Gotcha (dari verifikasi scaffold)

- **Tier→limit di hook, bukan di config statis**: batas berbeda per pengguna, jadi diset di
  `pre_spawn_hook` (`apply_tier_limits`), bukan nilai tetap `c.Spawner.mem_limit`.
- **auth_state perlu `enable_auth_state=True`** + kunci enkripsi (`JUPYTERHUB_CRYPT_KEY`) agar token bisa
  diteruskan ke notebook.
- **SDK pakai presigned URL berumur pendek**, bukan kredensial MinIO permanen di image (lebih aman).
- **`mem_limit` format string** (mis. `"8G"`); `cpu_limit` float core.
- **DockerSpawner butuh socket Docker** host; di K8s pakai KubeSpawner (hook & SDK tak berubah).
- **CPU-only**: jangan set request GPU di spawner mana pun; uji memastikan `gpu==0`.

---

## 9. Referensi terverifikasi

`psd-jupyterhub/` **lulus 7 uji** (resolusi tier + fallback, CPU-only gpu==0, hook set batas+env,
default pemula, parse `psd://`, bentuk request resolver, unduh isi berkas) pada Python murni
(tanpa Hub/Docker hidup). Isi angka tier & endpoint resolve dataset dengan nilai infra PSD asli.
