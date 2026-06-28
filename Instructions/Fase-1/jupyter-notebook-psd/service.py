"""
Service notebook terintegrasi (revisi Langkah 52).

- create_notebook : gated kuota jumlah notebook per tier.
- launch          : pilih runtime → browser (JupyterLite) atau server (kernel gated).
"""
from __future__ import annotations

from . import jupyterlite, policy, runtime


def create_notebook(store, *, user_id: str, tier: str, title: str) -> dict:
    """Buat notebook bila belum melewati batas tier."""
    policy.check_can_create(tier, store.count(user_id))
    return store.create(user_id, title)


async def launch(*, tier: str, requested_runtime: str | None = None,
                 api_base: str = "", client=None, running_kernels: int = 0,
                 kernel_name: str = "python3") -> dict:
    """Tentukan & siapkan runtime untuk membuka notebook (tanpa UI JupyterHub)."""
    rt = runtime.choose_runtime(tier, requested_runtime)
    if rt == "browser":
        return {"runtime": "browser",
                "config": jupyterlite.browser_config(tier, api_base=api_base)}

    # server: gate kuota kernel konkuren lalu start
    policy.check_can_start_kernel(tier, running_kernels)
    if client is None:
        raise ValueError("client kernel diperlukan untuk runtime server.")
    kernel = await client.start_kernel(kernel_name)
    lim = policy.limits_for(tier)
    return {"runtime": "server", "kernel_id": kernel["id"],
            "limits": {"cpu": lim.cpu, "mem_gb": lim.mem_gb,
                       "max_concurrent_kernels": lim.max_concurrent_kernels}}
