# Brief Agen Cursor — Langkah 51: Pull Request & Kontribusi

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 51 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Bangun di atas klien Gitea Langkah 50 & sistem notifikasi Langkah 29.
> Scaffold referensi **lulus 6 uji** di `psd-gitea-pr/app/contrib/`.
>
> ⛔ **Prasyarat MUTLAK: Langkah 50 (git nyata) selesai.** Tanpa repo Gitea sungguhan, PR tak mungkin.

---

## 1. Tujuan

Alur kontribusi ala GitHub/Hugging Face: **fork → branch → PR → review → merge**, dengan notifikasi.
Inilah pembeda PSD: dari *platform aset* menjadi *platform kolaborasi*.

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Semua via Gitea API** (perluasan klien Langkah 50). PSD orkestrasi + UI; Gitea mesin git.
2. **Kontribusi lintas-fork**: kontributor fork repo ke namespace-nya, kerja di branch fork,
   buka PR `head="kontributor:branch"` → `base` di repo asal.
3. **Review**: `APPROVE` / `REQUEST_CHANGES` / `COMMENT`. **Merge diblok** bila ada REQUEST_CHANGES
   belum teratasi atau `mergeable=false`.
4. **Notifikasi (Langkah 29)** pada peristiwa: `pr_opened` (→ pemilik), `pr_reviewed`/`pr_commented`/
   `pr_merged` (→ penulis).
5. **Idempoten**: fork yang sudah ada tidak menggagalkan alur (tangani 409/422 → ambil fork eksisting).

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] Klien Gitea Langkah 50: di mana, dan apakah bisa diperluas (fork/branch/pull/review/merge)?
- [ ] Mapping **user PSD ↔ namespace Gitea** (dari Langkah 50; dipakai untuk lokasi fork).
- [ ] Sistem notifikasi Langkah 29: tanda tangan fungsi kirim notifikasi & jenis yang didukung.
- [ ] Model izin PSD: siapa boleh **merge** (pemilik/maintainer repo)? Di mana dicek?
- [ ] UI repo saat ini (dari 50.5) untuk menambah tab/daftar PR & halaman detail PR.
- [ ] Apakah perlu **branch protection** (mis. wajib ≥1 approve sebelum merge)?

**Pertanyaan untuk manусia:**
1. Metode merge default: `merge` / `squash` / `rebase`? `delete_branch_after_merge`?
2. Aturan merge: wajib minimal berapa approve? Boleh self-merge?
3. Kontribusi internal (anggota repo) boleh **branch langsung tanpa fork**, atau selalu fork?

---

## 4. Sub-langkah

### 51.1 — Fork/branch + UI buat PR
- Perluas klien (cermin `client.py`): `fork`, `create_branch`, `change_files` (commit ke branch),
  `create_pull` (head lintas-fork), `get_pull`, `list_pulls`.
- Orkestrasi `open_contribution` (cermin `contrib.py`): fork (idempoten) → branch kerja →
  (opsional commit perubahan dari editor PSD) → buka PR → **notifikasi pemilik**.
- UI: tombol "Ajukan Kontribusi"/"Buat PR", daftar PR (`pr_view.list_pulls`).

### 51.2 — Review (komentar, approve) & merge
- Klien: `create_review` (event APPROVE/REQUEST_CHANGES/COMMENT), `list_reviews`,
  `create_comment`, `merge_pull` (field **`Do`** = metode).
- `submit_review` → notifikasi penulis. `merge_contribution` → cek `mergeable`/review → merge →
  notifikasi penulis. Cek izin merge sesuai model PSD sebelum memanggil.
- UI detail PR (`pr_view.pull_detail`): ringkasan review + `can_merge`.

### 51.3 — Notifikasi (Langkah 29)
- Sambungkan seam `notify(user_id, kind, payload)` ke sistem Langkah 29 untuk keempat jenis peristiwa.

---

## 5. Seam integrasi

| Seam | Fungsi | Tugas agen |
|---|---|---|
| Notifikasi | `notify(user_id, kind, payload)` | Sambungkan ke Langkah 29 (pr_opened/reviewed/merged/commented). |
| Pemilik | `repo_owner_user(base_owner, base_repo)` | user_id PSD pemilik repo (penerima pr_opened). |
| Penulis | `pull_author_user(pr)` | Petakan `pr['user']['login']` → user_id PSD. |
| Namespace | `contributor_namespace(user_id)` | Username Gitea kontributor (lokasi fork). |

---

## 6. Definition of Done

- [ ] Kontributor bisa fork + branch + buka PR (lintas-fork) dari UI PSD.
- [ ] Reviewer bisa komentar, approve, request changes; status tampil di UI.
- [ ] Merge berfungsi & **diblok** saat `mergeable=false` atau ada REQUEST_CHANGES; izin merge dicek.
- [ ] Notifikasi terkirim untuk pr_opened/reviewed/merged/commented.
- [ ] Fork idempoten (PR kedua dari kontributor sama tidak error).
- [ ] Uji (cermin `psd-gitea-pr/app/contrib/tests/test_contrib.py`) hijau.

---

## 7. Non-goals

- CI/checks otomatis sebagai syarat merge (webhook) — menyusul bila perlu.
- Review komentar baris-per-baris lanjutan (sudah didukung API `comments[]`, tapi UI-nya opsional kini).
- Proteksi branch tingkat lanjut (boleh diatur di Gitea bila DoD mensyaratkan approve minimal).

---

## 8. Gotcha (dari verifikasi scaffold)

- **head lintas-fork** harus berformat `"namespace:branch"` di `create_pull`.
- **Merge** memakai field **`Do`** (huruf besar) untuk metode (`merge`/`squash`/`rebase`),
  bukan `method`. `delete_branch_after_merge` opsional.
- **Gating merge**: `get_pull` dulu — bila `merged` true → idempoten sukses; bila `mergeable` false →
  tolak sebelum memanggil merge.
- **Fork idempoten**: fork ulang → 409/422 → ambil fork eksisting via `get_repo(namespace, repo)`.
- **Commit sebelum PR**: `change_files` ke branch fork; operasi `update` butuh berkas ada (atau `create`).
- **Izin merge**: cek di sisi PSD (pemilik/maintainer) SEBELUM `merge_pull`; jangan andalkan Gitea saja.

---

## 9. Referensi terverifikasi

`psd-gitea-pr/app/contrib/` **lulus 6 uji** (head lintas-fork, field `Do` saat merge, urutan
fork→branch→commit→PR + notifikasi, review menotifikasi penulis, gating mergeable, `can_merge`
saat REQUEST_CHANGES) via httpx.MockTransport. Isi seam dengan notifikasi Langkah 29 & mapping
identitas Gitea↔PSD.
