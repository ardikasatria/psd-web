"""
Endpoint guest token (Langkah 53) — dipanggil oleh Embedded SDK (fetchGuestToken).

Alur aman:
  1. Pastikan pengguna PSD login (sesi Langkah 14/48).
  2. Cek pengguna berhak melihat dashboard (seam akses PSD).
  3. Ambil UUID embedded + team_id; bangun RLS per tim.
  4. Cetak guest token via akun layanan Superset.

Akun layanan Superset (admin) yang mencetak token — pengguna TIDAK login ke Superset.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import provisioning, rls, seams
from .client import SupersetClient
from .settings import settings

router = APIRouter(prefix="/api/bi", tags=["bi"])


class GuestTokenReq(BaseModel):
    dashboard_key: str          # kunci dashboard sisi-PSD


# --- dependency (override di produksi & uji) ---
async def get_current_user():
    raise NotImplementedError("Sambungkan ke sesi pengguna PSD (Langkah 14/48).")


async def get_superset_client() -> SupersetClient:
    raise NotImplementedError("Sediakan SupersetClient akun layanan.")


@router.post("/guest-token")
async def guest_token(body: GuestTokenReq,
                      user=Depends(get_current_user),
                      client: SupersetClient = Depends(get_superset_client)):
    if not seams.user_can_view_dashboard(user, body.dashboard_key):
        raise HTTPException(status_code=403, detail="Tidak berhak melihat dashboard ini.")

    uuid = seams.embeddable_dashboard_uuid(body.dashboard_key)
    team_id = seams.user_team_id(user)
    rls_clauses = rls.team_rls(team_id)

    token = await provisioning.mint_guest_token(
        client, user=seams.superset_identity(user),
        dashboard_uuids=[uuid], rls_clauses=rls_clauses,
    )
    return {"token": token, "uuid": uuid, "supersetDomain": settings.PUBLIC_URL}
