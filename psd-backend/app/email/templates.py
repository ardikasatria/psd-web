"""Template email Bahasa Indonesia (Langkah 59)."""
from __future__ import annotations

from html import escape

_TEMPLATES: dict[str, tuple[str, str]] = {
    "welcome": ("Selamat datang di PSD", "Akun Anda siap digunakan. Mulai jelajahi kursus dan kompetisi."),
    "course_published": ("Kursus baru dipublikasikan", "{body}"),
    "course_enrolled": ("Pendaftaran kursus", "{body}"),
    "quiz_graded": ("Hasil kuis tersedia", "{body}"),
    "competition_result": ("Hasil kompetisi", "{body}"),
    "competition": ("Kabar kompetisi", "{body}"),
    "event": ("Kabar event", "{body}"),
    "course": ("Kabar kursus", "{body}"),
    "instructor": ("Status lamaran instruktur", "{body}"),
    "dataset_published": ("Dataset dipublikasikan", "{body}"),
    "marketplace_match": ("Kecocokan marketplace", "{body}"),
    "pr_opened": ("Pull request baru", "{body}"),
    "pr_reviewed": ("Review pull request", "{body}"),
    "pr_merged": ("Pull request digabung", "{body}"),
    "pr_commented": ("Komentar pull request", "{body}"),
    "drift_alert": ("Peringatan drift model", "{body}"),
    "model_promoted": ("Model dipromosikan", "{body}"),
    "quota_warning": ("Peringatan kuota", "{body}"),
    "follow": ("Pengikut baru", "{body}"),
    "post_like": ("Posting disukai", "{body}"),
    "comment": ("Komentar baru", "{body}"),
    "room": ("Kabar ruang ide", "{body}"),
    "team": ("Kabar tim", "{body}"),
}


def render_event_email(
    event_type: str,
    *,
    title: str,
    body: str,
    link: str | None,
    app_base_url: str,
    unsubscribe_url: str,
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body)."""
    tpl_subject, tpl_body = _TEMPLATES.get(event_type, ("Notifikasi PSD", "{body}"))
    subject = title or tpl_subject
    message = tpl_body.format(body=body or title or tpl_subject)
    text_link = f"\n\nBuka: {app_base_url}{link}" if link else ""
    text = f"{message}{text_link}\n\n---\nBerhenti berlangganan: {unsubscribe_url}"

    safe_title = escape(subject)
    safe_body = escape(message).replace("\n", "<br>")
    link_html = ""
    if link:
        href = escape(f"{app_base_url}{link}")
        link_html = f'<p><a href="{href}">Buka di PSD</a></p>'
    html = f"""<!DOCTYPE html>
<html lang="id">
<body style="font-family:sans-serif;line-height:1.5;color:#111">
  <h2>{safe_title}</h2>
  <p>{safe_body}</p>
  {link_html}
  <hr>
  <p style="font-size:12px;color:#666">
    <a href="{escape(unsubscribe_url)}">Berhenti berlangganan email PSD</a>
  </p>
</body>
</html>"""
    return subject, text, html


def render_digest_email(
    items: list[dict],
    *,
    app_base_url: str,
    unsubscribe_url: str,
) -> tuple[str, str, str]:
    subject = f"Ringkasan harian PSD ({len(items)} notifikasi)"
    lines = []
    html_items = []
    for it in items:
        line = f"- {it.get('title', '')}"
        if it.get("body"):
            line += f": {it['body']}"
        lines.append(line)
        link = it.get("link")
        item_html = f"<li><strong>{escape(it.get('title', ''))}</strong>"
        if it.get("body"):
            item_html += f" — {escape(it['body'])}"
        if link:
            item_html += f' <a href="{escape(app_base_url + link)}">buka</a>'
        item_html += "</li>"
        html_items.append(item_html)
    text = "\n".join(lines) + f"\n\nBerhenti berlangganan: {unsubscribe_url}"
    html = f"""<!DOCTYPE html>
<html lang="id">
<body style="font-family:sans-serif">
  <h2>Ringkasan harian</h2>
  <ul>{''.join(html_items)}</ul>
  <hr>
  <p style="font-size:12px;color:#666">
    <a href="{escape(unsubscribe_url)}">Berhenti berlangganan email PSD</a>
  </p>
</body>
</html>"""
    return subject, text, html
