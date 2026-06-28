# jupyterhub_config.py — JupyterHub PSD (Langkah 52)
#
# Logika berat (tier, hook, SDK) ada di paket `app.hubtools` (teruji). File ini
# hanya merangkai. Sesuaikan nama jaringan/volume/image ke infra PSD.
#
# CPU-ONLY, tanpa GPU. Idle-culling + batas tier = rem biaya utama.

import os

from app.hubtools.spawn import apply_tier_limits, auth_state_hook

c = get_config()  # noqa: F821 (disediakan JupyterHub)

ISSUER = os.environ["PSD_OIDC_ISSUER"].rstrip("/")   # provider OIDC PSD (Langkah 48)

# ----------------- Autentikasi: OAuth PSD (sub-langkah 2) -----------------
c.JupyterHub.authenticator_class = "generic-oauth"
c.GenericOAuthenticator.client_id = "jupyterhub"
c.GenericOAuthenticator.client_secret = os.environ["PSD_OIDC_CLIENT_SECRET"]
c.GenericOAuthenticator.oauth_callback_url = os.environ["PSD_HUB_CALLBACK_URL"]
c.GenericOAuthenticator.authorize_url = f"{ISSUER}/oauth/authorize"
c.GenericOAuthenticator.token_url = f"{ISSUER}/oauth/token"
c.GenericOAuthenticator.userdata_url = f"{ISSUER}/oauth/userinfo"
c.GenericOAuthenticator.scope = ["openid", "profile", "email"]
c.GenericOAuthenticator.username_claim = "preferred_username"
c.GenericOAuthenticator.enable_auth_state = True   # simpan token utk diteruskan ke notebook

# ----------------- Spawner: DockerSpawner (sub-langkah 1) -----------------
c.JupyterHub.spawner_class = "docker"
c.DockerSpawner.image = os.environ.get("PSD_SINGLEUSER_IMAGE", "psd/singleuser:latest")
c.DockerSpawner.network_name = os.environ.get("PSD_HUB_NETWORK", "psd-net")
c.DockerSpawner.remove = True            # bersihkan kontainer saat stop
c.DockerSpawner.notebook_dir = "/home/jovyan/work"
# Volume persisten per pengguna (notebook & data kerja):
c.DockerSpawner.volumes = {
    "psd-notebook-{username}": "/home/jovyan/work",
}

# ----------------- Batas tier + env PSD (sub-langkah 3 & 4) -----------------
c.Spawner.auth_state_hook = auth_state_hook   # ambil token + tier
c.Spawner.pre_spawn_hook = apply_tier_limits  # set cpu/mem/timeout + env psd

# ----------------- Idle-culling (rem biaya) -----------------
cull_timeout = int(os.environ.get("PSD_HUB_CULL_TIMEOUT", "3600"))   # 1 jam idle
c.JupyterHub.services = [
    {
        "name": "idle-culler",
        "command": [
            "python", "-m", "jupyterhub_idle_culler",
            f"--timeout={cull_timeout}", "--cull-every=300",
        ],
    },
]
c.JupyterHub.load_roles = [
    {
        "name": "idle-culler",
        "services": ["idle-culler"],
        "scopes": ["list:users", "read:users:activity", "delete:servers"],
    },
]

# Catatan: untuk K8s, ganti DockerSpawner→KubeSpawner; hook & SDK tetap sama.
# Fallback Colab (Langkah 22) dipertahankan selama transisi.
