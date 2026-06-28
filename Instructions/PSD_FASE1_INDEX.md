# PSD — Indeks Fase 1 (Langkah 48–60)

Indeks untuk **13 brief** agen Cursor + scaffold referensi. Tiap brief adalah spesifikasi
yang **disesuaikan ke repo PSD asli** (mulai dari *Langkah 0 — Orientasi repo*); scaffold
di folder `Instructions/Langkah-XX/` adalah cermin desain yang **sudah lulus uji**.

> **Deploy VM:** setelah kode langkah selesai, ikuti [PSD_FASE1_DEPLOY.md](./PSD_FASE1_DEPLOY.md)
> dan runbook operasional [deploy/README.md](../deploy/README.md).

> **Cara pakai per brief:** buka repo PSD di Cursor → lampirkan brief di `Instructions/Langkah-XX/` →
> *"Kerjakan Langkah XX sesuai brief. Mulai dari Langkah 0 — Orientasi repo, laporkan temuan,
> tanyakan yang ambigu SEBELUM menulis kode."*

---

## 1. Daftar isi

| # | Brief | Kode produksi | Kompleksitas | Prasyarat | Uji |
|---|---|---|---|---|---|
| 48 | `Langkah-48/` | `app/oauth/` | 🟡 | 14 (auth cookie) | 4 |
| 49 | `Langkah-49/` | `app/tasks/` (Celery) | 🟡 | Redis; job 38/40/45 | 6 |
| 50 | `Langkah-50/` | `app/gitea/` | 🔴 | **48**, 15 (storage) | 6 |
| 51 | `Langkah-51/` | `app/contrib/` | 🟡 | **50** (mutlak), 29 (notif) | 6 |
| 52 | `Langkah-52/` | `psd-jupyterhub/` + `app/hub/` | 🔴 | **48**, 15 (MinIO) | 7+ |
| 53 | `Langkah-53/` | `app/superset/` + `psd-superset/` | 🔴 | **48**, 46 (gold) | 5 |
| 54 | `Langkah-54/` | `app/engine/` | 🔴 (opsional) | 44–45 (spec), **49** | 10 |
| 55 | `Langkah-55/` | `app/mlops/` | 🟡 | 46 (dashboard), MLflow | 10 |
| 56 | `Langkah-56/` | `app/serving/` | 🔴 | **55** | 9 |
| 57 | `Langkah-57/` | `app/assistant/` | 🟡 | 35 (aktivitas), OpenAI | 12 |
| 58 | `Langkah-58/` | `app/perf/` | 🟢 | 46, 47 (reaktif) | 8 |
| 59 | `Langkah-59/` | `app/email/` (notifikasi) | 🟡 | **29**, **49**, Redis | 8 |
| 60 | `Langkah-60/` | `app/email/auth_*` + auth router | 🟢 | 14, **59** (provider) | 5 |

**Total uji backend Fase 1: 96 hijau** (48→58 = 82; +59 = 8; +60 = 5; beberapa langkah punya uji di paket terpisah).

Prasyarat **tebal** = ketergantungan *dalam* Fase 1.

---

## 2. Peta ketergantungan

```
                ┌─────────────────────────── FONDASI ───────────────────────────┐
                │  48 OAuth/OIDC ──┬─▶ 50 Gitea ───▶ 51 Pull Request             │
                │                  ├─▶ 52 JupyterHub                              │
                │                  └─▶ 53 Superset Embed                          │
                │  49 Celery ──┬─▶ job 38/40/45 / drift (55)                     │
                │              └─▶ 59 Email notifikasi (antrian `email`)          │
                │  59 Provider SMTP/Resend ──▶ 60 Email auth (verify/reset)       │
                └───────────────────────────────────────────────────────────────┘

  46 (skema gold) ──▶ 53 Superset,  55 Monitoring
  55 Registry+Monitoring ──▶ 56 Serving
  35 (activity-summary) ──▶ 57 AI Asisten
  29 (notifikasi) ──▶ 59 Email aktivitas (hook dispatch)
  (reaktif) 58 Cache & Performa
```

**Benang merah lintas-langkah:**
- **Identitas tunggal (48)** → Gitea (50), JupyterHub (52), Superset (53).
- **Tier gamifikasi (52)** → kuota serving (56) & asisten AI (57).
- **Tabel gold monitoring (55)** → latensi serving (56).
- **Notifikasi (29) + Celery (49)** → email aktivitas (59): immediate / digest / off.
- **Provider email (59)** → template auth elegan (60): verify, reset, ganti email.
- **Celery (49)** → Spark (54), drift (55), antrian `email` (59).

---

