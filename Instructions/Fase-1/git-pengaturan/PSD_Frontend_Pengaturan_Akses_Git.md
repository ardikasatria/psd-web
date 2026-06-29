# PSD — Instruksi Cursor: Pengaturan Akses Git (Kunci SSH)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun bagian **Pengaturan → Akses Git**
> tempat pengguna mengelola **kunci SSH** (dan opsional token HTTPS) tanpa membuka Gitea.
> **Kerjakan setelah auth cookie.** Prasyarat: backend Langkah 27.

## 1. Skema & API

```ts
export const SshKeySchema = z.object({
  id: z.number(), title: z.string(), type: z.string(),
  fingerprint: z.string(), created_at: z.string(),
});

// lib/api/git-keys.ts
export const getSshKeys = () => apiFetch(`/me/git/ssh-keys`, z.array(SshKeySchema));
export const addSshKey = (title: string, public_key: string) =>
  apiFetch(`/me/git/ssh-keys`, SshKeySchema, { method: "POST", body: JSON.stringify({ title, public_key }) });
export const deleteSshKey = (id: number) =>
  apiFetch(`/me/git/ssh-keys/${id}`, z.any(), { method: "DELETE" });

// opsional: token HTTPS
export const createGitToken = (name: string) =>
  apiFetch(`/me/git/tokens`, z.object({ name: z.string(), token: z.string() }), { method: "POST", body: JSON.stringify({ name }) });
```

## 2. Halaman — `/settings/git` (Pengaturan → Akses Git)

Pengantar singkat: *"Tambahkan kunci SSH agar bisa `git push` dari komputer Anda. Anda mengaturnya di
sini — tidak perlu membuka server Git."*

- **Daftar kunci** (`getSshKeys`): tiap baris menampilkan **judul**, **tipe** (mis. ssh-ed25519),
  **fingerprint** (font monospace), dan waktu ditambahkan, dengan tombol **Hapus** (konfirmasi).
- **Tambah kunci**: form dengan **Judul** (mis. "Laptop kantor") + **Kunci publik** (textarea, tempel
  isi `~/.ssh/id_ed25519.pub`) → `addSshKey`. Setelah sukses, prepend ke daftar.
- **Bantuan inline**: blok kode untuk membuat kunci, dengan tombol salin:
  ```bash
  ssh-keygen -t ed25519 -C "email-anda@itera.ac.id"
  cat ~/.ssh/id_ed25519.pub   # tempel ke kolom di atas
  ```
- **Contoh clone** (read-only): tampilkan format URL SSH repo, mis.
  `git clone git@git.projeksainsdata.com:USERNAME/REPO.git` (ganti host nyata).

Tangani error backend dengan pesan jelas:
- 422 `unsupported_type`/`invalid_key`/`invalid_base64` → "Kunci tidak valid. Pastikan menempel isi
  berkas `.pub` (diawali `ssh-ed25519` atau `ssh-rsa`)."
- 409 `duplicate_key` → "Kunci ini sudah terdaftar."
- 422 `title_required` → "Beri judul untuk kunci."

State loading/kosong (belum ada kunci → ajakan tambah)/error.

## 3. (Opsional) Token HTTPS

Bagian terpisah di halaman yang sama:
- Tombol **Buat token** (input nama) → `createGitToken` → tampilkan token **sekali** di kotak
  dengan tombol salin + peringatan: *"Salin sekarang. Token tak akan ditampilkan lagi."*
- Daftar token (nama + prefix + waktu) dengan tombol **Cabut**.
- Petunjuk: saat `git push` HTTPS, gunakan **username Gitea** + token sebagai kata sandi.

> Mulai dengan SSH; tampilkan bagian token hanya bila backend Langkah 27.4 diaktifkan.

## 4. Handler MSW

Tambah handler: `getSshKeys` (kosong & berisi), `addSshKey` (sukses; juga simulasikan 422 untuk input
"sampah" dan 409 untuk fingerprint sama), `deleteSshKey`. Bila token diaktifkan: `createGitToken`
(kembalikan token dummy sekali).

## 5. Definition of Done

- [ ] Pengguna menambah & menghapus kunci SSH dari Pengaturan PSD; daftar menampilkan fingerprint.
- [ ] Validasi backend ditampilkan ramah (tipe/format/duplikat).
- [ ] Bantuan `ssh-keygen` + contoh clone tampil dengan tombol salin.
- [ ] **Tak perlu membuka server Git** untuk menyiapkan akses.
- [ ] (Opsional) Token HTTPS dibuat & ditampilkan sekali; pencabutan bekerja.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
