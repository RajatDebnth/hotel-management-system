"""Run Uvicorn with a PostgreSQL-compatible event loop on Windows."""

import asyncio
import sys

import uvicorn


def main() -> None:
    if sys.platform == "win32":
        config = uvicorn.Config("app.main:app", host="127.0.0.1", port=8000)
        server = uvicorn.Server(config)
        with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as runner:
            runner.run(server.serve())
        return
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
