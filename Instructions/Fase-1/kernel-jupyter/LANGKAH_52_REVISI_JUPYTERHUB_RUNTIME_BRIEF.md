# Langkah 52 (Revisi) — Runtime Server Notebook via JupyterHub (OAuth2/OIDC PSD), UI Tetap di PSD

> **Tujuan:** Kernel **server** notebook benar-benar berjalan di **JupyterHub di VM infra**, tetapi
> **UI & fungsi notebook tetap di PSD** (editor kustom). Pengguna masuk ke Hub lewat **akun PSD via
> OAuth2/OIDC (Langkah 48)**. PSD bertindak sebagai **service Hub**: memastikan server pengguna hidup,
> lalu editor PSD bicara ke single-user server itu dengan token ber-scope.
> **Revisi Langkah 52/52b + integrasi Langkah 26 (grant akses).** Prasyarat: 26, 48, 52, 52b/editor.
>
> Logika inti **lulus 7 uji** di `psd-hub/app/hub/`.

## 1. Arsitektur (yang berubah)

- **Runtime browser (JupyterLite)**: tetap (gratis, tier rendah). Tak berubah.
- **Runtime server**: dulu Kernel Gateway bespoke → sekarang **JupyterHub** (per-user container,
  di-spawn Hub). **UI tetap editor PSD**; Hub-nya disembunyikan.
- **Auth**: JupyterHub pakai **GenericOAuthenticator → OIDC PSD (Langkah 48)**, sehingga **username Hub
  = username PSD**. PSD = **service Hub** dengan token admin (kelola server + terbitkan token pengguna).
- **Gate**: runtime server tetap butuh **grant akses kernel (Langkah 26)** + batas konkuren.

```
PSD UI (editor)  ──REST/WS (token ber-scope)──►  https://hub/user/<name>/api/kernels
        ▲                                              ▲ (Hub proxy → single-user server)
        └── backend PSD (service Hub) ── start server, terbitkan token ber-scope ──┘
```

## 2. Konfigурasi JupyterHub (`jupyterhub_config.py`)

```python
c.JupyterHub.authenticator_class = "generic-oauth"   # GenericOAuthenticator
c.GenericOAuthenticator.client_id = "jupyterhub"      # klien OIDC (seed Langkah 48)
c.GenericOAuthenticator.client_secret = os.environ["PSD_OIDC_CLIENT_SECRET"]
c.GenericOAuthenticator.authorize_url = "https://psd.<domain>/oauth/authorize"
c.GenericOAuthenticator.token_url     = "https://psd.<domain>/oauth/token"
c.GenericOAuthenticator.userdata_url  = "https://psd.<domain>/oauth/userinfo"
c.GenericOAuthenticator.username_claim = "preferred_username"   # = username PSD
c.JupyterHub.spawner_class = "dockerspawner.DockerSpawner"      # kontainer per pengguna (Langkah 52)

# PSD sebagai SERVICE Hub (kelola server & token):
c.JupyterHub.services = [{"name": "psd", "api_token": os.environ["PSD_HUB_SERVICE_TOKEN"]}]
c.JupyterHub.load_roles = [{
    "name": "psd-manager", "services": ["psd"],
    "scopes": ["admin:servers", "tokens", "access:servers", "read:users"],
}]
```

> Idle-culling + batas sumber daya per tier (Langkah 26 grant: cpu/mem/konkuren) tetap berlaku.

## 3. Service (cermin scaffold teruji) — `app/modules/hub/`

- `hub_client.JupyterHubClient`: `get_user/start_server/stop_server/ensure_server/create_user_token`.
- `hub_urls`: `user_server_base/kernels_url/ws_channels_url/access_scope/server_ready`.
- `launch.open_server_runtime`: gate grant (Langkah 26) → `ensure_server` → token ber-scope →
  config `{base_url, kernels_url, ws_base, token, expires_in}` untuk UI.

## 4. Endpoint — `app/modules/notebook/router.py` (revisi launch server)

| Method | Path | Aksi |
|---|---|---|
| POST | `/notebooks/{id}/launch` | Pilih runtime (52b). **server** → `open_server_runtime`: cek grant aktif (Langkah 26) + batas konkuren → pastikan server Hub → kembalikan `{base_url, ws_base, token, ...}`. **browser** → config JupyterLite (tak berubah). |
| POST | `/notebooks/{id}/stop` | `hub_client.stop_server(name)` (mengakhiri server pengguna). |
| GET | `/notebooks/runtime/status` | Status server Hub pengguna (`get_user`/`server_ready`). |

- Token yang dikembalikan ke UI **ber-scope `access:servers!user=<name>`** & **berumur pendek**
  (mis. 1 jam) — bukan token admin. UI memakainya untuk REST + WS kernel langsung ke Hub.
- Saat **grant dicabut/kedaluwarsa** (Langkah 26) → `stop_server` untuk mematikan kernel berjalan.

## 5. Definition of Done

- [ ] Membuka notebook server dari PSD men-spawn/menyambung server **JupyterHub** pengguna (login OIDC PSD).
- [ ] **UI & fungsi tetap di PSD** (editor kustom); Hub UI tak ditampilkan.
- [ ] Token yang diberikan ke UI **ber-scope ke server pengguna** & berumur pendek (bukan admin token).
- [ ] Runtime server tetap **digate grant (Langkah 26)** + batas konkuren; browser tetap bebas.
- [ ] Cabut/kedaluwarsa grant → server Hub dihentikan.
- [ ] Logika (cermin `psd-hub/app/hub/tests/`) hijau.

## 6. Gotcha

- **Jangan kirim token admin Hub ke frontend** — selalu terbitkan token pengguna ber-scope, pendek.
- **Username konsisten**: `username_claim` OIDC harus = username PSD (Langkah 48), agar `/user/<name>/` benar.
- **ensure_server butuh poll** (spawn tak instan) — tampilkan state "menyiapkan server" di UI; ada timeout.
- **WS lewat proxy Hub** (`/user/<name>/api/kernels/{id}/channels?token=`) — pastikan reverse proxy
  mengizinkan WebSocket.
- **Isolasi tetap per-pengguna** (DockerSpawner/KubeSpawner); jangan berbagi kernel antar pengguna.
- **Idle-culling + batas tier** tetap aktif (rem biaya).
