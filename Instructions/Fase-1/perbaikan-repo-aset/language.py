"""
Deteksi bahasa berkas untuk syntax highlighting (tema gelap/terang) + jenis berkas.
"""
from __future__ import annotations

EXT_LANG = {
    "py": "python", "ipynb": "json", "js": "javascript", "ts": "typescript",
    "tsx": "tsx", "jsx": "jsx", "md": "markdown", "mdx": "markdown",
    "json": "json", "yml": "yaml", "yaml": "yaml", "toml": "toml",
    "sh": "bash", "bash": "bash", "sql": "sql", "r": "r", "go": "go",
    "rs": "rust", "java": "java", "c": "c", "cpp": "cpp", "h": "c",
    "html": "html", "css": "css", "ini": "ini", "cfg": "ini", "txt": "text", "csv": "csv",
}
BINARY_EXT = {"parquet", "bin", "pt", "pth", "onnx", "safetensors", "png", "jpg",
              "jpeg", "gif", "webp", "zip", "gz", "pkl", "h5", "npy", "npz"}


def detect_language(filename: str) -> str:
    name = filename.rsplit("/", 1)[-1].lower()
    if name == "dockerfile":
        return "dockerfile"
    if "." not in name:
        return "text"
    ext = name.rsplit(".", 1)[-1]
    if ext in BINARY_EXT:
        return "binary"
    return EXT_LANG.get(ext, "text")


def is_markdown(filename: str) -> bool:
    return detect_language(filename) == "markdown"


def is_notebook(filename: str) -> bool:
    return filename.lower().endswith(".ipynb")


def is_binary(filename: str) -> bool:
    return detect_language(filename) == "binary"
