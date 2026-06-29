# Rencana Migrasi Path A — SSH Git Gaya GitHub

**Domain:** `git.projeksainsdata.com`  
**VM:** `157.10.160.225` (idcloudhost)  
**Target:** Port **22** → Gitea (mahasiswa/dosen) · Port **2202** → sshd admin VM

> Runbook operasional. Referensi teknis: `Instructions/perbaikan-gitea/PERBAIKAN_SSH_GITEA_GITHUB.md`  
> Skrip: `deploy/scripts/setup-gitea-ssh-path-a.sh`, `deploy/scripts/verify-gitea-ssh.sh`

---

## Kondisi saat ini vs target

| | Sekarang | Setelah Path A |
|---|----------|----------------|
| `ssh -T git@git.projeksainsdata.com` | Banner idcloudhost + password VM | `Hi <user>!` dari Gitea |
| Port 22 | sshd admin (berbahaya untuk subdomain git) | Gitea SSH |
| Port admin VM | 22 | **2202** |
| Port 2222 | Gitea (interim, sering tertutup firewall) | **Ditutup** (opsional) |
| URL clone | `ssh://...@host:2222/...` | `git@host:user/repo.git` |

---

## Prasyarat (wajib sebelum jendela migrasi)

### Akses cadangan
- [ ] Login **konsol/VNC** idcloudhost sudah diuji (bukan sekadar punya link)
- [ ] Minimal **2 orang admin** siap standby
- [ ] Backup `.env` dan `docker-compose.prod.yml` di VM

### Kunci SSH admin
- [ ] Setiap admin punya kunci di `~/.ssh/authorized_keys` VM
- [ ] Tes dari laptop: `ssh ardikasatria@157.10.160.225` (port 22 saat ini) **tanpa password**
- [ ] Jangan lanjut jika admin masih login pakai password saja

### Aplikasi & Git interim
- [ ] `git pull` terbaru di `~/psd-web` (backend `giturl`, UI `/settings/git`)
- [ ] Path C (2222) sudah pernah jalan **atau** kontainer Gitea `Up` + `START_SSH_SERVER=true`
- [ ] Minimal satu kunci SSH mahasiswa terdaftar & `GET /api/v1/users/{user}/keys` tidak kosong

### Firewall idcloudhost (panel)
- [ ] Buka **TCP 2202** (admin baru) — **lakukan SEBELUM pindah sshd**
- [ ] Pastikan **TCP 22** tetap terbuka (nanti untuk Git)
- [ ] (Opsional) Tutup **TCP 2222** setelah Path A sukses

### Komunikasi
- [ ] Umumkan jendela maintenance (15–30 menit)
- [ ] Siapkan pesan: "SSH admin VM pindah ke port 2202"

---

## Jendela migrasi (urutan ketat)

**Estimasi:** 20–40 menit · **Rollback:** lihat bagian bawah

### Fase 0 — Persiapan (T-24 jam)

```bash
cd ~/psd-web/deploy
git pull
ADMIN_SSH_PORT=2202 ./scripts/setup-gitea-ssh-path-a.sh --check
./scripts/verify-gitea-ssh.sh   # catat baseline
```

Update `~/.ssh/config` di laptop admin (jangan apply dulu, siapkan):

```
Host projekdata-admin
  HostName 157.10.160.225
  User ardikasatria
  Port 2202
  IdentityFile ~/.ssh/id_ed25519
```

### Fase 1 — Buka port admin baru (T-0, masih di port 22 lama)

**Di panel idcloudhost:** allow TCP **2202** inbound.

**Di VM** (sesi SSH port 22 — **jangan tutup**):

```bash
sudo ufw allow 2202/tcp comment 'PSD admin SSH'
sudo ufw status
```

### Fase 2 — Pindahkan sshd host ke 2202

Masih di sesi lama (port 22):

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d)
sudo sed -i 's/^#\?Port .*/Port 2202/' /etc/ssh/sshd_config
grep ^Port /etc/ssh/sshd_config   # harus: Port 2202
sudo systemctl restart ssh
```

**Segera** buka terminal **baru** di laptop (jangan tutup sesi lama):

```bash
ssh -p 2202 ardikasatria@157.10.160.225
```

- [ ] Login sukses di port **2202** → lanjut Fase 3
- [ ] Gagal → gunakan **konsol idcloudhost**, restore backup `sshd_config`, jangan lanjut

Baru setelah 2202 terbukti: tutup sesi SSH port 22 lama.

### Fase 3 — Lepaskan port 22 untuk Gitea

Di sesi admin port **2202**:

```bash
sudo ss -tlnp | grep ':22 '   # tidak boleh ada sshd di 22
cd ~/psd-web/deploy

