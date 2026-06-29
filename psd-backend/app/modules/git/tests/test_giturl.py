"""Uji pembentuk URL clone Git."""
from app.modules.git import giturl


def test_ssh_url_port22_is_github_style():
    assert giturl.ssh_clone_url("git.projeksainsdata.com", "budi", "proyek") == (
        "git@git.projeksainsdata.com:budi/proyek.git"
    )
    assert giturl.is_github_like(22) is True


def test_ssh_url_nonstandard_port_uses_scheme():
    assert giturl.ssh_clone_url("git.projeksainsdata.com", "budi", "proyek", port=2222) == (
        "ssh://git@git.projeksainsdata.com:2222/budi/proyek.git"
    )
    assert giturl.is_github_like(2222) is False


def test_strips_dot_git_suffix():
    assert giturl.ssh_clone_url("h", "o", "repo.git") == "git@h:o/repo.git"
    assert giturl.https_clone_url("h", "o", "repo.git") == "https://h/o/repo.git"


def test_https_url():
    assert giturl.https_clone_url("git.projeksainsdata.com", "budi", "proyek") == (
        "https://git.projeksainsdata.com/budi/proyek.git"
    )


def test_ssh_test_command():
    assert giturl.ssh_test_command("git.projeksainsdata.com") == "ssh -T git@git.projeksainsdata.com"
    assert giturl.ssh_test_command("git.projeksainsdata.com", port=2222) == (
        "ssh -p 2222 -T git@git.projeksainsdata.com"
    )


def test_ssh_config_snippet_nonstandard_port():
    snippet = giturl.ssh_config_snippet("git.example.com", port=2222)
    assert "Port 2222" in snippet
    assert "User git" in snippet


def test_ssh_config_snippet_port22_omits_port_line():
    snippet = giturl.ssh_config_snippet("git.example.com", port=22)
    assert "Port" not in snippet
    assert "User git" in snippet
