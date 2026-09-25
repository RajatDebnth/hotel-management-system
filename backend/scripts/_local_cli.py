from urllib.error import HTTPError, URLError
from urllib.request import urlopen


def refuse_if_backend_running(api_url: str) -> None:
    health_url = f"{api_url.rstrip('/')}/api/v1/health"
    try:
        response = urlopen(health_url, timeout=0.75)  # noqa: S310
    except (HTTPError, URLError, TimeoutError, OSError):
        return
    with response:
        if response.status == 200:
            raise SystemExit("Stop the local backend before running this maintenance command.")
