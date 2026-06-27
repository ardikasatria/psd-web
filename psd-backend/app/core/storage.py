import logging
from io import BytesIO

import boto3
from botocore.client import Config as BotoConfig
from minio import Minio

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Minio | None = None
_s3 = None


def get_minio() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_KEY,
            secret_key=settings.MINIO_SECRET,
            secure=settings.MINIO_SECURE,
        )
    return _client


def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
        )
    return _s3


def upload_public(key: str, data: bytes, content_type: str) -> str:
    client = get_s3()
    client.put_object(
        Bucket=settings.S3_MEDIA_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{key}"


def upload_asset(key: str, data: bytes, content_type: str) -> str:
    client = get_s3()
    client.put_object(
        Bucket=settings.S3_ASSETS_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return f"{settings.S3_ASSETS_PUBLIC_BASE_URL.rstrip('/')}/{key}"


def delete_asset(key: str) -> None:
    client = get_s3()
    client.delete_object(Bucket=settings.S3_ASSETS_BUCKET, Key=key)


def upload_private(key: str, data: bytes, content_type: str) -> str:
    client = get_s3()
    client.put_object(
        Bucket=settings.S3_SUBMISSIONS_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return key


def get_object_bytes(key: str) -> bytes:
    client = get_s3()
    return client.get_object(Bucket=settings.S3_SUBMISSIONS_BUCKET, Key=key)["Body"].read()


def presigned_get(key: str, expires: int = 3600) -> str:
    client = get_s3()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_SUBMISSIONS_BUCKET, "Key": key},
        ExpiresIn=expires,
    )


def put_object(key: str, data: bytes, content_type: str) -> str:
    client = get_minio()
    client.put_object(
        settings.MINIO_BUCKET,
        key,
        BytesIO(data),
        len(data),
        content_type=content_type,
    )
    return f"/{settings.MINIO_BUCKET}/{key}"


def presigned_asset_get(key: str, expires: int = 3600) -> str:
    client = get_s3()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_ASSETS_BUCKET, "Key": key},
        ExpiresIn=expires,
    )


def asset_key_from_uri(uri: str) -> str | None:
    prefix = f"s3://{settings.MINIO_BUCKET}/"
    if uri.startswith(prefix):
        return uri[len(prefix) :]
    prefix2 = f"s3://{settings.S3_ASSETS_BUCKET}/"
    if uri.startswith(prefix2):
        return uri[len(prefix2) :]
    return None
    if not settings.STORAGE_ENABLED:
        return None
    try:
        return put_object(key, data, content_type)
    except Exception:
        logger.exception("Gagal mengunggah ke MinIO: %s", key)
        return None
