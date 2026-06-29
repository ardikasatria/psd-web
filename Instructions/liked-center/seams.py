"""
==========================================================================
 TITIK INTEGRASI (SEAM) — koleksi aset disukai
==========================================================================
Item bersumber dari AssetLove (Langkah 29). is_public disimpan di AssetLove
(kolom tambahan) atau tabel pendamping; pengaturan master di profil pengguna.
"""
from __future__ import annotations


class LikedStore:
    def list_items(self, user_id: str) -> list:
        """LikedItem dari AssetLove milik user (HANYA aset, bukan post/forum)."""
        raise NotImplementedError

    def get_item(self, user_id: str, asset_key: str):
        raise NotImplementedError

    def set_item_public(self, user_id: str, asset_key: str, is_public: bool) -> None:
        raise NotImplementedError

    def get_settings(self, user_id: str):     # -> LikedSettings
        raise NotImplementedError

    def save_settings(self, user_id: str, settings) -> None:
        raise NotImplementedError
