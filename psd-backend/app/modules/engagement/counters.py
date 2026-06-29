"""Counter engagement per aset + ringkasan agregat pengguna."""
from __future__ import annotations

from dataclasses import dataclass, field

SHARE_CHANNELS = frozenset({"feed", "forum", "external", "link"})


@dataclass
class AssetCounters:
    love_count: int = 0
    download_count: int = 0
    view_count: int = 0
    shares: dict = field(default_factory=lambda: {c: 0 for c in SHARE_CHANNELS})

    @property
    def share_count(self) -> int:
        return sum(self.shares.values())


@dataclass
class UserSummary:
    total_loves_received: int = 0
    total_shares: int = 0
    total_downloads: int = 0
    total_views: int = 0
    asset_count: int = 0


class CounterError(ValueError):
    pass


def apply_love(asset: AssetCounters, summary: UserSummary, *, loved: bool) -> None:
    d = 1 if loved else -1
    asset.love_count = max(0, asset.love_count + d)
    summary.total_loves_received = max(0, summary.total_loves_received + d)


def apply_share(asset: AssetCounters, summary: UserSummary, *, channel: str) -> None:
    if channel not in SHARE_CHANNELS:
        raise CounterError(f"Saluran berbagi tak dikenal: {channel}")
    asset.shares[channel] += 1
    summary.total_shares += 1


def apply_download(asset: AssetCounters, summary: UserSummary) -> None:
    asset.download_count += 1
    summary.total_downloads += 1


def apply_view(asset: AssetCounters, summary: UserSummary) -> None:
    asset.view_count += 1
    summary.total_views += 1


def recompute_user_summary(owned_assets: list[AssetCounters]) -> UserSummary:
    s = UserSummary(asset_count=len(owned_assets))
    for a in owned_assets:
        s.total_loves_received += a.love_count
        s.total_shares += a.share_count
        s.total_downloads += a.download_count
        s.total_views += a.view_count
    return s
