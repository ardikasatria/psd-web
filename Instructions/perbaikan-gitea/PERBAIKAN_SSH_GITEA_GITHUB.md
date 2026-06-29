# Perbaikan — SSH Git "Seperti GitHub" (Isolasi dari Server, Port 22 → Gitea)

> **Masalah:** `ssh -T git@git.projeksainsdata.com` saat ini masuk ke **sshd sistem operasi VM**
> (banner idcloudhost + minta password) — bukan ke Gitea. SSH Gitea di `:2222` "Connection reset"
> (tak listening / firewall tertutup). Akibatnya port 22 subdomain git membuka **login server** —
> berbahaya — dan push/pull via SSH belum berfungsi.
>
> **Tujuan:** `ssh -T git@git.projeksainsdata.com` membalas sapaan **Gitea** (`Hi <user>!`), tanpa
> password, langsung bisa `git push/pull` — **seperti GitHub**, tanpa akses shell ke server.
>
> Ini perbaikan **infra/devops** (sebagian app). Helper URL clone **lulus 5 uji** di `psd-git-keys/`.

---

## Diagnosis (konfirmasi dulu)

- [ ] `ssh -vT git@git.projeksainsdata.com` → banner idcloudhost = **port 22 menuju host sshd**, bukan Gitea.
- [ ] `ssh -p 2222 -T git@git.projeksainsdata.com` reset = SSH Gitea tak listening/terekspos atau **firewall idcloudhost** menutup 2222.
- [ ] Cek Gitea: `START_SSH_SERVER`, `SSH_LISTEN_PORT`, pemetaan port compose, dan apakah kontainer Gitea sehat.

---

## Akar masalah

1. **Port 22 dipakai sshd host** (login OS). Gitea tidak menerima koneksi di 22.
2. **SSH Gitea (2222) tidak benar-benar terbuka** (tak di-`START_SSH_SERVER`, tak dipetakan, atau firewall tutup).
3. **Risiko keamanan**: subdomain git mengekspos shell server. Harus dipisah: SSH git ≠ SSH admin.

---

## Solusi — pilih satu

### Path A (DIREKOMENDASIKAN, paling "GitHub") — dedikasikan port 22 untuk Gitea

Pindahkan SSH admin server ke port lain; berikan **port 22 ke kontainer Gitea**.

> ⚠️ **Bahaya lockout.** Sebelum memindah sshd host: **pastikan ada akses konsol/VNC idcloudhost**
> sebagai cadangan, dan **buka satu sesi SSH tambahan** selama perubahan. Jangan tutup sesi lama
> sampai port baru terbukti bekerja.

**1) Pindahkan sshd host dari 22 → mis. 2202:**
```bash
sudo sed -i 's/^#\?Port .*/Port 2202/' /etc/ssh/sshd_config
# (opsional, lebih aman) PasswordAuthentication no  → wajib sudah pasang kunci admin
sudo systemctl restart ssh   # atau sshd
# buka 2202 di firewall idcloudhost + ufw, lalu UJI dari terminal baru:
#   ssh -p 2202 <admin>@<ip>
```

**2) Buka port di firewall idcloudhost (Security Group/Panel):** izinkan **22** (git) & **2202** (admin).

**3) Gitea pakai SSH bawaan di port 22 (compose):**
```yaml
services:
  gitea:
    environment:
      - GITEA__server__SSH_DOMAIN=git.projeksainsdata.com
      - GITEA__server__SSH_PORT=22            # ditampilkan di URL clone (bersih, gaya GitHub)
      - GITEA__server__SSH_LISTEN_PORT=22     # port SSH bawaan Gitea di dalam kontainer
      - GITEA__server__START_SSH_SERVER=true  # gunakan SSH server Go bawaan Gitea
      - GITEA__server__ROOT_URL=https://git.projeksainsdata.com/
    ports:
      - "22:22"        # host 22 → Gitea (setelah sshd host pindah)
      - "3000:3000"    # web (di balik reverse proxy)
```
```bash
docker compose up -d gitea
```

**4) Verifikasi:**
```bash
ssh -T git@git.projeksainsdata.com      # → "Hi <username>! ..." dari Gitea (tanpa password)
git clone git@git.projeksainsdata.com:USER/REPO.git
```

