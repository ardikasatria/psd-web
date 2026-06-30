# Konfigurasi Jupyter Server di container single-user (spawn JupyterHub).
# PSD_APP_BASE_URL di-inject oleh pre_spawn_hook agar editor PSD bisa REST/WS cross-origin.
import os

c = get_config()  # noqa: F821

_origin = os.environ.get("PSD_APP_BASE_URL", "").strip()
if _origin:
    c.ServerApp.allow_origin = _origin
    c.ServerApp.allow_credentials = True

# Kernel-only: tanpa UI Lab — startup lebih cepat untuk editor PSD.
c.ServerApp.open_browser = False
c.ServerApp.root_dir = "/home/jovyan/work"
