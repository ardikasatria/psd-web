import re

_GH = re.compile(r"^https?://github\.com/([^/]+)/([^/]+)/blob/(.+\.ipynb)$")


def colab_url(source_url: str | None) -> str | None:
    if not source_url:
        return None
    m = _GH.match(source_url.strip())
    if not m:
        return None
    owner, repo, rest = m.groups()
    return f"https://colab.research.google.com/github/{owner}/{repo}/blob/{rest}"
