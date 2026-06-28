"""IO Spark — read_fn/write_fn dengan resolusi psd:// (Langkah 54)."""
from __future__ import annotations

from app.core.config import settings


def make_spark_io(read_uri_resolver):
    """Factory read_fn/write_fn; read_uri_resolver(source_id) -> path/uri."""

    def read_fn(session, params):
        uri = params.get("uri")
        if params.get("source_id") and read_uri_resolver:
            uri = read_uri_resolver(params["source_id"])
        fmt = params.get("format", "parquet")
        if uri and uri.startswith("s3://"):
            return session.read.format(fmt).load(uri)
        return session.read.format(fmt).load(uri)

    def write_fn(df, params):
        target = params.get("target", "gold.out")
        fmt = params.get("format", "parquet")
        layer, name = target.split(".", 1) if "." in target else ("gold", target)
        if settings.STORAGE_ENABLED:
            out = f"s3a://{settings.MINIO_BUCKET}/pipelines/spark/{layer}/{name}"
            df.write.format(fmt).mode("overwrite").save(out)
        else:
            df.write.format(fmt).mode("overwrite").saveAsTable(target.replace(".", "_"))

    return read_fn, write_fn
