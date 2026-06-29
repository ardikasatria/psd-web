# Langkah 27 — Kunci SSH Git (Kelola di Pengaturan PSD ↔ Tersinkron ke Gitea)

> **Tujuan:** Pengguna mengatur **kunci SSH** (dan opsional token HTTPS) untuk git push **di
> Pengaturan PSD**, tanpa membuka `git.projeksainsdata.com`. PSD menyinkronkan kunci ke akun Gitea
> pengguna lewat **admin API Gitea**. **Kerjakan setelah Langkah 50 (Gitea/OIDC).**
> Prasyarat: Langkah 11 (auth), 50 (Gitea + admin token + username Gitea per pengguna).
>
> **Bisa?** Ya. Gitea menyediakan admin API untuk menambah/menghapus kunci publik milik pengguna.
> PSD menyimpan **kunci publik saja** (tak pernah privat). Logika inti **lulus 8 uji** di `psd-git-keys/`.

---

## 27.1 Model — `app/modules/gitkeys/models.py`

Referensi kunci yang disinkronkan (publik saja). Kunci asli tetap di Gitea.

```python
class GitSshKey(Base):
    __tablename__ = "git_ssh_keys"
    __table_args__ = (UniqueConstraint("user_id", "fingerprint", name="uq_user_fingerprint"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)   # = id kunci di Gitea
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)                    # ssh-ed25519, dst.
    fingerprint: Mapped[str] = mapped_column(String, index=True) # "SHA256:..."
    gitea_username: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

```bash
docker compose exec backend alembic revision --autogenerate -m "git_ssh_keys"
docker compose exec backend alembic upgrade head
```

> Catatan: `id` memakai id kunci dari Gitea agar hapus mudah dipetakan. Bila ingin id internal
> terpisah, simpan `gitea_key_id` sebagai kolom tersendiri.

## 27.2 Validasi & klien Gitea (cermin scaffold teruji)

- `sshkeys.parse_public_key(text)` → `{type, fingerprint, comment, normalized}`. Memvalidasi format
  OpenSSH, mencocokkan nama algoritma yang tertanam di blob, menghitung **fingerprint SHA256**
  (sama seperti ditampilkan Gitea). Tolak tipe tak didukung / base64 rusak / algoritma tak cocok.
- `gitea.GiteaKeysClient` (admin token Gitea):
  - Tambah : `POST /api/v1/admin/users/{username}/keys` `{title, key, read_only}`
  - Daftar : `GET /api/v1/users/{username}/keys`
  - Hapus  : `DELETE /api/v1/admin/users/{username}/keys/{id}`
- `service.add_key/remove_key/list_keys`: validasi → cek duplikat fingerprint → sinkron Gitea →
  simpan/hapus ref di PSD.

## 27.3 Endpoint — `app/modules/gitkeys/router.py`

| Method | Path | Aksi |
|---|---|---|
| GET | `/me/git/ssh-keys` | Daftar kunci pengguna (dari store PSD): `{id, title, type, fingerprint, created_at}`. |
| POST | `/me/git/ssh-keys` | `{title, public_key}` → `service.add_key`. 422 bila kunci/judul tak valid; 409 bila duplikat. |
| DELETE | `/me/git/ssh-keys/{id}` | `service.remove_key` (hapus di Gitea + PSD). 404 bila bukan milik pengguna. |

Resolusi `gitea_username` & `GiteaKeysClient` lewat seam (Langkah 50). Pakai `ApiError`.

## 27.4 (Opsional) Token HTTPS (PAT) — bila ingin alternatif SSH

Untuk push via HTTPS tanpa kata sandi (pengguna login OIDC), PSD bisa membuat **token Gitea** atas
nama pengguna memakai header **`Sudo: <username>`** pada admin token:

```
POST /api/v1/users/{username}/tokens   (header: Authorization: token <ADMIN>, Sudo: <username>)
body: {"name": "psd-cli", "scopes": ["write:repository"]}
→ { "sha1": "<token>" }   # TAMPILKAN SEKALI, jangan simpan plaintext
```

- Endpoint PSD: `POST /me/git/tokens` → kembalikan token **sekali**; simpan hanya `name` + `prefix` +
  `created_at` untuk daftar. `DELETE /me/git/tokens/{name}` mencabut.
- **Gotcha**: token = rahasia; tampilkan sekali, jangan log, jangan simpan utuh. Beri scope minimal.

> Mulai dari SSH (lebih aman & sederhana); tambahkan PAT hanya bila pengguna memintanya.

## 27.5 Halaman bantuan

Perbarui `/help/git-menyiapkan-akses`: arahkan pengguna ke **Pengaturan PSD → Akses Git** (bukan ke
Gitea). Sertakan contoh `ssh-keygen` & cara menempel kunci publik.

## Selesai bila

- [ ] Pengguna menambah/menghapus kunci SSH di Pengaturan PSD; tersinkron ke akun Gitea-nya.
- [ ] Validasi menolak kunci tak valid; duplikat fingerprint ditolak (409).
- [ ] `git push` via SSH bekerja **tanpa** pengguna pernah membuka Gitea.
- [ ] PSD tak pernah menyimpan kunci privat; hanya publik + fingerprint.
- [ ] (Opsional) Token HTTPS dibuat & ditampilkan sekali; pencabutan bekerja.
- [ ] Logika (cermin `psd-git-keys/app/gitkeys/tests/`) hijau.

## Gotcha

- **Hanya kunci publik** masuk PSD/Gitea; jangan pernah minta/simpan kunci privat.
- **Fingerprint sebagai identitas** untuk dedup & tampil (hitung dari blob, jangan percaya input mentah).
- **Pemetaan kepemilikan**: hapus hanya kunci milik pengguna (cek `user_id`), lalu hapus di Gitea.
- **`gitea_username`** harus dari provisioning Langkah 50, bukan dari input pengguna.
- **Konsistensi**: bila tambah Gitea sukses tapi simpan PSD gagal (atau sebaliknya), tangani agar tak
  ada kunci yatim — idealnya simpan ref hanya setelah Gitea sukses (urutan di scaffold sudah begitu);
  pertimbangkan job rekonsiliasi berkala terhadap `GET /users/{username}/keys`.
