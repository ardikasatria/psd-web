import uuid
from logging.config import dictConfig

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.db import get_db
from app.core.errors import register_error_handlers
from app.modules.blog.router import router as blog_router
from app.modules.categories.router import router as categories_router
from app.modules.admin.router import router as admin_router
from app.modules.asset_detail.router import router as asset_detail_router
from app.modules.announcements.router import router as announcements_router
from app.modules.auth.router import router as auth_router
from app.modules.community.router import router as community_router
from app.modules.competitions.router import router as comp_router
from app.modules.events.router import router as events_router
from app.modules.gamification.router import router as gamification_router
from app.modules.git.router import router as git_router
from app.modules.discovery.router import router as discovery_router
from app.modules.engagement.router import router as engagement_router
from app.modules.health.router import router as health_router
from app.modules.instructors.router import router as instructors_router
from app.modules.learn.router import router as learn_router
from app.modules.liked.router import router as liked_router
from app.modules.notebook_kernel.router import router as notebook_kernel_router
from app.modules.me.router import router as me_router
from app.modules.notifications.router import router as notifications_router
from app.modules.quests.router import router as quests_router
from app.modules.activity.router import router as activity_router
from app.modules.micro.router import router as micro_router
from app.modules.repos.router import router as repos_router
from app.modules.rooms.router import router as rooms_router
from app.modules.collections.router import router as collections_router
from app.modules.factory.router import router as factory_router
from app.modules.search.router import router as search_router
from app.modules.social.router import router as social_router
from app.modules.synthesis.router import router as synthesis_router
from app.modules.teams.router import router as teams_router
from app.modules.users.router import router as users_router
from app.contrib.router import router as contrib_router
from app.hub.router import router as hub_router
from app.superset.router import router as superset_router
from app.mlops.router import router as mlops_router
from app.serving.endpoint import router as serving_router
from app.assistant.endpoint import router as assistant_router
from app.perf.router import router as perf_router
from app.email.router import router as email_router
from app.oauth.router import oauth_router, wellknown_router

dictConfig(
    {
        "version": 1,
        "formatters": {
            "json": {
                "format": '{"level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
            }
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "formatter": "json",
            }
        },
        "root": {"level": "INFO", "handlers": ["default"]},
    }
)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


class CorsFallbackMiddleware(BaseHTTPMiddleware):
    """Pastikan header CORS ada pada respons error (500) bila origin diizinkan."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin and settings.cors_allows(origin):
            if not response.headers.get("access-control-allow-origin"):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                existing = response.headers.get("vary")
                response.headers["Vary"] = f"{existing}, Origin" if existing else "Origin"
        return response


app = FastAPI(title=settings.APP_NAME)

app.add_middleware(CorsFallbackMiddleware)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(repos_router, prefix=settings.API_PREFIX)
app.include_router(asset_detail_router, prefix=settings.API_PREFIX)
app.include_router(search_router, prefix=settings.API_PREFIX)
app.include_router(comp_router, prefix=settings.API_PREFIX)
app.include_router(events_router, prefix=settings.API_PREFIX)
app.include_router(community_router, prefix=settings.API_PREFIX)
app.include_router(learn_router, prefix=settings.API_PREFIX)
app.include_router(notebook_kernel_router, prefix=settings.API_PREFIX)
app.include_router(instructors_router, prefix=settings.API_PREFIX)
app.include_router(users_router, prefix=settings.API_PREFIX)
app.include_router(social_router, prefix=settings.API_PREFIX)
app.include_router(gamification_router, prefix=settings.API_PREFIX)
app.include_router(git_router, prefix=settings.API_PREFIX)
app.include_router(discovery_router, prefix=settings.API_PREFIX)
app.include_router(engagement_router, prefix=settings.API_PREFIX)
app.include_router(liked_router, prefix=settings.API_PREFIX)
app.include_router(blog_router, prefix=settings.API_PREFIX)
app.include_router(me_router, prefix=settings.API_PREFIX)
app.include_router(notifications_router, prefix=settings.API_PREFIX)
app.include_router(announcements_router, prefix=settings.API_PREFIX)
app.include_router(categories_router, prefix=settings.API_PREFIX)
app.include_router(quests_router, prefix=settings.API_PREFIX)
app.include_router(activity_router, prefix=settings.API_PREFIX)
app.include_router(micro_router, prefix=settings.API_PREFIX)
app.include_router(teams_router, prefix=settings.API_PREFIX)
app.include_router(synthesis_router, prefix=settings.API_PREFIX)
app.include_router(rooms_router, prefix=settings.API_PREFIX)
app.include_router(collections_router, prefix=settings.API_PREFIX)
app.include_router(factory_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)
app.include_router(contrib_router, prefix=settings.API_PREFIX)
app.include_router(hub_router, prefix="/api")
app.include_router(superset_router)
app.include_router(mlops_router)
app.include_router(serving_router)
app.include_router(assistant_router)
app.include_router(perf_router)
app.include_router(email_router)
app.include_router(oauth_router)
app.include_router(wellknown_router)


@app.get(settings.API_PREFIX + "/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"db": "ok"}


@app.on_event("startup")
async def startup_search_indexes():
    import logging

    logging.getLogger("psd.cors").info("BACKEND_CORS_ORIGINS=%s", settings.BACKEND_CORS_ORIGINS)
    try:
        from app.core.search import ensure_indexes

        ensure_indexes()
    except Exception:
        pass