### Path B (alternatif) — SSH Container Passthrough (tetap pakai sshd host di 22)

Bila port 22 host tak boleh dipindah. Host sshd tetap di 22, tetapi koneksi **user `git`** diteruskan
ke kontainer Gitea (bukan shell):

1. Buat user `git` di host: `sudo useradd -m -s /bin/bash git`.
2. Gitea kelola `~git/.ssh/authorized_keys` (volume bersama) dengan **forced command** yang meneruskan
   ke SSH kontainer Gitea (mis. `ssh -p 2222 git@127.0.0.1 ...`) — ikuti dokumentasi resmi Gitea
   "SSH Container Passthrough".
3. Gitea: `START_SSH_SERVER=false` (pakai sshd host), `SSH_PORT=22`, `SSH_DOMAIN=git.projeksainsdata.com`.
4. Pastikan **shell user `git` dibatasi** (hanya git-shell/forced command) — tak ada akses shell penuh.

> Path B lebih banyak bagian bergerak & mudah salah konfigurasi; pilih A bila bisa.

### Path C (interim cepat, BUKAN gaya GitHub) — perbaiki 2222 dulu

Bila butuh cepat tanpa memindah sshd host: pastikan SSH Gitea benar-benar terbuka di 2222
(`START_SSH_SERVER=true`, `SSH_LISTEN_PORT=2222`, map `"2222:2222"`, **buka 2222 di firewall**), set
`SSH_PORT=2222`. URL clone menjadi `ssh://git@git.projeksainsdata.com:2222/USER/REPO.git`.
Berfungsi, tapi tak sebersih GitHub. Naikkan ke Path A nanti.

---

## Sisi aplikasi PSD (agar konsisten)

- **URL clone harus cocok dengan port SSH.** Pakai helper terverifikasi `giturl.ssh_clone_url`:
  port 22 → `git@host:owner/repo.git`; port lain → `ssh://git@host:PORT/owner/repo.git`. Jangan
  hardcode bentuk scp-like saat port ≠ 22 (akan gagal).
- **`SSH_DOMAIN`/`SSH_PORT` Gitea** harus benar agar URL di UI Gitea & PSD sama.
- **Kunci SSH** (Langkah 27) memang ditambahkan ke akun Gitea pengguna lewat admin API — verifikasi
  kunci muncul di `GET /api/v1/users/{username}/keys`. Tanpa SSH server yang benar (Path A/B/C),
  kunci yang sudah benar pun tak bisa dipakai.
- **Halaman bantuan & contoh clone** (`/help/git-menyiapkan-akses`, Pengaturan → Akses Git): tampilkan
  perintah uji dari `giturl.ssh_test_command` & URL dari `giturl.ssh_clone_url` sesuai port final.

---

## Pengerasan keamanan (penting)

- **Pisahkan SSH git dari SSH admin** (inti perbaikan). SSH git hanya operasi git, **tanpa shell**
  (SSH bawaan Gitea memang begitu).
- **Host sshd**: matikan `PasswordAuthentication` (kunci saja), pasang **fail2ban**, batasi sumber IP admin bila bisa.
- **Jangan** biarkan port 22 subdomain git menuju OS host (kondisi sekarang) — itu yang harus dihentikan.
- Audit: pastikan banner/login OS tak lagi muncul saat `ssh git@git.projeksainsdata.com`.

---

## Selesai bila

- [ ] `ssh -T git@git.projeksainsdata.com` membalas sapaan **Gitea** (bukan banner OS, tanpa password).
- [ ] `git clone/push/pull` via SSH berfungsi dengan kunci dari Pengaturan PSD.
- [ ] Port 22 subdomain git **tidak lagi** membuka shell server; SSH admin pindah & terlindungi.
- [ ] URL clone di UI PSD/Gitea sesuai port (helper `giturl`, 5 uji hijau).
- [ ] Firewall idcloudhost membuka port yang benar; ada cadangan konsol agar tak lockout.

---

## Referensi terverifikasi

`psd-git-keys/app/gitkeys/giturl.py` **lulus 5 uji**: URL SSH port-22 gaya GitHub, URL `ssh://` untuk
port non-22, strip `.git`, URL HTTPS, perintah uji SSH. Pakai ini agar UI selalu menampilkan URL clone
yang benar sesuai port SSH Gitea final.
