"""
Hook spawner JupyterHub (Langkah 52).

- auth_state_hook : simpan access_token PSD + tier dari auth_state OAuth.
- apply_tier_limits (pre_spawn_hook) : set batas CPU/RAM/timeout per tier &
  injeksikan PSD_API_BASE/PSD_TOKEN/PSD_TIER ke environment notebook agar SDK
  `psd://` bisa mengakses dataset.

Fungsi-fungsi ini sengaja TANPA dependensi JupyterHub agar bisa diuji dengan
objek spawner tiruan.
"""
from __future__ import annotations

import os

from .tiers import DEFAULT_TIER, resolve_limits


async def auth_state_hook(spawner, auth_state):
    """Dipanggil JupyterHub dgn auth_state dari GenericOAuthenticator."""
    if not auth_state:
        return
    spawner._psd_access_token = auth_state.get("access_token")
    user = auth_state.get("oauth_user") or {}
    # tier dari klaim userinfo PSD (mis. 'psd_tier'); sesuaikan nama klaim.
    spawner._psd_tier = user.get("psd_tier") or user.get("tier")


async def apply_tier_limits(spawner):
    """pre_spawn_hook: terapkan batas tier & env PSD ke server notebook."""
    tier = getattr(spawner, "_psd_tier", None) or DEFAULT_TIER
    lim = resolve_limits(tier)

    spawner.cpu_limit = lim.cpu
    spawner.mem_limit = f"{lim.mem_gb:g}G"
    spawner.start_timeout = lim.start_timeout
    # CPU-only: tidak ada permintaan GPU sama sekali.

    env = dict(getattr(spawner, "environment", None) or {})
    env["PSD_API_BASE"] = os.environ.get("PSD_API_BASE", "")
    env["PSD_TIER"] = tier
    token = getattr(spawner, "_psd_access_token", None)
    if token:
        env["PSD_TOKEN"] = token
    spawner.environment = env

    # Umur maksimum server (hard cap) untuk dimanfaatkan culler/maks-age.
    spawner._psd_max_lifetime = lim.max_lifetime_s
    return lim
