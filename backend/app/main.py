import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.middleware import SecurityMiddleware, configure_logging
from app.db.schema import initialize_database


@asynccontextmanager
async def lifespan(_application: FastAPI) -> AsyncIterator[None]:
    await initialize_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )
    application.add_middleware(
        SecurityMiddleware,
        enquiry_limit=settings.enquiry_rate_limit,
        enquiry_window_seconds=settings.enquiry_rate_window_seconds,
    )

    @application.exception_handler(Exception)
    async def unhandled_exception(request: Request, exception: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        logging.getLogger("app.errors").exception(
            "Unhandled request error", extra={"request_id": request_id}
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
        )

    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()
