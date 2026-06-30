# jupyterhub_config.py — JupyterHub PSD (Langkah 52)
import os

from app.hubtools.spawn import apply_tier_limits, auth_state_hook

c = get_config()  # noqa: F821

ISSUER = os.environ["PSD_OIDC_ISSUER"].rstrip("/")

c.JupyterHub.authenticator_class = "generic-oauth"
c.GenericOAuthenticator.client_id = "jupyterhub"
c.GenericOAuthenticator.client_secret = os.environ["PSD_OIDC_CLIENT_SECRET"]
c.GenericOAuthenticator.oauth_callback_url = os.environ["PSD_HUB_CALLBACK_URL"]
c.GenericOAuthenticator.authorize_url = f"{ISSUER}/oauth/authorize"
c.GenericOAuthenticator.token_url = f"{ISSUER}/oauth/token"
c.GenericOAuthenticator.userdata_url = f"{ISSUER}/oauth/userinfo"
c.GenericOAuthenticator.scope = ["openid", "profile", "email"]
c.GenericOAuthenticator.username_claim = "preferred_username"
c.GenericOAuthenticator.enable_auth_state = True

_spawn_timeout = int(os.environ.get("PSD_HUB_SPAWN_TIMEOUT", "300"))
_http_timeout = int(os.environ.get("PSD_HUB_HTTP_TIMEOUT", "180"))

c.JupyterHub.spawner_class = "docker"
c.DockerSpawner.image = os.environ.get("PSD_SINGLEUSER_IMAGE", "psd-singleuser:latest")
c.DockerSpawner.network_name = os.environ.get("PSD_HUB_NETWORK", "psd-net")
c.DockerSpawner.remove = True
c.DockerSpawner.pull_policy = "ifnotpresent"
c.DockerSpawner.start_timeout = _spawn_timeout
c.DockerSpawner.cmd = "start-singleuser.sh"
c.DockerSpawner.debug = True
c.Spawner.http_timeout = _http_timeout
c.DockerSpawner.notebook_dir = "/home/jovyan/work"
c.DockerSpawner.volumes = {
    "psd-notebook-{username}": "/home/jovyan/work",
}

c.Spawner.auth_state_hook = auth_state_hook
c.Spawner.pre_spawn_hook = apply_tier_limits

cull_timeout = int(os.environ.get("PSD_HUB_CULL_TIMEOUT", "3600"))
_services = [
    {
        "name": "idle-culler",
        "command": [
            "python",
            "-m",
            "jupyterhub_idle_culler",
            f"--timeout={cull_timeout}",
            "--cull-every=300",
        ],
    },
]
_load_roles = [
    {
        "name": "idle-culler",
        "services": ["idle-culler"],
        "scopes": ["list:users", "read:users:activity", "delete:servers"],
    },
]

_psd_hub_token = os.environ.get("PSD_HUB_SERVICE_TOKEN", "").strip()
if _psd_hub_token:
    _services.append({"name": "psd", "api_token": _psd_hub_token})
    _load_roles.append(
        {
            "name": "psd-manager",
            "services": ["psd"],
            "scopes": ["admin:servers", "admin:users", "tokens", "access:servers", "read:users"],
        }
    )

c.JupyterHub.services = _services
c.JupyterHub.load_roles = _load_roles
