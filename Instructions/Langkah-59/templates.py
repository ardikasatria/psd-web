"""
Template email Bahasa Indonesia per peristiwa. render() → (subject, html, text).

Sederhana & inline-CSS minimal agar kompatibel klien email. Footer unsubscribe
ditambahkan oleh dispatch, bukan di sini.
"""
from __future__ import annotations


def _wrap(title: str, body_html: str) -> str:
    return (
        "<div style='font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto'>"
        f"<h2 style='color:#0b5'>{title}</h2>{body_html}"
        "<p style='color:#888;font-size:12px;margin-top:24px'>Projek Sains Data (PSD)</p>"
        "</div>"
    )


def _course_published(d):
    s = f"Course '{d['course_title']}' telah dipublikasikan"
    h = _wrap("Course dipublikasikan",
              f"<p>Course <b>{d['course_title']}</b> kini tayang di PSD.</p>")
    return s, h, f"Course '{d['course_title']}' telah dipublikasikan di PSD."


def _quiz_graded(d):
    s = f"Nilai kuis '{d['quiz_title']}': {d['score']}"
    h = _wrap("Kuis dinilai",
              f"<p>Kuis <b>{d['quiz_title']}</b> Anda dinilai: <b>{d['score']}</b>.</p>")
    return s, h, f"Nilai kuis '{d['quiz_title']}': {d['score']}."


def _pr_opened(d):
    s = f"PR baru: {d['title']} ({d['repo']})"
    h = _wrap("Pull request baru",
              f"<p>PR <b>#{d['index']} {d['title']}</b> dibuka di <b>{d['repo']}</b>.</p>")
    return s, h, f"PR #{d['index']} {d['title']} dibuka di {d['repo']}."


def _pr_merged(d):
    s = f"PR di-merge: {d['repo']} #{d['index']}"
    h = _wrap("PR di-merge",
              f"<p>PR <b>#{d['index']}</b> di <b>{d['repo']}</b> telah di-merge. Selamat!</p>")
    return s, h, f"PR #{d['index']} di {d['repo']} telah di-merge."


def _drift_alert(d):
    s = f"Peringatan drift: {d['model']} (fitur {d['feature']})"
    h = _wrap("Peringatan drift model",
              f"<p>Model <b>{d['model']}</b> menunjukkan drift signifikan pada fitur "
              f"<b>{d['feature']}</b> (PSI={d['value']}).</p>")
    return s, h, f"Drift signifikan: {d['model']} / {d['feature']} (PSI={d['value']})."


def _marketplace_match(d):
    s = "Kecocokan baru di marketplace PSD"
    h = _wrap("Kecocokan talenta–UMKM",
              f"<p>Ada kecocokan baru: <b>{d['summary']}</b>.</p>")
    return s, h, f"Kecocokan baru: {d['summary']}."


def _generic(d):
    title = d.get("title", "Notifikasi PSD")
    msg = d.get("message", "")
    return title, _wrap(title, f"<p>{msg}</p>"), f"{title}\n{msg}"


TEMPLATES = {
    "course_published": _course_published,
    "quiz_graded": _quiz_graded,
    "pr_opened": _pr_opened,
    "pr_merged": _pr_merged,
    "drift_alert": _drift_alert,
    "marketplace_match": _marketplace_match,
}


def render(event_type: str, data: dict) -> tuple[str, str, str]:
    fn = TEMPLATES.get(event_type, _generic)
    return fn(data)
