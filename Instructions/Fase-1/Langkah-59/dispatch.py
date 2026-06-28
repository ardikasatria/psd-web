"""
Dispatch email (channel dari notifikasi Langkah 29).

send_event_email: gating preferensi → dedup (idempoten per notification_id) →
render template → tambah footer unsubscribe → kirim via provider.
build_digest: rakit email ringkasan harian dari banyak peristiwa 'digest'.
"""
from __future__ import annotations

from . import preferences, templates, unsubscribe


def send_event_email(event: dict, *, to_email: str, prefs: dict, provider,
                     dedup, unsubscribe_secret: str, base_url: str) -> dict:
    """event: {type, notification_id, user_id, data}."""
    et = event["type"]
    nid = event["notification_id"]

    if not preferences.should_send_now(prefs, et):
        return {"status": "skipped_pref", "mode": preferences.resolve_mode(prefs, et)}
    if dedup.seen(nid):
        return {"status": "skipped_dup"}

    subject, html, text = templates.render(et, event["data"])
    token = unsubscribe.make_token(str(event["user_id"]), unsubscribe_secret)
    html = html + unsubscribe.footer_html(base_url, token)

    provider.send(to=to_email, subject=subject, html=html, text=text)
    dedup.mark(nid)
    return {"status": "sent", "subject": subject}


def build_digest(items: list[dict]) -> tuple[str, str, str]:
    """items: [{type, data}] → satu email ringkasan."""
    n = len(items)
    rows = []
    text_lines = []
    for it in items:
        subj, _, txt = templates.render(it["type"], it["data"])
        rows.append(f"<li>{subj}</li>")
        text_lines.append(f"- {txt}")
    subject = f"Ringkasan aktivitas PSD ({n} pembaruan)"
    html = (
        "<div style='font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto'>"
        f"<h2 style='color:#0b5'>Ringkasan aktivitas ({n})</h2>"
        f"<ul>{''.join(rows)}</ul>"
        "<p style='color:#888;font-size:12px'>Projek Sains Data (PSD)</p></div>"
    )
    return subject, html, "Ringkasan aktivitas PSD:\n" + "\n".join(text_lines)


class InMemoryDedup:
    """Dedup sederhana untuk dev/uji. Produksi: Redis SET dgn TTL."""
    def __init__(self):
        self._seen: set[str] = set()

    def seen(self, nid: str) -> bool:
        return nid in self._seen

    def mark(self, nid: str) -> None:
        self._seen.add(nid)