# .env
grep -q '^GITEA_SSH_PORT=' .env && sed -i 's/^GITEA_SSH_PORT=.*/GITEA_SSH_PORT=22/' .env || echo 'GITEA_SSH_PORT=22' >> .env
grep -q '^ADMIN_SSH_PORT=' .env && sed -i 's/^ADMIN_SSH_PORT=.*/ADMIN_SSH_PORT=2202/' .env || echo 'ADMIN_SSH_PORT=2202' >> .env

docker compose -f docker-compose.prod.yml up -d gitea backend
docker compose -f docker-compose.prod.yml ps gitea
sudo ss -tlnp | grep ':22 '   # harus docker-proxy / gitea
```

**Alternatif satu perintah** (setelah Fase 2 manual sukses):

```bash
cd ~/psd-web/deploy
sudo ADMIN_SSH_PORT=2202 ./scripts/setup-gitea-ssh-path-a.sh --apply
```

### Fase 4 — Verifikasi

**Dari laptop (Git):**

```bash
ssh -T git@git.projeksainsdata.com
# Harus: Hi ardikasatria! You've successfully authenticated...
```

```bash
git clone git@git.projeksainsdata.com:ardikasatria/<repo-kecil>.git /tmp/test-clone
```

**Admin:**

```bash
ssh -p 2202 ardikasatria@157.10.160.225
```

**Di VM:**

```bash
cd ~/psd-web/deploy && ./scripts/verify-gitea-ssh.sh
```

**UI PSD:** `/settings/git` → port **22**, contoh `git@git.projeksainsdata.com:user/nama-repo.git`

### Fase 5 — Pembersihan (setelah 24 jam stabil)

- [ ] Tutup TCP **2222** di firewall idcloudhost (jika tidak dipakai)
- [ ] `sudo ufw delete allow 2222/tcp` (jika ada)
- [ ] Hapus entri `known_hosts` lama port 2222 di laptop (opsional)
- [ ] Update dokumentasi internal tim admin

---

## Pengerasan keamanan (minggu pertama)

| Langkah | Kapan | Catatan |
|---------|-------|---------|
| `PasswordAuthentication no` di sshd | Setelah semua admin pakai kunci | Konsol cadangan wajib |
| fail2ban untuk sshd | Setelah port 2202 stabil | |
| Batasi IP admin di firewall | Jika IP kampus tetap | |
| Audit: `ssh git@...` tidak boleh banner OS | Setelah Fase 4 | |

```bash
# Contoh (hati-hati):
# sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
# sudo systemctl restart ssh
```

---

## Rollback

**Jika Gitea gagal bind port 22 tapi admin 2202 masih jalan:**

```bash
cd ~/psd-web/deploy
sed -i 's/^GITEA_SSH_PORT=.*/GITEA_SSH_PORT=2222/' .env
docker compose -f docker-compose.prod.yml up -d gitea backend
# Mahasiswa sementara: ssh -p 2222 -T git@git.projeksainsdata.com
```

**Jika admin terkunci total:**

1. Konsol idcloudhost → login root
2. `sudo cp /etc/ssh/sshd_config.bak.* /etc/ssh/sshd_config`
3. `sudo sed -i 's/^Port .*/Port 22/' /etc/ssh/sshd_config`
4. `sudo systemctl restart ssh`
5. Evaluasi ulang sebelum retry Path A

---

## Checklist selesai

- [ ] `ssh -T git@git.projeksainsdata.com` → Gitea (bukan banner OS)
- [ ] `git clone/push/pull` SSH berfungsi
- [ ] Admin masuk `ssh -p 2202 user@157.10.160.225`
- [ ] Port 22 **tidak** membuka shell VM untuk user `git`
- [ ] UI `/settings/git` menampilkan `github_like: true`
- [ ] Firewall: 22 (git), 2202 (admin); 2222 ditutup

---

## Siapa melakukan apa

| Peran | Tugas |
|-------|--------|
| Admin infra | Fase 1–3, firewall, rollback |
| Admin aplikasi | `docker compose`, verifikasi API kunci SSH |
| Koordinator | Komunikasi ke pengguna, pantau jendela maintenance |

**Jadwal disarankan:** akhir pekan atau malam hari (traffic Git rendah).