## 3. Urutan eksekusi (bertahap — didorong pilot)

**Tahap A — Fondasi (wajib lebih dulu)**
1. **48 OAuth/OIDC** — identitas tunggal.
2. **49 Celery** — job berat keluar dari proses API.
3. **59 + 60 Email** — Resend/SMTP; verify/reset auth + notifikasi aktivitas (wajib sebelum go-live pilot).

**Tahap B — Nilai pedagogis langsung**
4. **52 JupyterHub** — notebook mandiri (🔴 berat ops).

**Tahap C — MLOps (bila kelas butuh)**
5. **55 Registry+Monitoring**
6. **56 Serving** — *pertimbangkan dulu* kebutuhan edukasi (🔴).

**Tahap D — Kolaborasi & BI (setelah umpan balik)**
7. **50 Gitea → 51 Pull Request**
8. **53 Superset Embed**

**Tahap E — Kecerdasan platform**
9. **57 AI Asisten** — setelah cukup aktivitas pengguna.

**Tahap F — Reaktif / opsional**
10. **58 Cache** — saat terbukti lambat.
11. **54 Spark/Airflow** — hanya bila data benar-benar besar.

---

## 4. Peta ke deploy produksi

| Langkah | Service Compose baru / perubahan | DNS (Caddy) | Flag env utama |
|---|---|---|---|
| 48 | Backend (+ mount `psd_oidc.pem`) | `api.<DOMAIN>` (issuer) | `PSD_OIDC_*` |
| 49 | `worker-ai`, `worker-pabrik`, `flower` | — | `PSD_USE_CELERY=true` |
| 50 | `gitea`, `gitea-db` | `git.<DOMAIN>` | `PSD_GITEA_ENABLED`, `GITEA_ADMIN_TOKEN` |
| 51 | — (API saja) | — | Gitea aktif |
| 52 | `jupyterhub` (+ image single-user) | `hub.<DOMAIN>` | `PSD_HUB_ENABLED`, `HUB_OIDC_SECRET` |
| 53 | `superset`, `superset-db` | `bi.<DOMAIN>` | `PSD_SUPERSET_ENABLED`, `BI_OIDC_SECRET` |
| 54 | `worker-spark` (profile) | — | `PSD_SPARK_ENABLED` |
| 55 | `mlflow`, `mlflow-db` | `ml.<DOMAIN>` | `PSD_MLFLOW_ENABLED` |
| 56 | — (endpoint di backend) | — | `PSD_SERVING_ENABLED` |
| 57 | — (endpoint di backend) | — | `PSD_ASSISTANT_ENABLED`, `OPENAI_API_KEY` |
| 58 | — (Redis cache) | — | `PSD_PERF_*` |
| 59 | `worker-email`, `celery-beat` | — | `PSD_EMAIL_ENABLED`, `RESEND_API_KEY` |
| 60 | — (auth router + template) | — | sama 59 + `APP_BASE_URL` |

Runbook lengkap per tahap: **[PSD_FASE1_DEPLOY.md](./PSD_FASE1_DEPLOY.md)**.

---

## 5. Pola umum tiap brief

Setiap brief berisi: **Tujuan**, **Keputusan desain**, **Langkah 0 — Orientasi repo**, **Sub-langkah**,
**Seam integrasi**, **Definition of Done**, **Non-goals**, **Gotcha**, **Referensi terverifikasi**.

Scaffold di `Instructions/Langkah-XX/` memisahkan logika teruji dari seam integrasi — agen **mengisi seam**
ke kode PSD asli, bukan menyalin stub mentah.

---

## 6. Dokumen terkait

| Dokumen | Isi |
|---|---|
| [PSD_Roadmap_Fase_1.md](./PSD_Roadmap_Fase_1.md) | Perencanaan & prioritas pilot ITERA |
| [PSD_FASE1_DEPLOY.md](./PSD_FASE1_DEPLOY.md) | Upgrade VM Fase 0 → Fase 1, tahap deploy, env |
| [deploy/README.md](../deploy/README.md) | Runbook operasional: `deploy.sh`, verify, per-langkah |
| [PSD_Checklist_Kesiapan_Rilis.md](./PSD_Checklist_Kesiapan_Rilis.md) | Checklist rilis Fase 0 |
| [Sudah/PSD_Deploy_VM.md](./Sudah/PSD_Deploy_VM.md) | Setup VM awal |

---

## 7. Disclaimer jujur

Bagian 🔴 (50, 52, 53, 54, 56) masing-masing **sistem infrastruktur penuh**. Deploy dan umpan balik
pilot menentukan urutan akhir — jangan borong semua service sekaligus di satu VM kecil (≤8 GB RAM).
