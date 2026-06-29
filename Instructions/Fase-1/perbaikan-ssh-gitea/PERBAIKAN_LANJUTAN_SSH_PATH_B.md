# Perbaikan Lanjutan — Path B Masih "Permission denied (publickey)" & Banner idcloudhost

## Ringkasan: ada DUA hal terpisah

| Gejala | Status sebenarnya |
|---|---|
| Banner idcloudhost muncul | **Normal & kosmetik.** Di Path B, port 22 dijawab sshd host (memang begitu desainnya). Banner tampil **sebelum** autentikasi. Bisa disembunyikan (`--fix-banner`). |
| `Permission denied (publickey)` | **Ini masalah sebenarnya.** `AuthorizedKeysCommand` tak menemukan kunci yang cocok. |

> Skrip `verify-gitea-ssh.sh` bawaanmu **salah** menilai "banner = passthrough belum aktif". Buktinya
> autentikasi berubah dari *minta password* (sebelum) menjadi *publickey denied* (sekarang) — artinya
> blok `Match User git` **sudah aktif**. Sisanya tinggal soal kunci.

---

## Penyebab `Permission denied (publickey)` (urut paling mungkin)

1. **Kunci publikmu belum terdaftar di Gitea.** Sinkron PSD→Gitea (Langkah 27) belum live, atau kunci
   ditambahkan hanya di sisi PSD yang belum tersambung. → `gitea keys` tak mengembalikan apa pun → ditolak.
2. **`AuthorizedKeysCommand` error** (binary gitea tak ketemu di kontainer, user `git` tak bisa `docker exec`,
   atau izin file salah).
3. **Kunci yang ditawarkan laptop ≠ kunci yang terdaftar** (laptop menawarkan kunci lain).

---

## Langkah 1 — Jalankan diagnosa (temukan akar pasti)

Salin kunci publik laptopmu lebih dulu (di laptop): `pbcopy < ~/.ssh/id_ed25519.pub`, lalu di VM:

```bash
cd ~/psd-web/deploy
sudo ./scripts/diagnose-gitea-ssh.sh --pubkey "ssh-ed25519 AAAA...isi-lengkap... budi@itera"
```

Skrip memeriksa: user `git` & shell, izin `AuthorizedKeysCommand`, binary gitea di kontainer, konfigurasi
sshd efektif, **apakah kunci terdaftar di Gitea**, apakah rantai host→kontainer mengembalikan kunci, dan
log auth terbaru. Bagian **[5]** langsung memberi tahu apakah masalahnya di "kunci tak terdaftar" atau
"command error".

---

## Langkah 2 — Perbaiki sesuai temuan

### Kasus A — Kunci TIDAK terdaftar di Gitea (paling umum)

**Uji cepat (membuktikan pipeline jalan):** daftarkan kunci ke Gitea via admin API, lalu coba lagi.

```bash
# di VM. ADMIN_TOKEN = token admin Gitea (Langkah 50); USERNAME = username Gitea-mu.
ADMIN_TOKEN="xxxxx"
USERNAME="ardikasatria"
PUBKEY="ssh-ed25519 AAAA... budi@itera"

curl -fsS -X POST \
  -H "Authorization: token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"laptop\",\"key\":\"$PUBKEY\",\"read_only\":false}" \
  https://git.$DOMAIN/api/v1/admin/users/$USERNAME/keys
```

Lalu dari **laptop**: `ssh -T git@git.$DOMAIN` → seharusnya `Hi $USERNAME!`.

- **Berhasil?** Berarti infrastruktur SSH sudah benar; yang kurang hanya **sinkron PSD→Gitea**.
  Deploy fitur Langkah 27 (kelola kunci di Pengaturan PSD → admin API Gitea) agar pengguna menambah
  kunci dari PSD dan otomatis masuk Gitea. Mulai sekarang pengguna tak perlu sentuh Gitea.
- (Alternatif uji manual: login Gitea via OIDC di `https://git.$DOMAIN` → Settings → SSH Keys → tempel.
  Hanya untuk membuktikan; tujuan akhirnya tetap lewat PSD.)

### Kasus B — `AuthorizedKeysCommand` error

Diagnosa [3]/[5b] menunjukкан error. Cek:

```bash
# binary gitea di kontainer
docker exec psd-gitea sh -c 'command -v gitea'         # harus ada (mis. /usr/local/bin/gitea atau /app/gitea/gitea)
# user git bisa docker exec?
sudo -u git docker ps >/dev/null && echo "git bisa docker" || echo "git TIDAK bisa docker → tambah ke grup docker & restart sshd"
# uji manual perintah keys
docker exec psd-gitea gitea keys -e git -u git -t ssh-ed25519 -k "AAAA...b64..."
```

- Jika binary gitea di path lain, sesuaikan `AUTH_SCRIPT` (`/usr/local/bin/psd-gitea-authorized-keys`)
  agar memanggil path yang benar.
- Jika `git` tak bisa `docker`: `sudo usermod -aG docker git && sudo systemctl restart ssh`.

### Selalu — Sembunyikan banner idcloudhost untuk user git

```bash
sudo ./scripts/diagnose-gitea-ssh.sh --fix-banner
```

Menambahkan `Banner none` ke blok `Match User git` (uji `sshd -t` lalu restart). Setelah ini, koneksi
`git@` tak lagi menampilkan banner idcloudhost — langsung ke sapaan Gitea saat sukses.

---

## Langkah 3 — Verifikasi akhir (dari laptop)

```bash
ssh -vT git@git.projeksainsdata.com
```

Sukses bila muncul:

```
Hi ardikasatria! You've successfully authenticated, but Gitea does not provide shell access.
```

Lalu:

```bash
git clone git@git.projeksainsdata.com:USERNAME/REPO.git    # port 22, gaya GitHub
```

---

## Catatan penting

- **Sapaan "Hi username" hanya muncul SETELAH autentikasi sukses.** Selama masih `publickey denied`,
  kamu tak akan pernah melihatnya — perbaiki pendaftaran kunci dulu (Kasus A).
- **Banner ≠ kegagalan.** Setelah `--fix-banner`, banner hilang; tanpa itu pun, koneksi tetap bisa
  sukses (banner hanya kosmetik pra-auth).
- **Tujuan akhir**: pengguna menambah kunci **di Pengaturan PSD** (Langkah 27) → otomatis ke Gitea →
  `ssh -T git@git.$DOMAIN` langsung `Hi username`. Uji admin API di atas hanya untuk memastikan
  jalur SSH sudah benar sebelum sinkron PSD diaktifkan.
- Admin VM tetap masuk lewat user admin biasa di port 22 (Path B tak memindah port admin).
