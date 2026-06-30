# Langkah 31 — Backend Detail Aset (GitHub + Hugging Face): README, Files, Versi, Branch, Kontributor

> **Tujuan:** Endpoint untuk halaman detail aset (projects/models/datasets) yang didukung **Gitea**
> (Langkah 50) + **Teams**: render README (front-matter HF), pohon berkas & isi berkas, daftar/buat
> **branch**, **versi/tag**, dan **kontributor** (commit + anggota Tim). **Kerjakan setelah Langkah 50
> (Gitea) & modul Teams.** Prasyarat: 15 (aset), 50 (Gitea), Teams, 29 (engagement).
>
> Logika inti **lulus 8 uji** di `psd-asset-detail/app/asset_detail/`.

## 1. Prinsip

- Aset (project/model/dataset) **didukung repo Gitea**. Backend ini sebagian besar **mem-proxy Gitea API**
  + memetakan ke kontrak PSD, lalu menambah agregasi (kontributor+Tim) & parsing (front-matter).
- Satu set endpoint, tiga jenis aset (`kind ∈ projects|models|datasets`).

## 2. Service (cermin scaffold teruji)

- `language.detect_language/is_markdown/is_binary` — untuk viewer kode & penanganan berkas.
- `modelcard.parse_front_matter/card_summary` — pisah front-matter YAML README (HF-like).
- `contributors.aggregate_contributors(commit_authors, team_members)` — gabung commit Gitea + anggota Tim.
- `versioning.is_valid_branch_name/default_branch/sort_versions` — validasi & urутан.
- `filetree.build_tree(paths)` — pohon berkas dari daftar path.

## 3. Endpoint — `app/modules/asset_detail/router.py`

`{kind} ∈ projects|models|datasets`; `{owner}/{slug}` = repo Gitea.

| Method | Path | Sumber/aksi |
|---|---|---|
| GET | `/{kind}/{owner}/{slug}` | Metadata aset + default branch (`default_branch`) + ringkasan kartu + stats (Langkah 29). |
| GET | `/{kind}/{owner}/{slug}/readme?ref=` | Ambil README dari Gitea → `parse_front_matter` → `{meta, body_md}`. |
| GET | `/{kind}/{owner}/{slug}/tree?ref=` | Daftar path dari Gitea → `build_tree`. |
| GET | `/{kind}/{owner}/{slug}/file?path=&ref=` | Isi berkas + `language` (`detect_language`); biner → tanda `is_binary` + URL unduh. |
| GET | `/{kind}/{owner}/{slug}/branches` | Daftar branch (Gitea). |
| POST | `/{kind}/{owner}/{slug}/branches` | `{name, from}` → validasi `is_valid_branch_name` (422 bila tidak) → buat di Gitea. |
| GET | `/{kind}/{owner}/{slug}/versions` | Tag/rilis Gitea → `sort_versions`. |
| GET | `/{kind}/{owner}/{slug}/contributors` | Author commit (Gitea) + anggota Tim (`/teams`) → `aggregate_contributors`. |

Pakai klien Gitea (httpx) seperti Langkah 50/51. `ref` default = `default_branch`. `ApiError` + paginasi bila perlu.

## 4. Gitea API yang dipakai (ringkas)

- README/file: `GET /repos/{owner}/{repo}/contents/{path}?ref=` (base64 → decode).
- Tree: `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=true` (atau contents per folder).
- Branches: `GET/POST /repos/{owner}/{repo}/branches`.
- Tags/rilis: `GET /repos/{owner}/{repo}/tags` atau `/releases`.
- Commit authors: `GET /repos/{owner}/{repo}/commits` (kumpulkan author → hitung).

## 5. Kontributor + Tim

- Hitung commit per author dari Gitea. Petakan email/username Gitea → pengguna PSD.
- Tambah anggota **Tim** pemilik repo (modul Teams) sebagai kontributor (meski 0 commit) dengan label tim.
- `aggregate_contributors` melakukan dedupe + urut commit menurun.

## 6. Definition of Done

- [ ] Tiga jenis aset memakai endpoint sama; `ref` (branch/tag) dihormati di semua endpoint konten.
- [ ] README dipisah front-matter (HF) → `{meta, body_md}`; berkas membawa `language`/`is_binary`.
- [ ] Branch dapat didaftar & dibuat (validasi nama 422); versi terurut menurun.
- [ ] Kontributor menggabungkan commit Gitea + anggota Tim; dedupe & urut commit.
- [ ] Logika (cermin `psd-asset-detail/app/asset_detail/tests/`) hijau.

## Gotcha

- **Selalu lewat `ref`**: konten (readme/tree/file) harus konsisten dengan branch/versi yang dipilih.
- **Validasi nama branch di server** (jangan andalkan klien) — `is_valid_branch_name`.
- **Pemetaan identitas**: author commit Gitea ↔ pengguna PSD via email/username; tangani yang tak terpetakan.
- **Berkas biner** jangan dikirim sebagai teks; tandai `is_binary` + URL unduh (presigned/raw Gitea).
- **Front-matter rusak** jangan menggagalkan README; kembalikan `meta={}` + body apa adanya.
- **Sanitasi**: render markdown di frontend dengan sanitizer; backend kirim mentah `body_md`.
