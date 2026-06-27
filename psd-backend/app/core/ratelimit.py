import logging

from fastapi import Depends, Request
from redis.exceptions import RedisError

from app.core.errors import ApiError
from app.core.redis import redis_client

log = logging.getLogger(__name__)


def rate_limit(name: str, limit: int, window_sec: int):
    async def dep(request: Request):
        ident = request.client.host if request.client else "unknown"
        key = f"rl:{name}:{ident}"
        try:
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, window_sec)
        except (RedisError, OSError):
            log.warning("redis_unavailable — rate limit dilewati untuk %s", name)
            return
        if count > limit:
            raise ApiError(429, "rate_limited", "Terlalu banyak permintaan. Coba lagi nanti.")

    return Depends(dep)
