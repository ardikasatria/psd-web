import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details=None):
        self.status, self.code, self.message, self.details = status, code, message, details


def _body(code: str, message: str, details=None):
    err = {"code": code, "message": message}
    if details is not None:
        err["details"] = details
    return {"error": err}


def _with_cors(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin and settings.cors_allows(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        existing = response.headers.get("vary")
        response.headers["Vary"] = f"{existing}, Origin" if existing else "Origin"
    return response


def register_error_handlers(app: FastAPI) -> None:
    log = logging.getLogger(__name__)

    @app.exception_handler(ApiError)
    async def _api(request: Request, e: ApiError):
        return _with_cors(
            request,
            JSONResponse(status_code=e.status, content=_body(e.code, e.message, e.details)),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, e: StarletteHTTPException):
        return _with_cors(
            request,
            JSONResponse(status_code=e.status_code, content=_body("http_error", str(e.detail))),
        )

    @app.exception_handler(RequestValidationError)
    async def _val(request: Request, e: RequestValidationError):
        return _with_cors(
            request,
            JSONResponse(
                status_code=422,
                content=_body("validation", "Input tidak valid", e.errors()),
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, e: Exception):
        log.exception("unhandled_error", exc_info=e)
        return _with_cors(
            request,
            JSONResponse(
                status_code=500,
                content=_body("internal", "Terjadi kesalahan pada server"),
            ),
        )
