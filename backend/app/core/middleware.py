import json
import logging
import re
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class SlidingWindowLimiter:
    """Small per-process limiter suitable for the public enquiry endpoint.

    Production deployments with multiple API workers should additionally enforce a
    shared limit at the proxy/edge; this limiter remains useful as a local safeguard.
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, now: float | None = None) -> bool:
        timestamp = time.monotonic() if now is None else now
        requests = self._requests[key]
        cutoff = timestamp - self.window_seconds
        while requests and requests[0] <= cutoff:
            requests.popleft()
        if len(requests) >= self.limit:
            return False
        requests.append(timestamp)
        return True

    def clear(self) -> None:
        self._requests.clear()


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        enquiry_limit: int,
        enquiry_window_seconds: int,
        frontend_origin: str,
        session_cookie_name: str,
    ) -> None:
        super().__init__(app)
        self.enquiry_limiter = SlidingWindowLimiter(enquiry_limit, enquiry_window_seconds)
        self.frontend_origin = frontend_origin
        self.session_cookie_name = session_cookie_name

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        supplied_request_id = request.headers.get("x-request-id", "")
        request_id = (
            supplied_request_id
            if REQUEST_ID_PATTERN.fullmatch(supplied_request_id)
            else uuid4().hex
        )
        request.state.request_id = request_id

        if (
            request.method in UNSAFE_METHODS
            and request.cookies.get(self.session_cookie_name)
            and request.headers.get("origin") != self.frontend_origin
        ):
            response = JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Request origin is not allowed"},
            )
        elif request.method == "POST" and request.url.path.endswith("/enquiries"):
            client = request.client.host if request.client else "unknown"
            if not self.enquiry_limiter.allow(client):
                response: Response = JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many enquiry attempts. Please try again later."},
                    headers={"Retry-After": str(self.enquiry_limiter.window_seconds)},
                )
            else:
                response = await call_next(request)
        else:
            response = await call_next(request)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = (
            "no-store" if request.url.path.startswith("/api/") else "no-cache"
        )
        return response


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None)
        if request_id:
            payload["request_id"] = request_id
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())
