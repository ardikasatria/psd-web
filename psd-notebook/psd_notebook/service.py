"""Service notebook terintegrasi — create gated & launch runtime."""
from __future__ import annotations

from psd_notebook import jupyterlite, policy, runtime


def create_notebook(store, *, user_id: str, tier: str, title: str) -> dict:
    policy.check_can_create(tier, store.count(user_id))
    return store.create(user_id, title)


async def launch(
    *,
    tier: str,
    requested_runtime: str | None = None,
    api_base: str = "",
    client=None,
    running_kernels: int = 0,
    kernel_name: str = "python3",
    hub_url: str | None = None,
) -> dict:
    rt = runtime.choose_runtime(tier, requested_runtime)
    if rt == "browser":
        return {
            "runtime": "browser",
            "config": jupyterlite.browser_config(tier, api_base=api_base),
        }

    policy.check_can_start_kernel(tier, running_kernels)
    lim = policy.limits_for(tier)

    if hub_url:
        return {
            "runtime": "server",
            "hub_url": hub_url.rstrip("/"),
            "spawn_path": "/hub/spawn",
            "limits": {
                "cpu": lim.cpu,
                "mem_gb": lim.mem_gb,
                "max_concurrent_kernels": lim.max_concurrent_kernels,
            },
        }

    if client is None:
        raise ValueError("client kernel diperlukan untuk runtime server tanpa hub_url.")
    kernel = await client.start_kernel(kernel_name)
    return {
        "runtime": "server",
        "kernel_id": kernel["id"],
        "limits": {
            "cpu": lim.cpu,
            "mem_gb": lim.mem_gb,
            "max_concurrent_kernels": lim.max_concurrent_kernels,
        },
    }
