# PSD — Instruksi Cursor: Halaman Detail Aset (Perpaduan GitHub + Hugging Face)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun **halaman detail aset** (saat aset
> diklik) untuk **projects / models / datasets** dengan tab README, Files/Kode, Versi, Branch, dan
> Kontributor — gaya GitHub + Hugging Face. **Kerjakan setelah halaman daftar aset & engagement.**
> Prasyarat: backend detail aset (brief backend) + Gitea (Langkah 50) + Teams.
>
> Rute contoh: `/projects/{owner}/{slug}`, `/models/{owner}/{slug}`, `/datasets/{owner}/{slug}`.
> Logika inti **lulus 8 uji** di `psd-asset-detail/`. Helper kode adaptif di `frontend/`.

## 1. Tata letak (satu komponen `AssetDetail`, dipakai 3 jenis aset)

Header aset: `owner/slug`, jenis (project/model/dataset), tombol **Suka/Bagikan/Unduh** (Langkah 29),
pemilih **branch**, pemilih **versi/tag**, dan (untuk model/dataset) **chip kartu HF** (license/tags/
language dari front-matter README — `modelcard.card_summary`).

**Tab:**
1. **README** — render markdown body (setelah front-matter dipisah). Default tab.
2. **Files** — pohon berkas (`filetree.build_tree`) + viewer kode adaptif tema (lihat §3).
3. **Versi** — daftar tag/rilis (`versioning.sort_versions`), tautan unduh/checkout.
4. **Branch** — daftar branch + **buat branch baru** (validasi `is_valid_branch_name`).
5. **Kontributor** — `contributors.aggregate_contributors` (commit Gitea + anggota Tim).

## 2. Skema & API

```ts
// lib/api/asset.ts  (kind: "projects" | "models" | "datasets")
export const getAsset = (kind: string, owner: string, slug: string, ref?: string) =>
  apiFetch(`/${kind}/${owner}/${slug}${ref ? `?ref=${ref}` : ""}`, AssetDetailSchema);
export const getAssetReadme = (kind, owner, slug, ref?) =>
  apiFetch(`/${kind}/${owner}/${slug}/readme${ref ? `?ref=${ref}` : ""}`, ReadmeSchema); // {meta, body_md}
export const getAssetTree = (kind, owner, slug, ref?) =>
  apiFetch(`/${kind}/${owner}/${slug}/tree${ref ? `?ref=${ref}` : ""}`, TreeSchema);
export const getAssetFile = (kind, owner, slug, path, ref?) =>
  apiFetch(`/${kind}/${owner}/${slug}/file?path=${encodeURIComponent(path)}${ref ? `&ref=${ref}` : ""}`, FileSchema);
export const getAssetBranches = (kind, owner, slug) => apiFetch(`/${kind}/${owner}/${slug}/branches`, z.array(BranchSchema));
export const createBranch = (kind, owner, slug, name, from) =>
  apiFetch(`/${kind}/${owner}/${slug}/branches`, BranchSchema, { method: "POST", body: JSON.stringify({ name, from }) });
export const getAssetVersions = (kind, owner, slug) => apiFetch(`/${kind}/${owner}/${slug}/versions`, z.array(VersionSchema));
export const getAssetContributors = (kind, owner, slug) => apiFetch(`/${kind}/${owner}/${slug}/contributors`, z.array(ContributorSchema));
```

## 3. Viewer kode ADAPTIF TEMA (perbaikan utama)

**Masalah saat ini:** blok kode selalu gelap meski mode terang. **Perbaikan:** pakai **Shiki dwi-tema**
(`github-light` + `github-dark`) yang menulis **CSS variable**; warna token berpindah lewat kelas `.dark`
di root — tanpa re-highlight. Cermin `frontend/CodeBlock.jsx`, `frontend/detectLanguage.js`,
`frontend/code-viewer.css`.

Inti (jangan paksa warna tetap):
```js
hl.codeToHtml(code, { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false });
```
```css
.code-viewer .shiki, .code-viewer .shiki span { color: var(--shiki-light); background: var(--shiki-light-bg); }
html.dark .code-viewer .shiki, html.dark .code-viewer .shiki span { color: var(--shiki-dark); background: var(--shiki-dark-bg); }
```
- Markdown (README) dirender via pustaka markdown PSD (sanitasi!). Notebook `.ipynb` boleh ditampilkan
  sebagai sel (atau JSON) — opsional.
- Berkas biner (`detectLanguageFromName === "binary"`) → tampilkan "Berkas biner — tidak dapat ditampilkan" + tombol unduh.

> Alternatif: highlight.js/Prism dengan **dua stylesheet** (light/dark) yang di-toggle kelas `.dark`.
> Inti tetap: tema kode mengikuti tema aplikasi, bukan dipaksa gelap.

## 4. Branch & versi

- **Pemilih branch/versi** di header mengubah `ref`; semua tab memuat ulang sesuai `ref`.
- **Buat branch**: form nama (validasi sisi klien meniru `is_valid_branch_name` — tolak spasi, `..`,
  `~ ^ : ? *`, awalan/akhiran `/`, akhiran `.lock`) + pilih sumber (branch/tag) → `createBranch`.
- **Versi**: daftar tag terurut menurun; tiap versi tautan checkout/unduh.

## 5. Kontributor (termasuk dari Tim)

- `getAssetContributors` mengembalikan gabungan author commit + anggota Tim (`/teams`). Tampilkan avatar,
  username (tautan profil), jumlah commit, dan label **Tim** bila anggota tim. Urut commit menurun.

## 6. Handler MSW

Tambah handler untuk semua endpoint di atas: asset detail (3 jenis), readme (dengan & tanpa front-matter),
tree, file (python/markdown/biner), branches, createBranch (sukses + 422 nama tak valid), versions,
contributors (commit + anggota tim).

## 7. Definition of Done

- [ ] Detail aset untuk projects/models/datasets memakai satu komponen; tab README/Files/Versi/Branch/Kontributor.
- [ ] **Kode mengikuti mode gelap & terang** (bukan blok gelap paksa).
- [ ] README dirender (front-matter HF dipisah jadi chip kartu).
- [ ] Pemilih branch/versi mengubah konten; buat branch dengan validasi nama.
- [ ] Kontributor menggabungkan commit + anggota Tim; urut commit.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
