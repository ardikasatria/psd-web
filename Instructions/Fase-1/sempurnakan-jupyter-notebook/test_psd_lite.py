"""Uji SDK psd-lite (logika inti, fetch terinjeksi)."""
import pytest

from app.psd_lite import sdk
from app.psd_lite.sdk import PsdUriError


def test_parse_uri_ok():
    assert sdk.parse_uri("psd://budi/iris/data/iris.csv") == ("budi", "iris", "data/iris.csv")


@pytest.mark.parametrize("bad", ["http://x", "psd://budi", "psd://budi/iris", "psd://budi/iris/"])
def test_parse_uri_invalid(bad):
    with pytest.raises(PsdUriError):
        sdk.parse_uri(bad)


def test_presign_calls_api():
    seen = {}

    def fetch_json(url, params):
        seen["url"] = url
        seen["params"] = params
        return {"url": "https://minio.local/presigned?sig=abc"}

    out = sdk.presign("psd://budi/iris/iris.csv", api_base="https://psd.example",
                      fetch_json=fetch_json)
    assert seen["url"].endswith("/api/storage/presign")
    assert seen["params"]["uri"] == "psd://budi/iris/iris.csv"
    assert out.startswith("https://minio.local/")


def test_load_returns_dataframe_from_csv():
    csv = b"a,b\n1,2\n3,4\n"

    def fetch_json(url, params):
        return {"url": "https://minio.local/x.csv"}

    def fetch_bytes(url):
        assert url == "https://minio.local/x.csv"
        return csv

    df = sdk.load("psd://budi/iris/iris.csv", api_base="https://psd.example",
                  fetch_json=fetch_json, fetch_bytes=fetch_bytes)
    assert list(df.columns) == ["a", "b"]
    assert df.shape == (2, 2)
    assert df["b"].tolist() == [2, 4]


def test_load_rejects_unsupported_format():
    def fetch_json(url, params):
        return {"url": "https://minio.local/x.txt"}

    def fetch_bytes(url):
        return b"halo"

    with pytest.raises(PsdUriError):
        sdk.load("psd://budi/ds/file.txt", api_base="x",
                 fetch_json=fetch_json, fetch_bytes=fetch_bytes)
