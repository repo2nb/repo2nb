"""Shared request handling for /api/scan and /api/generate. Pure computation, nothing persisted."""

import json
import logging
import time

from fastapi import FastAPI, Form, HTTPException, UploadFile

from repo2nb_core import deps, generator, scanner
from repo2nb_core.defaults import (
    DEFAULT_RULES,
    LARGE_FILE_BYTES,
    MAX_FILES,
    MAX_TOTAL_BYTES,
)
from repo2nb_core.targets import TARGETS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("repo2nb")


def create_app() -> FastAPI:
    # Same-origin by design: the Next.js frontend calls /api/* through the dev
    # rewrite locally and through Vercel functions in production. No CORS needed.
    app = FastAPI()

    @app.get("/api/rules")
    def rules():
        return {
            "rules": DEFAULT_RULES,
            "limits": {"max_total_bytes": MAX_TOTAL_BYTES, "max_files": MAX_FILES, "large_file_bytes": LARGE_FILE_BYTES},
        }

    async def read_upload(files: list[UploadFile]):
        out: dict[str, bytes] = {}
        gitignore = repo2nbignore = None
        total = 0
        for f in files:
            data = await f.read()
            name = f.filename or ""
            path = "/".join(p for p in name.replace("\\", "/").split("/") if p not in ("", "."))
            if not path or path.startswith("..") or "/.." in f"/{path}":
                continue
            if path == ".gitignore":
                gitignore = data.decode("utf-8", errors="replace")
            elif path == ".repo2nbignore":
                repo2nbignore = data.decode("utf-8", errors="replace")
            total += len(data)
            if total > MAX_TOTAL_BYTES:
                log.warning("scan rejected: %.2f MB exceeds the %.2f MB cap (%d files so far)",
                            total / 1e6, MAX_TOTAL_BYTES / 1e6, len(out))
                raise HTTPException(
                    status_code=413,
                    detail=f"Upload exceeds the {MAX_TOTAL_BYTES // (1024 * 1024)} MB direct-upload limit. Exclude large files or datasets and try again.",
                )
            out[path] = data
        if len(out) > MAX_FILES:
            log.warning("scan rejected: %d files exceeds the %d cap", len(out), MAX_FILES)
            raise HTTPException(status_code=413, detail=f"Too many files ({len(out)}). Limit is {MAX_FILES}.")
        return out, gitignore, repo2nbignore

    @app.post("/api/scan")
    async def scan(files: list[UploadFile] = Form(...)):
        t0 = time.perf_counter()
        log.info("scan: receiving upload...")
        contents, gitignore, repo2nbignore = await read_upload(files)
        listing = [{"path": p, "size": len(d)} for p, d in contents.items()]
        nodes = scanner.scan(listing, gitignore, repo2nbignore)
        included = [n for n in nodes if n["included"]]
        log.info(
            "scan: %d files (%.2f MB) -> %d included / %d filtered, layers: gitignore=%s repo2nbignore=%s, %.0f ms",
            len(nodes),
            sum(n["size"] for n in nodes) / 1e6,
            len(included),
            len(nodes) - len(included),
            bool(gitignore),
            bool(repo2nbignore),
            (time.perf_counter() - t0) * 1000,
        )
        return {
            "files": nodes,
            "deps_preview": deps.collect_deps_files(contents)[:12],
            "total_bytes": sum(n["size"] for n in included),
            "included_count": len(included),
        }

    @app.post("/api/generate")
    async def generate_endpoint(
        files: list[UploadFile] = Form(...),
        selection: str = Form("[]"),
        target: str = Form("kaggle"),
    ):
        t0 = time.perf_counter()
        if target not in TARGETS:
            raise HTTPException(status_code=400, detail=f"Unknown target '{target}'. Use kaggle or colab.")
        contents, _, _ = await read_upload(files)
        selected = [p for p in json.loads(selection) if p in contents]
        if not selected:
            raise HTTPException(status_code=400, detail="No files selected. Check at least one code file in the tree.")
        nb = generator.generate(contents, selected, target)
        log.info(
            "generate: target=%s, %d/%d files selected, %d cells, %.0f ms",
            target,
            len(selected),
            len(contents),
            len(nb["cells"]),
            (time.perf_counter() - t0) * 1000,
        )
        return {"notebook": nb}

    return app
