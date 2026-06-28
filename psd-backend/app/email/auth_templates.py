"""Template email transaksional auth — elegan, Bahasa Indonesia (Langkah 60)."""
from __future__ import annotations

from html import escape

_PSD_BLUE = "#4572b7"
_PSD_CORAL = "#f09394"
_GRADIENT = f"linear-gradient(90deg, {_PSD_BLUE}, {_PSD_CORAL})"

_AUTH_COPY: dict[str, dict[str, str]] = {
    "verify": {
        "subject": "Verifikasi email Anda",
        "headline": "Verifikasi email Anda",
        "lead": "Terima kasih telah bergabung di Projek Sains Data. Satu langkah lagi untuk mengaktifkan akun Anda.",
        "cta": "Verifikasi email",
        "note": "Jika Anda tidak mendaftar di PSD, abaikan email ini.",
    },
    "change_email": {
        "subject": "Konfirmasi alamat email baru",
        "headline": "Konfirmasi email baru",
        "lead": "Kami menerima permintaan untuk mengubah alamat email akun PSD Anda.",
        "cta": "Konfirmasi email baru",
        "note": "Jika Anda tidak meminta perubahan ini, segera amankan akun Anda.",
    },
    "reset_password": {
        "subject": "Atur ulang kata sandi",
        "headline": "Permintaan reset kata sandi",
        "lead": "Kami menerima permintaan untuk mengatur ulang kata sandi akun PSD Anda.",
        "cta": "Atur ulang kata sandi",
        "note": "Jika Anda tidak meminta reset, abaikan email ini — kata sandi Anda tidak berubah.",
    },
    "password_changed": {
        "subject": "Kata sandi diperbarui",
        "headline": "Kata sandi berhasil diperbarui",
        "lead": "Kata sandi akun PSD Anda baru saja diubah.",
        "cta": "Masuk ke PSD",
        "note": "Jika Anda tidak melakukan perubahan ini, segera hubungi tim dukungan.",
    },
}


def _layout(
    *,
    headline: str,
    greeting: str,
    body_html: str,
    action_url: str | None,
    cta_label: str,
    expiry_note: str | None,
    footer_note: str,
    app_name: str,
) -> str:
    safe_headline = escape(headline)
    safe_greeting = escape(greeting)
    cta_block = ""
    if action_url and cta_label:
        href = escape(action_url)
        safe_cta = escape(cta_label)
        cta_block = f"""
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
            <tr>
              <td style="border-radius:10px;background:{_PSD_BLUE}">
                <a href="{href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">
                  {safe_cta}
                </a>
              </td>
            </tr>
          </table>"""
    expiry_block = ""
    if expiry_note:
        expiry_block = f'<p style="margin:12px 0 0;font-size:13px;color:#64748b">{escape(expiry_note)}</p>'
    link_fallback = ""
    if action_url:
        link_fallback = f"""
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">
            Tombol tidak berfungsi? Salin tautan berikut ke peramban:<br>
            <a href="{escape(action_url)}" style="color:{_PSD_BLUE};word-break:break-all">{escape(action_url)}</a>
          </p>"""

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe_headline}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
          <tr>
            <td style="height:4px;background:{_GRADIENT};font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:36px 40px 32px">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:{_PSD_BLUE}">
                {escape(app_name)}
              </p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.3;color:#0f172a">{safe_headline}</h1>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:#334155">{safe_greeting}</p>
              <div style="font-size:15px;line-height:1.65;color:#475569">{body_html}</div>
              {cta_block}
              {expiry_block}
              {link_fallback}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">{escape(footer_note)}</p>
              <p style="margin:12px 0 0;font-size:11px;color:#94a3b8">
                Email transaksional keamanan akun — bukan newsletter.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:11px;color:#94a3b8">&copy; {escape(app_name)}</p>
      </td>
    </tr>
  </table>
</body>
</html>"""


def render_auth_email(
    kind: str,
    *,
    recipient_name: str | None,
    action_url: str | None = None,
    expiry_minutes: int | None = None,
    app_name: str = "Projek Sains Data",
    extra_line: str | None = None,
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body)."""
    copy = _AUTH_COPY.get(kind, _AUTH_COPY["verify"])
    subject = f"{copy['subject']} — {app_name}"
    name = (recipient_name or "Pengguna").strip() or "Pengguna"
    greeting = f"Halo {name},"
    lead = copy["lead"]
    if extra_line:
        lead = f"{lead} {extra_line}"

    expiry_note = None
    if expiry_minutes and action_url:
        expiry_note = f"Tautan ini berlaku selama {expiry_minutes} menit."

    body_html = f"<p style=\"margin:0\">{escape(lead)}</p>"
    html = _layout(
        headline=copy["headline"],
        greeting=greeting,
        body_html=body_html,
        action_url=action_url,
        cta_label=copy["cta"] if action_url else "",
        expiry_note=expiry_note,
        footer_note=copy["note"],
        app_name=app_name,
    )

    text_lines = [greeting, "", lead]
    if expiry_note:
        text_lines.extend(["", expiry_note])
    if action_url:
        text_lines.extend(["", copy["cta"] + ":", action_url])
    text_lines.extend(["", "---", copy["note"]])
    return subject, "\n".join(text_lines), html
