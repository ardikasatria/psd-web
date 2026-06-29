"""
Pembentuk URL clone Git & petunjuk uji SSH.

Penting: sintaks scp-like `git@host:owner/repo.git` HANYA untuk port 22. Bila SSH
Gitea di port non-22, URL HARUS bentuk `ssh://git@host:PORT/owner/repo.git`, jika
tidak `git clone git@host:owner/repo.git` akan gagal. Gaya "seperti GitHub" = port 22.
"""
from __future__ import annotations


def ssh_clone_url(host: str, owner: str, repo: str, *, port: int = 22) -> str:
    repo = repo[:-4] if repo.endswith(".git") else repo
    if port == 22:
        return f"git@{host}:{owner}/{repo}.git"
    return f"ssh://git@{host}:{port}/{owner}/{repo}.git"


def https_clone_url(host: str, owner: str, repo: str) -> str:
    repo = repo[:-4] if repo.endswith(".git") else repo
    return f"https://{host}/{owner}/{repo}.git"


def ssh_test_command(host: str, *, port: int = 22) -> str:
    return f"ssh -T git@{host}" if port == 22 else f"ssh -p {port} -T git@{host}"


def ssh_config_snippet(host: str, *, port: int = 22) -> str:
    """Blok ~/.ssh/config agar git/ssh otomatis pakai port & user benar."""
    lines = [f"Host {host}", f"  HostName {host}", "  User git"]
    if port != 22:
        lines.append(f"  Port {port}")
    lines.append("  IdentityFile ~/.ssh/id_ed25519")
    return "\n".join(lines)


def is_github_like(port: int) -> bool:
    """True bila konfigurasi menghasilkan URL bersih tanpa port (port 22)."""
    return port == 22
