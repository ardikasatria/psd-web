"""
Email autentikasi (verify email & lupa password).

WAJIB & transaksional: TIDAK tunduk preferensi/unsubscribe, TIDAK di-digest,
TIDAK lewat hook notifikasi Langkah 29. Dipicu langsung oleh alur auth (Langkah 14/48).
Tetap dikirim async via Celery (antrian 'email').

TTL default: verify 24 jam, reset 30 menit.
"""
from __future__ import annotations

VERIFY_TTL = 24 * 3600
RESET_TTL = 30 * 60

PURPOSE_VERIFY = "email_verify"
PURPOSE_RESET = "password_reset"


def _wrap(title: str, body: str) -> str:
    return (
        "<div style='font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto'>"
        f"<h2 style='color:#0b5'>{title}</h2>{body}"
        "<p style='color:#888;font-size:12px;margin-top:24px'>Projek Sains Data (PSD)</p></div>"
    )


def _button(url: str, label: str) -> str:
    return (f"<p><a href='{url}' style='background:#0b5;color:#fff;padding:10px 18px;"
            f"border-radius:6px;text-decoration:none'>{label}</a></p>"
            f"<p style='color:#888;font-size:12px'>Atau salin tautan: {url}</p>")


def verify_email_message(url: str) -> tuple[str, str, str]:
    subject = "Verifikasi alamat email Anda — PSD"
    html = _wrap("Verifikasi email",
                 "<p>Klik tombol di bawah untuk memverifikasi email Anda. "
                 "Tautan berlaku 24 jam.</p>" + _button(url, "Verifikasi email"))
    text = f"Verifikasi email Anda (berlaku 24 jam): {url}"
    return subject, html, text


def password_reset_message(url: str) -> tuple[str, str, str]:
    subject = "Atur ulang kata sandi — PSD"
    html = _wrap("Atur ulang kata sandi",
                 "<p>Anda meminta pengaturan ulang kata sandi. Tautan berlaku 30 menit. "
                 "Abaikan email ini bila bukan Anda yang meminta.</p>"
                 + _button(url, "Atur ulang kata sandi"))
    text = f"Atur ulang kata sandi (berlaku 30 menit): {url}"
    return subject, html, text


def send_verification(provider, *, to_email: str, token: str, base_url: str) -> dict:
    url = f"{base_url.rstrip('/')}/auth/verify-email?token={token}"
    subject, html, text = verify_email_message(url)
    return provider.send(to=to_email, subject=subject, html=html, text=text)


def send_password_reset(provider, *, to_email: str, token: str, base_url: str) -> dict:
    url = f"{base_url.rstrip('/')}/auth/reset-password?token={token}"
    subject, html, text = password_reset_message(url)
    return provider.send(to=to_email, subject=subject, html=html, text=text)
